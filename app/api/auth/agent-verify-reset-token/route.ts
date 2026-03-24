// app/api/auth/agent-verify-reset-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AGENT_RESET_TOKEN_SECRET!);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
  }

  try {
    await jwtVerify(token, secret, { requiredClaims: ['sub', 'exp'] });
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'Token is invalid or expired.' }, { status: 401 });
  }
}