import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface Session {
  agentId: string;
  email: string;
  type: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * getSession — use in Server Components and Server Actions.
 * Reads the JWT from the httpOnly cookie and returns the decoded session.
 * Returns null if no valid session is found or the token is expired.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agentToken')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as Session;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * getSessionFromRequest — use in Route Handlers (API routes).
 * Checks the request cookie first, then falls back to the Authorization Bearer header.
 * Returns null if no valid session is found or the token is expired/invalid.
 */
export function getSessionFromRequest(request: NextRequest): Session | null {
  try {
    const cookieToken = request.cookies.get('agentToken')?.value;
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = cookieToken || bearerToken;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as Session;
    return decoded;
  } catch {
    return null;
  }
}
