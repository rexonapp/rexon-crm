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

// Raise the Next.js route-segment body limit so the framework does not
// truncate the request before we can stream it through busboy.
// This is the correct per-route-segment override for App Router route handlers.
export const maxDuration = 60; // seconds — give large uploads enough time
export const fetchCache = 'force-no-store';


const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = 'rexon-web';
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;    // 5 MB
const MAX_VIDEO_SIZE = 250 * 1024 * 1024;  // 100 MB
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
        fieldSize: 1 * 1024 * 1024,
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
    });

    bb.on('error', (err: Error) => reject(err));
    bb.on('finish', () => {
      if (errors.length > 0) return reject(new Error(errors[0]));
      resolve({ fields, files });
    });

    // Feed the complete body buffer into busboy as a Node.js Readable stream.
    Readable.from(buffer).pipe(bb);
  });
}

async function uploadToS3(buffer: Buffer, mimetype: string, s3Key: string): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: mimetype,
    })
  );
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.agentId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const userId = session.agentId;
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // Read the COMPLETE body as an ArrayBuffer — this is what Next.js has
    // already fully buffered regardless of the 10 MB warning. The warning
    // refers to a secondary clone kept for middleware re-reads, not this call.
    let bodyBuffer: Buffer;
    try {
      const arrayBuffer = await request.arrayBuffer();
      bodyBuffer = Buffer.from(arrayBuffer);
    } catch (e: any) {
      console.error('Failed to read request body:', e);
      return NextResponse.json({ error: 'Failed to read request body.' }, { status: 400 });
    }

    let parsed: ParsedForm;
    try {
      parsed = await parseMultipartFromBuffer(bodyBuffer, contentType);
    } catch (parseError: any) {
      console.error('Multipart parse error:', parseError);
      return NextResponse.json(
        { error: parseError.message || 'Failed to read upload data. Check file sizes and try again.' },
        { status: 400 }
      );
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

    for (const file of images) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return NextResponse.json(
          { error: `Invalid file type for "${file.filename}". Only JPG, PNG, GIF, and WebP are allowed.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: `Image "${file.filename}" exceeds the 5 MB limit.` }, { status: 400 });
      }
    }

    for (const file of videos) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
        return NextResponse.json(
          { error: `Invalid file type for "${file.filename}". Only MP4, MOV, AVI, and WebM are allowed.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json({ error: `Video "${file.filename}" exceeds the 100 MB limit.` }, { status: 400 });
      }
    }

    // ── Type normalisation ───────────────────────────────────────────────────
    const priceType = listingType === 'rent' ? 'Rent' : listingType === 'sale' ? 'Sale' : 'Lease';

    const propertyTypeMap: Record<string, string> = {
      'warehouse':           'Warehouse',
      'cold_storage':        'Cold Storage',
      'industrial_shed':     'Industrial Shed',
      'manufacturing_unit':  'Manufacturing Unit',
      'godown':              'Godown',
      'factory_space':       'Factory Space',
      'logistics_hub':       'Logistics Hub'  ,
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
      const { autoApproveListings} = await getAutoApprovalFlags();
      console.log('autoApprovaListings:', autoApproveListings);
      const initialStatus = autoApproveListings ? 'Active' : 'Pending';
      console.log(initialStatus,'inital status')

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
          totalPrice,                      // $12  total_price (already parsed as float or null)
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
          latitude  ? parseFloat(latitude)  : null,  // $23
          longitude ? parseFloat(longitude) : null,  // $24
          JSON.stringify(amenities),       // $25
          initialStatus,                   // $26
          state_code,                      // $27
          isPriceNegotiable,               // $28
        ]
      );

    const warehouseId = warehouseResult.rows[0].id;
    const agentNameResult = await query(
      `SELECT full_name FROM agents WHERE id = $1`,
      [userId]
    );
    const agentName = agentNameResult.rows[0]?.full_name ?? `Agent #${userId}`;
 
    notifyPropertyAdded({
      agentId:       userId,
      agentName,
      propertyTitle: title,
      warehouseId,
    }).catch(err => console.error('[notifyPropertyAdded] failed silently:', err));

    // ── Upload images concurrently ───────────────────────────────────────────
    const imageUploadPromises = images.map(async (file, index) => {
      const ext       = file.filename.split('.').pop();
      const randomStr = randomBytes(16).toString('hex');
      const s3Key     = `${userId}/warehouses/${warehouseId}/images/${Date.now()}-${randomStr}.${ext}`;
      const s3Url     = await uploadToS3(file.buffer, file.mimetype, s3Key);

      const result = await query(
        `INSERT INTO uploads
         (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, file_name, s3_url, is_primary, image_order`,
        [userId, warehouseId, index, index === 0, file.filename, file.mimetype, file.size, s3Key, s3Url, 'Active']
      );
      return result.rows[0];
    });

    // ── Upload videos concurrently ───────────────────────────────────────────
    const videoUploadPromises = videos.map(async (file, index) => {
      const ext       = file.filename.split('.').pop();
      const randomStr = randomBytes(16).toString('hex');
      const s3Key     = `${userId}/warehouses/${warehouseId}/videos/${Date.now()}-${randomStr}.${ext}`;
      const s3Url     = await uploadToS3(file.buffer, file.mimetype, s3Key);

      const result = await query(
        `INSERT INTO uploads
         (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, file_name, s3_url, is_primary, image_order`,
        [userId, warehouseId, index, false, file.filename, file.mimetype, file.size, s3Key, s3Url, 'Active']
      );
      return result.rows[0];
    });

    const [uploadedImages, uploadedVideos] = await Promise.all([
      Promise.all(imageUploadPromises),
      Promise.all(videoUploadPromises),
    ]);

    return NextResponse.json({
      success: true,
      propertyId: warehouseId,
      warehouse: warehouseResult.rows[0],
      images: uploadedImages,
      videos: uploadedVideos,
      message: 'Property listed successfully',
    });

  } catch (error) {
    console.error('Property creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create property listing. Please try again.' },
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
              price_type, price_per_sqft,total_price
              address, city, state, pincode, road_connectivity,
              contact_person_name, contact_person_phone,contact_person_alternate, contact_person_email, contact_person_designation,
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
          amenities: warehouse.amenities ? JSON.parse(warehouse.amenities) : [],
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