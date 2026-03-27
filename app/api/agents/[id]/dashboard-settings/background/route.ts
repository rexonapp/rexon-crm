// app/api/agents/[id]/dashboard-settings/background/route.ts


import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    const formData = await request.formData();
    const file = formData.get("backgroundImage") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No background image provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Background image must be JPG, PNG, or WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Background image must be under 5 MB" },
        { status: 400 }
      );
    }

    try {
      const existing = await query(
        "SELECT settings FROM agent_dashboard_settings WHERE agent_id = $1",
        [agentId]
      );
      if (existing.rows.length > 0) {
        const oldUrl: string = existing.rows[0].settings?.hero_background_url || "";
        if (oldUrl && oldUrl.includes(`${BUCKET}.s3.`)) {
          const urlParts = new URL(oldUrl);
          const oldKey = urlParts.pathname.replace(/^\//, "");
          await s3.send(
            new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })
          );
        }
      }
    } catch {
        console.log('something went wrong')
    }

    const ext = file.name.split(".").pop() || "jpg";
    const randomHex = randomBytes(16).toString("hex");
    const newKey = `agents/hero-bg/${agentId}-${Date.now()}-${randomHex}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: newKey,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type,
      })
    );

    const url = `https://${BUCKET}.s3.${process.env.AWS_REGION || "ap-south-2"}.amazonaws.com/${newKey}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Background image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload background image. Please try again." },
      { status: 500 }
    );
  }
}