// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';
import Busboy from 'busboy';
import { Readable } from 'stream';
import { getAutoApprovalFlags } from '@/lib/getAutoApprovalFlag';
import { notifyPropertyAdded } from '@/lib/notifyPropertyAdded';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CRITICAL: Set these for large file uploads
// This tells Next.js/Vercel to allow larger payloads
export const maxDuration = 300;
export const fetchCache = 'force-no-store';

// ⚠️ PRODUCTION FIX: Explicit body size limit for Vercel/Edge environments
// This is the KEY setting that was missing - it ensures the full request body is buffered
const MAX_BODY_SIZE = 260 * 1024 * 1024; // 260 MB (slightly more than max video size)

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'rexon-web';
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;    // 20 MB
const MAX_VIDEO_SIZE = 250 * 1024 * 1024;   // 250 MB
const MAX_IMAGES = 10;
const MAX_VIDEOS = 2;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

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

/**
 * Parse multipart/form-data from a raw Buffer.
 *
 * WHY A BUFFER INSTEAD OF A STREAM:
 * Next.js App Router internally buffers and partially consumes the raw
 * request body before the route handler runs. When the body exceeds ~10 MB
 * the internal buffer is truncated and the Web ReadableStream exposed via
 * `request.body` only contains that first chunk — causing busboy to receive
 * an incomplete multipart payload and throw "Unexpected end of form".
 *
 * The reliable escape hatch is to call `request.arrayBuffer()` which gives
 * us the COMPLETE body that Next.js already buffered in full (Next.js does
 * buffer the whole thing in memory; the 10 MB message is just a warning
 * about the *clone* it keeps for re-reads). We then wrap that Buffer in a
 * Node.js Readable and pipe it into busboy ourselves — no truncation.
 */
function parseMultipartFromBuffer(buffer: Buffer, contentType: string): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: { 'content-type': contentType },
      limits: {
        fileSize: MAX_VIDEO_SIZE,
        files: MAX_IMAGES + MAX_VIDEOS,
        fields: 50,
        fieldSize: 10 * 1024 * 1024, // 10 MB for field data
      },
    });

    const fields: Record<string, string> = {};
    const files: ParsedFile[] = [];
    const errors: string[] = [];

    bb.on('field', (name: any, value: any) => {
      fields[name] = value;
    });

    bb.on('file', (fieldname: any, fileStream: any, info: any) => {
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
      console.error('[BUSBOY] Parse error:', err.message);
      reject(err);
    });

    bb.on('finish', () => {
      if (errors.length > 0) {
        console.error('[BUSBOY] File processing errors:', errors);
        return reject(new Error(errors[0]));
      }
      console.log('[BUSBOY] Successfully parsed multipart data');
      resolve({ fields, files });
    });

    // Feed the complete body buffer into busboy as a Node.js Readable stream.
    Readable.from(buffer).pipe(bb);
  });
}

export function parseAmenities(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed); } catch { return []; }
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

async function uploadToS3(buffer: Buffer, mimetype: string, s3Key: string): Promise<string> {
  try {
    console.log(`[S3] Starting upload of ${s3Key} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
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
    
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
    console.log(`[S3] Upload successful: ${url}`);
    return url;
  } catch (error) {
    console.error('[S3] Upload error:', error);
    throw new Error(`Failed to upload file to S3: ${(error as any).message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.agentId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const userId = session.agentId;
    const contentType = request.headers.get('content-type') || '';
    const contentLength = request.headers.get('content-length');

    console.log(`[UPLOAD] Starting upload - Content-Length: ${contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'unknown'}`);

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // ⚠️ PRODUCTION FIX: Check content length before processing
    if (contentLength) {
      const contentLengthBytes = parseInt(contentLength, 10);
      if (contentLengthBytes > MAX_BODY_SIZE) {
        console.error(`[UPLOAD] Request exceeds max body size: ${(contentLengthBytes / 1024 / 1024).toFixed(2)} MB > ${(MAX_BODY_SIZE / 1024 / 1024).toFixed(2)} MB`);
        return NextResponse.json(
          { error: `Upload exceeds maximum size limit of ${(MAX_BODY_SIZE / 1024 / 1024).toFixed(0)} MB` },
          { status: 413 } // Payload Too Large
        );
      }
    }

    let bodyBuffer: Buffer;
    try {
      const arrayBuffer = await request.arrayBuffer();
      bodyBuffer = Buffer.from(arrayBuffer);
      
      const bufferSize = bodyBuffer.length / 1024 / 1024;
      console.log(`[UPLOAD] Request body buffered successfully: ${bufferSize.toFixed(2)} MB`);
      
      // ⚠️ Safety check: Ensure we got the complete body
      if (contentLength && bodyBuffer.length < parseInt(contentLength, 10)) {
        console.error(`[UPLOAD] CRITICAL: Received incomplete body! Expected ${contentLength} bytes, got ${bodyBuffer.length}`);
        return NextResponse.json(
          { error: 'Request body was truncated. This is a server issue. Please try again or contact support.' },
          { status: 400 }
        );
      }
    } catch (e: any) {
      console.error('[UPLOAD] Failed to read request body:', e.message);
      return NextResponse.json(
        { error: 'Failed to read request body. The upload may be too large or interrupted.' },
        { status: 400 }
      );
    }

    let parsed: ParsedForm;
    try {
      parsed = await parseMultipartFromBuffer(bodyBuffer, contentType);
      console.log(`[UPLOAD] Parsed successfully - Files: ${parsed.files.length}, Fields: ${Object.keys(parsed.fields).length}`);
    } catch (parseError: any) {
      console.error('[UPLOAD] Multipart parse error:', parseError.message);
      
      // Provide helpful error messages based on parse error type
      let errorMessage = 'Failed to parse upload data. ';
      if (parseError.message.includes('Unexpected end of form')) {
        errorMessage += 'The request body may have been truncated. This can happen with very large files. Please try again with a smaller file or check your connection.';
      } else {
        errorMessage += 'Check file sizes and try again.';
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { fields, files } = parsed;

    // ── Extract fields ───────────────────────────────────────────────────────
    const title                    = fields['title'] ?? '';
    const description              = fields['description'] ?? '';
    const propertyType             = fields['propertyType'] ?? '';
    const totalArea                = fields['totalArea'] ?? '';
    const sizeUnit                 = fields['sizeUnit'] ?? 'sqft';
    const availableFrom            = fields['availableFrom'] ?? '';
    const listingType              = fields['listingType'] ?? '';
    const pricePerSqFt             = fields['pricePerSqFt'] ?? '';
    const totalPrice               = fields['totalPrice'] ?? null;
    const address                  = fields['address'] ?? '';
    const city                     = fields['city'] ?? '';
    const state                    = fields['state'] ?? '';
    const pincode                  = fields['pincode'] ?? null;
    const roadConnectivity         = fields['roadConnectivity'] ?? null;
    const latitude                 = fields['latitude'] ?? null;
    const longitude                = fields['longitude'] ?? null;
    const contactPersonName        = fields['contactPersonName'] ?? '';
    const contactPersonPhone       = fields['contactPersonPhone'] ?? '';
    const contactPersonAlternatePhone = fields['contactPersonAlternatePhone'] ?? null;
    const isPriceNegotiable           = fields['isPriceNegotiable'] === 'true';
    const contactPersonEmail       = fields['contactPersonEmail'] ?? '';
    const contactPersonDesignation = fields['contactPersonDesignation'] ?? '';
    const amenitiesStr             = fields['amenities'] ?? '[]';
    const amenities                = JSON.parse(amenitiesStr);

    const images = files.filter(f => f.fieldname === 'images');
    const videos = files.filter(f => f.fieldname === 'videos');
    const state_code = fields['state_code'] ?? '';

    // ── Validation ───────────────────────────────────────────────────────────
    if (!title || !propertyType || !totalArea || !availableFrom || !listingType || !pricePerSqFt || !address || !city || !state) {
      return NextResponse.json(
        { error: 'Please fill in all required fields: title, property type, total area, available from, listing type, price per sq.ft, address, city, and state.' },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'At least one property image is required.' }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed.` }, { status: 400 });
    }
    if (videos.length > MAX_VIDEOS) {
      return NextResponse.json({ error: `Maximum ${MAX_VIDEOS} videos allowed.` }, { status: 400 });
    }

    // Validate images
    for (const file of images) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return NextResponse.json(
          { error: `Invalid file type for "${file.filename}". Only JPG, PNG, GIF, and WebP are allowed.` },
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

    // Validate videos
    for (const file of videos) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
        return NextResponse.json(
          { error: `Invalid file type for "${file.filename}". Only MP4, MOV, AVI, and WebM are allowed.` },
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

    // ── Type normalisation ───────────────────────────────────────────────
    const priceType = listingType === 'rent' ? 'Rent' : listingType === 'sale' ? 'Sale' : 'Lease';

    const propertyTypeMap: Record<string, string> = {
      'warehouse':           'Warehouse',
      'cold_storage':        'Cold Storage',
      'industrial_shed':     'Industrial Shed',
      'manufacturing_unit':  'Manufacturing Unit',
      'godown':              'Godown',
      'factory_space':       'Factory Space',
      'logistics_hub':       'Logistics Hub',
      'distribution_center': 'Distribution Center',
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

    const { autoApproveListings } = await getAutoApprovalFlags();
    console.log('[UPLOAD] Auto-approval setting:', autoApproveListings);
    const initialStatus = autoApproveListings ? 'Active' : 'Pending';

    // Insert warehouse record
    const warehouseResult = await query(
      `INSERT INTO warehouses 
       (user_id, property_name, title, description, property_type,
        space_available, space_unit, warehouse_size, available_from,
        price_type, price_per_sqft, total_price,
        address, city, state, pincode, road_connectivity,
        contact_person_name, contact_person_phone, contact_person_alternate,
        contact_person_email, contact_person_designation,
        latitude, longitude, amenities, status, state_code,
        is_price_negotiable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
       RETURNING id, property_name, title, address, city, created_at`,
      [
        userId,                          // $1
        title,                           // $2  property_name
        title,                           // $3  title
        description,                     // $4
        normalizedPropertyType,          // $5
        parseFloat(totalArea),           // $6  space_available
        sizeUnit,                        // $7  space_unit
        parseFloat(totalArea),           // $8  warehouse_size
        availableFrom,                   // $9
        priceType,                       // $10
        parseFloat(pricePerSqFt),        // $11
        totalPrice ? parseFloat(totalPrice as string) : null, // $12
        address,                         // $13
        city,                            // $14
        state,                           // $15
        pincode || null,                 // $16
        normalizedRoadConnectivity,      // $17
        contactPersonName,               // $18
        contactPersonPhone,              // $19
        contactPersonAlternatePhone,     // $20
        contactPersonEmail,              // $21
        contactPersonDesignation,        // $22
        latitude ? parseFloat(latitude as string) : null,   // $23
        longitude ? parseFloat(longitude as string) : null, // $24
        JSON.stringify(amenities),       // $25
        initialStatus,                   // $26
        state_code,                      // $27
        isPriceNegotiable,               // $28
      ]
    );

    const warehouseId = warehouseResult.rows[0].id;
    console.log(`[UPLOAD] Warehouse created with ID: ${warehouseId}`);
    
    const agentNameResult = await query(
      `SELECT full_name FROM agents WHERE id = $1`,
      [userId]
    );
    const agentName = agentNameResult.rows[0]?.full_name ?? `Agent #${userId}`;

    // Notify property added (fire and forget)
    notifyPropertyAdded({
      agentId: userId,
      agentName,
      propertyTitle: title,
      warehouseId,
    }).catch(err => console.error('[notifyPropertyAdded] failed silently:', err));

    // ── Upload images concurrently ───────────────────────────────────────────
    console.log(`[UPLOAD] Starting image uploads: ${images.length} images`);
    const imageUploadPromises = images.map(async (file, index) => {
      try {
        const ext = file.filename.split('.').pop();
        const randomStr = randomBytes(16).toString('hex');
        const s3Key = `${userId}/warehouses/${warehouseId}/images/${Date.now()}-${randomStr}.${ext}`;
        
        console.log(`[IMAGE] Uploading ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const s3Url = await uploadToS3(file.buffer, file.mimetype, s3Key);

        const result = await query(
          `INSERT INTO uploads
           (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id, file_name, s3_url, is_primary, image_order`,
          [userId, warehouseId, index, index === 0, file.filename, file.mimetype, file.size, s3Key, s3Url, 'Active']
        );
        return result.rows[0];
      } catch (error) {
        console.error(`[IMAGE] Upload failed for ${file.filename}:`, error);
        throw error;
      }
    });

    // ── Upload videos concurrently ───────────────────────────────────────────
    console.log(`[UPLOAD] Starting video uploads: ${videos.length} videos`);
    const videoUploadPromises = videos.map(async (file, index) => {
      try {
        const ext = file.filename.split('.').pop();
        const randomStr = randomBytes(16).toString('hex');
        const s3Key = `${userId}/warehouses/${warehouseId}/videos/${Date.now()}-${randomStr}.${ext}`;
        
        console.log(`[VIDEO] Uploading ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const s3Url = await uploadToS3(file.buffer, file.mimetype, s3Key);

        const result = await query(
          `INSERT INTO uploads
           (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id, file_name, s3_url, is_primary, image_order`,
          [userId, warehouseId, index, false, file.filename, file.mimetype, file.size, s3Key, s3Url, 'Active']
        );
        return result.rows[0];
      } catch (error) {
        console.error(`[VIDEO] Upload failed for ${file.filename}:`, error);
        throw error;
      }
    });

    const [uploadedImages, uploadedVideos] = await Promise.all([
      Promise.all(imageUploadPromises),
      Promise.all(videoUploadPromises),
    ]);

    console.log(`[SUCCESS] Property ${warehouseId} created with ${uploadedImages.length} images and ${uploadedVideos.length} videos`);

    return NextResponse.json({
      success: true,
      propertyId: warehouseId,
      warehouse: warehouseResult.rows[0],
      images: uploadedImages,
      videos: uploadedVideos,
      message: 'Property listed successfully',
    });

  } catch (error) {
    console.error('[UPLOAD] Fatal error:', error);
    return NextResponse.json(
      { error: `Failed to create property listing: ${(error as any).message}` },
      { status: 500 }
    );
  }
}

// ── GET: fetch user's properties ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehousesResult = await query(
      `SELECT id, property_name, title, description, property_type,
              space_available, space_unit, warehouse_size, available_from,
              price_type, price_per_sqft, total_price,
              address, city, state, pincode, road_connectivity,
              contact_person_name, contact_person_phone, contact_person_alternate, contact_person_email, contact_person_designation,
              latitude, longitude, amenities,
              is_verified, is_featured, status, created_at, updated_at, state_code
       FROM warehouses
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [session.agentId]
    );

    const warehouses = await Promise.all(
      warehousesResult.rows.map(async (warehouse) => {
        const mediaResult = await query(
          `SELECT id, file_name, file_type, file_size, s3_url, is_primary, image_order, created_at
           FROM uploads
           WHERE warehouse_id = $1 AND status = 'Active'
           ORDER BY file_type ASC, image_order ASC, created_at ASC`,
          [warehouse.id]
        );

        return {
          ...warehouse,
          amenities: parseAmenities(warehouse.amenities),
          images: mediaResult.rows.filter((m: any) => m.file_type?.startsWith('image/')),
          videos: mediaResult.rows.filter((m: any) => m.file_type?.startsWith('video/')),
        };
      })
    );

    return NextResponse.json({ success: true, properties: warehouses });

  } catch (error) {
    console.error('Get properties error:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}