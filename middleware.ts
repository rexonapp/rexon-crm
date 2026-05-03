import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN = 'rexonproperties.in';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hostname =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  const isMainDomain =
    hostname === PLATFORM_DOMAIN ||
    hostname === `www.${PLATFORM_DOMAIN}` ||
    hostname.includes('vercel.app') ||
    hostname.includes('localhost');

  const subdomain =
    !isMainDomain && hostname.endsWith(`.${PLATFORM_DOMAIN}`)
      ? hostname.replace(`.${PLATFORM_DOMAIN}`, '')
      : null;

  if (subdomain) {
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

  if ((request.method === 'POST' || request.method === 'PATCH') && 
      (request.nextUrl.pathname.startsWith('/api/upload') || 
       request.nextUrl.pathname.startsWith('/api/properties'))) {
    
    const contentLength = request.headers.get('content-length');
    const contentType = request.headers.get('content-type');
    
    if (contentLength) {
      const sizeInMB = (parseInt(contentLength, 10) / 1024 / 1024).toFixed(2);
      console.log(`[MIDDLEWARE] ${request.method} ${request.nextUrl.pathname}`);
      console.log(`[MIDDLEWARE] Content-Length: ${sizeInMB} MB`);
      console.log(`[MIDDLEWARE] Content-Type: ${contentType}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};