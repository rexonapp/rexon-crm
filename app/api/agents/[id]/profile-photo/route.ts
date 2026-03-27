

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { query } from "@/lib/db";
import { randomBytes } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = "rexon-web";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } >}
) {
  try {
    const { id: agentId } = await params;
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("profilePhoto") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No profile photo provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Profile photo must be a JPG, PNG, or WebP image" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Profile photo must be smaller than 2 MB" },
        { status: 400 }
      );
    }

    // Fetch the existing S3 key so we can delete the old photo
    const existing = await query(
      "SELECT profile_photo_s3_key FROM agents WHERE id = $1",
      [agentId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const oldKey: string | null = existing.rows[0].profile_photo_s3_key;

    // Build the new S3 key
    const ext = file.name.split(".").pop() || "jpg";
    const randomHex = randomBytes(16).toString("hex");
    const newKey = `agents/profile/${Date.now()}-${randomHex}.${ext}`;

    // Upload to S3
    const arrayBuffer = await file.arrayBuffer();
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: newKey,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type,
      })
    );

    const newUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION || "ap-south-2"}.amazonaws.com/${newKey}`;

    // Update agents table
    await query(
      `UPDATE agents
       SET profile_photo_s3_key = $1,
           profile_photo_s3_url = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newKey, newUrl, agentId]
    );

    // Delete the old S3 object (best-effort — don't fail the request if this errors)
    if (oldKey) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }));
      } catch (deleteErr) {
        console.warn("Could not delete old profile photo from S3:", deleteErr);
      }
    }

    return NextResponse.json({ success: true, profile_photo_s3_url: newUrl });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload profile photo. Please try again." },
      { status: 500 }
    );
  }
}