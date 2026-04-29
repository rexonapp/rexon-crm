// app/api/properties/[warehouseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';
import Busboy from 'busboy';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel timeout — increase for large file uploads
// NOTE: Vercel Pro allows up to 900 seconds; standard is 60 seconds
export const maxDuration = 300;

// ── Shared constants ─────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;     // 20 MB
const MAX_VIDEO_SIZE = 250 * 1024 * 1024;    // 250 MB
const MAX_IMAGES = 10;
const MAX_VIDEOS = 2;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

const BUCKET_NAME = 'rexon-web';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── Types ────────────────────────────────────────────────────────────────────
interface ParsedFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface ParsedForm {
  fields: Record<string, string>;
  files: ParsedFile[];
}

// ── Busboy multipart parser (same approach as /api/upload) ───────────────────
// Uses request.arrayBuffer() to get the COMPLETE body that Next.js has already
// buffered, then feeds it into busboy — avoids the 10 MB truncation that
// happens when piping request.body (a Web ReadableStream) directly.
function parseMultipartFromBuffer(buffer: Buffer, contentType: string): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: { 'content-type': contentType },
      limits: {
        fileSize: MAX_VIDEO_SIZE,           // largest single file allowed
        files: MAX_IMAGES + MAX_VIDEOS,
        fields: 50,
        fieldSize: 10 * 1024 * 1024,        // 10 MB for field data
      },
    });

    const fields: Record<string, string> = {};
    const files: ParsedFile[] = [];
    const errors: string[] = [];

    bb.on('field', (name: string, value: string) => {
      fields[name] = value;
    });

    bb.on('file', (fieldname: string, fileStream: any, info: any) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      let size = 0;

      fileStream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      fileStream.on('limit', () => {
        errors.push(`File "${filename}" exceeds the allowed size limit.`);
        fileStream.resume();
      });

      fileStream.on('end', () => {
        if (errors.length === 0) {
          files.push({ fieldname, filename, mimetype: mimeType, buffer: Buffer.concat(chunks), size });
        }
      });

      fileStream.on('error', (err: any) => {
        errors.push(`Error reading file "${filename}": ${err.message}`);
      });
    });

    bb.on('error', (err: Error) => {
      console.error('Busboy error:', err);
      reject(err);
    });

    bb.on('finish', () => {
      if (errors.length > 0) return reject(new Error(errors[0]));
      resolve({ fields, files });
    });

    Readable.from(buffer).pipe(bb);
  });
}

// ── S3 helper ────────────────────────────────────────────────────────────────
async function uploadToS3(buffer: Buffer, mimetype: string, s3Key: string): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype,
        Metadata: {
          'uploaded-at': new Date().toISOString(),
        },
      })
    );
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${(error as any).message}`);
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { warehouseId } = await params;
    console.log(warehouseId, 'warehouseId');

    const result = await query(
      `SELECT id, property_name, title, description, property_type,
              space_available, space_unit, warehouse_size, available_from,
              price_type, price_per_sqft, total_price,
              address, city, state, pincode, road_connectivity,
              contact_person_name, contact_person_phone, contact_person_alternate,
              contact_person_email, contact_person_designation,
              latitude, longitude, amenities, is_price_negotiable,
              is_verified, is_featured, status, created_at, updated_at, state_code, property_code
       FROM warehouses
       WHERE id = $1 AND user_id = $2`,
      [warehouseId, session.agentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      );
    }

    const warehouse = result.rows[0];

    const result1 = await query(
      `SELECT id, title, description, property_type,
              space_available, warehouse_size,
              price_type, price_per_sqft,
              city, state, address,
              latitude, longitude,
              is_verified, is_featured,
              created_at
       FROM warehouses
       WHERE id = $1`,
      [warehouseId]
    );

    if (result1.rows.length === 0) {
      return NextResponse.json({ error: 'PropertyDetails not found' }, { status: 404 });
    }

    const propertyDetails = result1.rows[0];

    const mediaResult = await query(
      `SELECT id, file_name, file_type, file_size, s3_url, is_primary, image_order, created_at
       FROM uploads
       WHERE warehouse_id = $1 AND status = 'Active'
       ORDER BY file_type ASC, image_order ASC, created_at ASC`,
      [warehouseId]
    );

    const images = mediaResult.rows.filter((m: any) => m.file_type?.startsWith('image/'));
    const videos = mediaResult.rows.filter((m: any) => m.file_type?.startsWith('video/'));

    let amenities = [];
    if (warehouse.amenities) {
      try {
        amenities = typeof warehouse.amenities === 'string'
          ? JSON.parse(warehouse.amenities)
          : warehouse.amenities;
      } catch {
        amenities = [];
      }
    }

    return NextResponse.json({
      success: true,
      property: {
        propertyDetails,
        ...warehouse,
        amenities,
        images,
        videos,
      },
    });

  } catch (error) {
    console.error('Get property error:', error);
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { warehouseId } = await params;

    // ── Verify ownership before doing any heavy work ──────────────────────
    const ownerCheck = await query(
      'SELECT id FROM warehouses WHERE id = $1 AND user_id = $2',
      [warehouseId, session.agentId]
    );
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // ── Read full body buffer (same fix as /api/upload) ───────────────────
    let bodyBuffer: Buffer;
    try {
      const arrayBuffer = await request.arrayBuffer();
      bodyBuffer = Buffer.from(arrayBuffer);
      console.log(`[PATCH] Request body size: ${(bodyBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (e: any) {
      console.error('Failed to read request body:', e);
      return NextResponse.json({ error: 'Failed to read request body.' }, { status: 400 });
    }

    // ── Parse multipart via busboy ────────────────────────────────────────
    let parsed: ParsedForm;
    try {
      parsed = await parseMultipartFromBuffer(bodyBuffer, contentType);
      console.log(`[PATCH] Parsed files: ${parsed.files.length}`);
    } catch (parseError: any) {
      console.error('Multipart parse error:', parseError);
      return NextResponse.json(
        { error: parseError.message || 'Failed to read upload data. Check file sizes and try again.' },
        { status: 400 }
      );
    }

    const { fields, files } = parsed;

    // ── Extract fields ────────────────────────────────────────────────────
    const title                       = fields['title'] ?? '';
    const description                 = fields['description'] ?? '';
    const propertyType                = fields['propertyType'] ?? '';
    const totalArea                   = fields['totalArea'] ?? '';
    const sizeUnit                    = fields['sizeUnit'] ?? 'sqft';
    const availableFrom               = fields['availableFrom'] ?? '';
    const listingType                 = fields['listingType'] ?? '';
    const pricePerSqFt                = fields['pricePerSqFt'] ?? '';
    const contactPersonAlternatePhone = fields['contactPersonAlternatePhone'] ?? null;
    const isPriceNegotiable           = fields['isPriceNegotiable'] === 'true';
    const totalPrice                  = fields['totalPrice'] ?? '';
    const totalPriceVal               = totalPrice ? parseFloat(totalPrice) : null;
    const address                     = fields['address'] ?? '';
    const city                        = fields['city'] ?? '';
    const state                       = fields['state'] ?? '';
    const state_code                  = fields['state_code'] ?? '';
    const pincode                     = fields['pincode'] ?? null;
    const roadConnectivity            = fields['roadConnectivity'] ?? null;
    const latitude                    = fields['latitude'] ?? null;
    const longitude                   = fields['longitude'] ?? null;
    const contactPersonName           = fields['contactPersonName'] ?? '';
    const contactPersonPhone          = fields['contactPersonPhone'] ?? '';
    const contactPersonEmail          = fields['contactPersonEmail'] ?? '';
    const contactPersonDesignation    = fields['contactPersonDesignation'] ?? '';
    const amenitiesStr                = fields['amenities'] ?? '[]';
    const amenities                   = JSON.parse(amenitiesStr);
    const deletedImageIdsStr          = fields['deletedImageIds'] ?? '';

    // ── Split files by field name ─────────────────────────────────────────
    const newImages = files.filter(f => f.fieldname === 'newImages');
    const newVideos = files.filter(f => f.fieldname === 'newVideos');

    // ── Validation ────────────────────────────────────────────────────────
    if (!title || !propertyType || !totalArea || !availableFrom || !listingType || !pricePerSqFt || !address || !city || !state) {
      return NextResponse.json({ error: 'Please fill in all required fields' }, { status: 400 });
    }

    // Validate new images
    for (const file of newImages) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return NextResponse.json(
          { error: `Invalid image type for "${file.filename}". Only JPG, PNG, GIF, and WebP are allowed.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `Image "${file.filename}" exceeds the 20 MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)} MB` },
          { status: 400 }
        );
      }
    }

    // Validate new videos
    for (const file of newVideos) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
        return NextResponse.json(
          { error: `Invalid video type for "${file.filename}". Only MP4, MOV, AVI, and WebM are allowed.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `Video "${file.filename}" exceeds the 250 MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)} MB` },
          { status: 400 }
        );
      }
    }

    // ── Validate total media count won't exceed limits ────────────────────
    if (newImages.length > 0) {
      const existingImagesResult = await query(
        `SELECT COUNT(*) as count FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'image/%'`,
        [warehouseId]
      );
      const existingCount = parseInt(existingImagesResult.rows[0]?.count ?? '0', 10);
      const deletedCount = deletedImageIdsStr ? (JSON.parse(deletedImageIdsStr) as number[]).length : 0;
      if (existingCount - deletedCount + newImages.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES} images allowed per property.` },
          { status: 400 }
        );
      }
    }

    if (newVideos.length > 0) {
      const existingVideosResult = await query(
        `SELECT COUNT(*) as count FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'video/%'`,
        [warehouseId]
      );
      const existingCount = parseInt(existingVideosResult.rows[0]?.count ?? '0', 10);
      if (existingCount + newVideos.length > MAX_VIDEOS) {
        return NextResponse.json(
          { error: `Maximum ${MAX_VIDEOS} videos allowed per property.` },
          { status: 400 }
        );
      }
    }

    // ── Type normalisation ────────────────────────────────────────────────
    const propertyTypeMap: Record<string, string> = {
      'Warehouse':           'Warehouse',
      'Cold Storage':        'Cold Storage',
      'Industrial Shed':     'Industrial Shed',
      'Manufacturing Unit':  'Manufacturing Unit',
      'Godown':              'Godown',
      'Factory Space':       'Factory Space',
      'Logistics Hub':       'Logistics Hub',
      'Distribution Center': 'Distribution Center',
    };
    const normalizedPropertyType = propertyTypeMap[propertyType] || propertyType;

    const roadConnectivityMap: Record<string, string> = {
      'National Highway': 'National Highway',
      'State Highway':    'State Highway',
      'Main Road':        'City Road',
      'Interior Road':    'Other',
      'Service Road':     'Other',
      'City Road':        'City Road',
      'Other':            'Other',
    };
    const normalizedRoadConnectivity = roadConnectivity
      ? roadConnectivityMap[roadConnectivity] || 'Other'
      : null;

    const priceType = listingType === 'rent' ? 'Rent' : listingType === 'sale' ? 'Sale' : 'Lease';

    // ── Update warehouse row ──────────────────────────────────────────────
    await query(
      `UPDATE warehouses SET
        property_name = $1, title = $2, description = $3, property_type = $4,
        space_available = $5, space_unit = $6, warehouse_size = $7, available_from = $8,
        price_type = $9, price_per_sqft = $10, total_price = $11,
        address = $12, city = $13, state = $14, pincode = $15, road_connectivity = $16,
        contact_person_name = $17, contact_person_phone = $18,
        contact_person_alternate = $19,
        contact_person_email = $20, contact_person_designation = $21,
        latitude = $22, longitude = $23,
        amenities = $24, is_price_negotiable = $25,
        status = 'Pending', updated_at = NOW(), state_code = $26
       WHERE id = $27 AND user_id = $28`,
      [
        title, title, description, normalizedPropertyType,
        parseFloat(totalArea), sizeUnit, parseFloat(totalArea), availableFrom,
        priceType, parseFloat(pricePerSqFt), totalPriceVal,
        address, city, state, pincode, normalizedRoadConnectivity,
        contactPersonName, contactPersonPhone,
        contactPersonAlternatePhone,
        contactPersonEmail, contactPersonDesignation,
        latitude ? parseFloat(latitude as string) : null,
        longitude ? parseFloat(longitude as string) : null,
        JSON.stringify(amenities), isPriceNegotiable,
        state_code,
        warehouseId, session.agentId,
      ]
    );

    // ── Soft-delete removed images ────────────────────────────────────────
    if (deletedImageIdsStr) {
      const ids = JSON.parse(deletedImageIdsStr) as number[];
      if (ids.length > 0) {
        await query(
          `UPDATE uploads SET status = 'Deleted' WHERE id = ANY($1) AND warehouse_id = $2`,
          [ids, warehouseId]
        );
      }
    }

    // ── Upload new images concurrently ────────────────────────────────────
    if (newImages.length > 0) {
      const orderResult = await query(
        `SELECT COALESCE(MAX(image_order), -1) AS max_order
         FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'image/%'`,
        [warehouseId]
      );
      const startOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

      const imagePromises = newImages.map(async (file, idx) => {
        try {
          const ext = file.filename.split('.').pop();
          const rand = randomBytes(16).toString('hex');
          const s3Key = `${session.agentId}/warehouses/${warehouseId}/images/${Date.now()}-${rand}.${ext}`;
          
          console.log(`[PATCH-IMAGE] Uploading ${file.filename}...`);
          const s3Url = await uploadToS3(file.buffer, file.mimetype, s3Key);

          await query(
            `INSERT INTO uploads
             (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active')`,
            [session.agentId, warehouseId, startOrder + idx, false,
              file.filename, file.mimetype, file.size, s3Key, s3Url]
          );
          console.log(`[PATCH-IMAGE] Successfully uploaded ${file.filename}`);
        } catch (error) {
          console.error(`[PATCH-IMAGE] Failed to upload ${file.filename}:`, error);
          throw error;
        }
      });

      await Promise.all(imagePromises);
    }

    // ── Upload new videos concurrently ────────────────────────────────────
    if (newVideos.length > 0) {
      const orderResult = await query(
        `SELECT COALESCE(MAX(image_order), -1) AS max_order
         FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'video/%'`,
        [warehouseId]
      );
      const startOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

      const videoPromises = newVideos.map(async (file, idx) => {
        try {
          const ext = file.filename.split('.').pop();
          const rand = randomBytes(16).toString('hex');
          const s3Key = `${session.agentId}/warehouses/${warehouseId}/videos/${Date.now()}-${rand}.${ext}`;
          
          console.log(`[PATCH-VIDEO] Uploading ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
          const s3Url = await uploadToS3(file.buffer, file.mimetype, s3Key);

          await query(
            `INSERT INTO uploads
             (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active')`,
            [session.agentId, warehouseId, startOrder + idx, false,
              file.filename, file.mimetype, file.size, s3Key, s3Url]
          );
          console.log(`[PATCH-VIDEO] Successfully uploaded ${file.filename}`);
        } catch (error) {
          console.error(`[PATCH-VIDEO] Failed to upload ${file.filename}:`, error);
          throw error;
        }
      });

      await Promise.all(videoPromises);
    }

    return NextResponse.json({
      success: true,
      message: 'Property updated successfully',
    });

  } catch (error) {
    console.error('Update property error:', error);
    return NextResponse.json(
      { error: `Failed to update property: ${(error as any).message}` },
      { status: 500 }
    );
  }
}