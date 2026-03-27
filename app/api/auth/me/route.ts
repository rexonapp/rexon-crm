// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('agentToken')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as { agentId: string; email: string; type: string };

    const result = await query(
      `SELECT id, full_name, email, mobile_number, agency_name, city,
              profile_photo_s3_url
       FROM agents
       WHERE id = $1`,
      [decoded.agentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agentData = result.rows[0];

    return NextResponse.json({ success: true, agent: agentData }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}