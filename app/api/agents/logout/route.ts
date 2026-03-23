// /api/agents/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  const host = request.headers.get('host') || '';
  const isVercelOrLocal =
    host.includes('vercel.app') || host.includes('localhost');

  const cookieDomain = isVercelOrLocal ? undefined : '.rexonproperties.in';

  const cookieBase = {
    path: '/',
    domain: cookieDomain,
  };

  // Clear all three cookies set during login
  response.cookies.delete({ name: 'agentToken', ...cookieBase });
  response.cookies.delete({ name: 'agentId', ...cookieBase });
  response.cookies.delete({ name: 'agentData', ...cookieBase });

  return response;
}