import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN = 'rexonproperties.in';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  const isMainDomain =
    hostname === PLATFORM_DOMAIN ||
    hostname === `www.${PLATFORM_DOMAIN}` ||
    hostname.includes('rexon-crm.vercel.app') ||
    hostname.includes('localhost');

  const subdomain = !isMainDomain && hostname.endsWith(`.${PLATFORM_DOMAIN}`)
    ? hostname.replace(`.${PLATFORM_DOMAIN}`, '')
    : null;

  // ── TEMP DEBUG — remove after fixing ─────────────────────────────────────
  console.log('[middleware]', {
    hostname,
    pathname,
    isMainDomain,
    subdomain,
  });
  // ─────────────────────────────────────────────────────────────────────────

  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${subdomain}${pathname === '/' ? '' : pathname}`;
    console.log('[middleware] rewriting to:', url.pathname);
    return NextResponse.rewrite(url);
  }

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('agentToken')?.value;

  if (pathname.startsWith('/login')) {
    if (token && pathname !== '/login/change-password') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};