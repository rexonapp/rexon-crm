import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN = 'rexonproperties.in';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // ── Subdomain detection ───────────────────────────────────────────────────
  // Extract subdomain from hostname
  // e.g. "chakri.rexonproperties.in" → "chakri"
  // e.g. "rexon-crm.vercel.app" → null (no subdomain)
  // e.g. "localhost:3000" → null
  const isMainDomain =
    hostname === PLATFORM_DOMAIN ||
    hostname === `www.${PLATFORM_DOMAIN}` ||
    hostname.includes('rexon-crm.vercel.app') ||
    hostname.includes('localhost');

  const subdomain = !isMainDomain && hostname.endsWith(`.${PLATFORM_DOMAIN}`)
    ? hostname.replace(`.${PLATFORM_DOMAIN}`, '')
    : null;

  // ── Subdomain request → rewrite to /profile/[slug] ───────────────────────
  // If a subdomain is detected, rewrite internally to the agent profile page.
  // The URL in the browser stays as chakri.rexonproperties.in (clean).
  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${subdomain}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Everything below is normal auth middleware (no subdomain) ────────────

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
    if (token && pathname !== '/login/change-password') {
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