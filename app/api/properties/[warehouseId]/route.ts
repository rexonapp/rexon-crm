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

    const ownerCheck = await query(
      'SELECT id FROM warehouses WHERE id = $1 AND user_id = $2',
      [warehouseId, session.agentId]
    );
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 });
    }

    // Now accepts JSON instead of multipart
    const body = await request.json();

    const {
      title, description, propertyType, totalArea, sizeUnit,
      availableFrom, listingType, pricePerSqFt, totalPrice,
      address, city, state, state_code, pincode, roadConnectivity,
      latitude, longitude, contactPersonName, contactPersonPhone,
      contactPersonAlternatePhone, isPriceNegotiable,
      contactPersonEmail, contactPersonDesignation, amenities,
      deletedImageIds = [],
      deletedVideoIds = [],
      // Array of { s3Key, s3Url, fieldname, filename, mimetype, size }
      uploadedFiles = [],
    } = body;

    if (!title || !propertyType || !totalArea || !availableFrom || !listingType || !pricePerSqFt || !address || !city || !state) {
      return NextResponse.json({ error: 'Please fill in all required fields' }, { status: 400 });
    }

    const newImages = uploadedFiles.filter((f: any) => f.fieldname === 'newImages');
    const newVideos = uploadedFiles.filter((f: any) => f.fieldname === 'newVideos');

    // Validate total media count
    if (newImages.length > 0) {
      const existingImagesResult = await query(
        `SELECT COUNT(*) as count FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'image/%'`,
        [warehouseId]
      );
      const existingCount = parseInt(existingImagesResult.rows[0]?.count ?? '0', 10);
      const deletedCount = deletedImageIds.length;
      if (existingCount - deletedCount + newImages.length > MAX_IMAGES) {
        return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed per property.` }, { status: 400 });
      }
    }

    if (newVideos.length > 0) {
      const existingVideosResult = await query(
        `SELECT COUNT(*) as count FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'video/%'`,
        [warehouseId]
      );
      const existingCount = parseInt(existingVideosResult.rows[0]?.count ?? '0', 10);
      if (existingCount - deletedVideoIds.length + newVideos.length > MAX_VIDEOS) {
        return NextResponse.json({ error: `Maximum ${MAX_VIDEOS} videos allowed per property.` }, { status: 400 });
      }
    }

    // Type normalisation
    const propertyTypeMap: Record<string, string> = {
      'Warehouse': 'Warehouse', 
      // 'Cold Storage': 'Cold Storage',
      // 'Industrial Shed': 'Industrial Shed', 'Manufacturing Unit': 'Manufacturing Unit',
      // 'Godown': 'Godown',
       'Factory Space': 'Factory Space',
      'Logistics Hub': 'Logistics Hub', 'Distribution Center': 'Distribution Center',
    };
    const normalizedPropertyType = propertyTypeMap[propertyType] || propertyType;

    const roadConnectivityMap: Record<string, string> = {
      'National Highway': 'National Highway', 'State Highway': 'State Highway',
      'Main Road': 'City Road', 'Interior Road': 'Other',
      'Service Road': 'Other', 'City Road': 'City Road', 'Other': 'Other',
    };
    const normalizedRoadConnectivity = roadConnectivity
      ? roadConnectivityMap[roadConnectivity] || 'Other'
      : null;

    const priceType = listingType === 'rent' ? 'Rent' : listingType === 'sale' ? 'Sale' : 'Lease';
    const totalPriceVal = totalPrice ? parseFloat(totalPrice) : null;

    // Update warehouse row
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
        address, city, state, pincode || null, normalizedRoadConnectivity,
        contactPersonName, contactPersonPhone,
        contactPersonAlternatePhone || null,
        contactPersonEmail, contactPersonDesignation,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        JSON.stringify(amenities ?? []), isPriceNegotiable,
        state_code,
        warehouseId, session.agentId,
      ]
    );

    // Soft-delete removed images
    if (deletedImageIds.length > 0) {
      await query(
        `UPDATE uploads SET status = 'Deleted' WHERE id = ANY($1) AND warehouse_id = $2`,
        [deletedImageIds, warehouseId]
      );
    }

    // Soft-delete removed videos
    if (deletedVideoIds.length > 0) {
      await query(
        `UPDATE uploads SET status = 'Deleted' WHERE id = ANY($1) AND warehouse_id = $2`,
        [deletedVideoIds, warehouseId]
      );
    }

    // Insert new image upload records (files already in S3)
    if (newImages.length > 0) {
      const orderResult = await query(
        `SELECT COALESCE(MAX(image_order), -1) AS max_order
         FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'image/%'`,
        [warehouseId]
      );
      const startOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

      await Promise.all(newImages.map(async (file: any, idx: number) => {
        await query(
          `INSERT INTO uploads
           (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active')`,
          [session.agentId, warehouseId, startOrder + idx, false,
           file.filename, file.mimetype, file.size ?? 0, file.s3Key, file.s3Url]
        );
      }));
    }

    // Insert new video upload records
    if (newVideos.length > 0) {
      const orderResult = await query(
        `SELECT COALESCE(MAX(image_order), -1) AS max_order
         FROM uploads WHERE warehouse_id = $1 AND status = 'Active' AND file_type LIKE 'video/%'`,
        [warehouseId]
      );
      const startOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

      await Promise.all(newVideos.map(async (file: any, idx: number) => {
        await query(
          `INSERT INTO uploads
           (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active')`,
          [session.agentId, warehouseId, startOrder + idx, false,
           file.filename, file.mimetype, file.size ?? 0, file.s3Key, file.s3Url]
        );
      }));
    }

    return NextResponse.json({ success: true, message: 'Property updated successfully' });

  } catch (error: any) {
    console.error('Update property error:', error);
    return NextResponse.json({ error: `Failed to update property: ${error.message}` }, { status: 500 });
  }
}