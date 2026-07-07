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
    if (!session?.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.agentId;
    const body = await request.json();

    const {
      title, description, propertyType, totalArea, sizeUnit,
      availableFrom, listingType, pricePerSqFt, totalPrice,
      address, city, state, state_code, pincode, roadConnectivity,
      latitude, longitude, contactPersonName, contactPersonPhone,
      contactPersonAlternatePhone, isPriceNegotiable, contactPersonEmail,
      contactPersonDesignation, amenities,
      // Array of { s3Key, s3Url, fieldname, filename, mimetype, size }
      uploadedFiles,
    } = body;

    // --- Validation ---
    if (!title || !propertyType || !totalArea || !availableFrom || !listingType || !pricePerSqFt || !address || !city || !state) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }

    const images = (uploadedFiles ?? []).filter((f: any) => f.fieldname === 'images');
    const videos = (uploadedFiles ?? []).filter((f: any) => f.fieldname === 'videos');

    if (images.length === 0) {
      return NextResponse.json({ error: 'At least one property image is required.' }, { status: 400 });
    }

    // --- Type normalisation (same as before) ---
    const priceType = listingType === 'rent' ? 'Rent' : listingType === 'sale' ? 'Sale' : 'Lease';
    const propertyTypeMap: Record<string, string> = {
      warehouse: 'Warehouse', 
      // cold_storage: 'Cold Storage',
      // industrial_shed: 'Industrial Shed', manufacturing_unit: 'Manufacturing Unit',
      // godown: 'Godown', 
      // factory_space: 'Factory Space',
      // logistics_hub: 'Logistics Hub', distribution_center: 'Distribution Center',
      farm_land : 'Farm Land',
      // commercial_space : 'Commercial Space',
    };
    const normalizedPropertyType = propertyTypeMap[propertyType] || propertyType;
    const roadConnectivityMap: Record<string, string> = {
      'National Highway': 'National Highway', 'State Highway': 'State Highway',
      'Main Road': 'City Road', 'Interior Road': 'Other',
      'Service Road': 'Other', 'City Road': 'City Road', 'Other': 'Other',
    };
    const normalizedRoadConnectivity = roadConnectivity ? roadConnectivityMap[roadConnectivity] || 'Other' : null;

    const { autoApproveListings } = await getAutoApprovalFlags();
    const initialStatus = autoApproveListings ? 'Active' : 'Pending';

    // --- DB insert ---
    const warehouseResult = await query(
      `INSERT INTO warehouses 
       (user_id, property_name, title, description, property_type,
        space_available, space_unit, warehouse_size, available_from,
        price_type, price_per_sqft, total_price,
        address, city, state, pincode, road_connectivity,
        contact_person_name, contact_person_phone, contact_person_alternate,
        contact_person_email, contact_person_designation,
        latitude, longitude, amenities, status, state_code, is_price_negotiable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
       RETURNING id, property_name, title, address, city, created_at`,
      [
        userId, title, title, description, normalizedPropertyType,
        parseFloat(totalArea), sizeUnit, parseFloat(totalArea), availableFrom,
        priceType, parseFloat(pricePerSqFt),
        totalPrice ? parseFloat(totalPrice) : null,
        address, city, state, pincode || null, normalizedRoadConnectivity,
        contactPersonName, contactPersonPhone, contactPersonAlternatePhone || null,
        contactPersonEmail, contactPersonDesignation,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        JSON.stringify(amenities ?? []), initialStatus, state_code, isPriceNegotiable,
      ]
    );

    const warehouseId = warehouseResult.rows[0].id;

    const agentNameResult = await query(`SELECT full_name FROM agents WHERE id = $1`, [userId]);
    const agentName = agentNameResult.rows[0]?.full_name ?? `Agent #${userId}`;
    notifyPropertyAdded({ agentId: userId, agentName, propertyTitle: title, warehouseId })
      .catch(err => console.error('[notifyPropertyAdded] failed silently:', err));

    // --- Insert upload records (files already in S3) ---
    const insertMedia = async (files: any[], isVideo: boolean) => {
      return Promise.all(files.map(async (file, index) => {
        const result = await query(
          `INSERT INTO uploads
           (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id, file_name, s3_url, is_primary, image_order`,
          [userId, warehouseId, index, !isVideo && index === 0,
           file.filename, file.mimetype, file.size ?? 0,
           file.s3Key, file.s3Url, 'Active']
        );
        return result.rows[0];
      }));
    };

    const [uploadedImages, uploadedVideos] = await Promise.all([
      insertMedia(images, false),
      insertMedia(videos, true),
    ]);

    return NextResponse.json({
      success: true,
      propertyId: warehouseId,
      warehouse: warehouseResult.rows[0],
      images: uploadedImages,
      videos: uploadedVideos,
      message: 'Property listed successfully',
    });

  } catch (error: any) {
    console.error('[UPLOAD] Fatal error:', error);
    return NextResponse.json({ error: `Failed to create property listing: ${error.message}` }, { status: 500 });
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