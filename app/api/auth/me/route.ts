import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

    // Optionally re-read agentData cookie for full profile
    const agentDataCookie = request.cookies.get('agentData')?.value;
    const agentData = agentDataCookie
      ? JSON.parse(decodeURIComponent(agentDataCookie))
      : { id: decoded.agentId, email: decoded.email };

    return NextResponse.json({ success: true, agent: agentData }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}