import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/agents/logout
 * Clears the httpOnly agentToken cookie to end the session.
 */
export async function POST(_request: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Expire the auth cookie immediately
  response.cookies.set('agentToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
