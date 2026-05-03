// app/api/upload/presign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const BUCKET_NAME = 'rexon-web';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { files } = await request.json();
    // files: Array<{ filename: string; mimetype: string; fieldname: 'images' | 'videos' }>

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files specified' }, { status: 400 });
    }

    const userId = session.agentId;
    const presignedUrls = await Promise.all(
      files.map(async (file: { filename: string; mimetype: string; fieldname: string }) => {
        const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
        if (!allAllowed.includes(file.mimetype)) {
          throw new Error(`Invalid file type: ${file.mimetype}`);
        }

        const ext = file.filename.split('.').pop();
        const randomStr = randomBytes(16).toString('hex');
        const folder = file.fieldname === 'videos' ? 'videos' : 'images';
        // warehouseId is unknown at presign time — use a temp path, moved after DB insert
        const s3Key = `${userId}/tmp/${folder}/${Date.now()}-${randomStr}.${ext}`;

        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          ContentType: file.mimetype,
        });

        const presignedUrl = await getSignedUrl(s3Client as any, command as any, {
          expiresIn: 3600,
          unhoistableHeaders: new Set([]),   
        });
        return {
          presignedUrl,
          s3Key,
          s3Url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`,
          fieldname: file.fieldname,
          filename: file.filename,
          mimetype: file.mimetype,
        };
      })
    );

    return NextResponse.json({ presignedUrls });
  } catch (error: any) {
    console.error('[PRESIGN] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}