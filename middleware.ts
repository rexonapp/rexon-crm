import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js middleware — runs on the Edge before every matched request.
 *
 * Rules:
 * - API routes handle their own JWT verification, skip here.
 * - /login pages: if the agent already has a valid cookie → redirect to /.
 * - All other pages: require the agentToken cookie, else redirect to /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, Next.js internals, and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('agentToken')?.value;

  // Already authenticated → bounce away from login pages
  if (pathname.startsWith('/login')) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected pages — must have the auth cookie
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
