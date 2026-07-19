import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Protected routes that require authentication
 */
const protectedRoutes = ['/dashboard'];
const apiProtectedRoutes = ['/api'];

const authMiddleware = withAuth(
  function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = (request as any).nextauth?.token;

    // Check if it's an API route
    if (pathname.startsWith('/api')) {
      // Allow /api/health without authentication
      if (pathname === '/api/health') {
        return NextResponse.next();
      }

      // All other /api/* routes require authentication
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Check dashboard routes
    if (pathname.startsWith('/dashboard')) {
      // Redirect to login if not authenticated
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      /**
       * Authorized callback - called on every request
       * Return true to allow the request to proceed
       */
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Allow health without token
        if (pathname === '/api/health') {
          return true;
        }

        // Allow public pages without token
        if (pathname === '/' || pathname === '/auth/login' || pathname === '/auth/register') {
          return true;
        }

        // Protected routes require a token
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export default function middleware(request: NextRequest, event: any) {
  const host = request.headers.get('host') || 'mediflow.shanmukhmedisetty.site';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  process.env.NEXTAUTH_URL = `${proto}://${host}`;

  return authMiddleware(request as any, event);
}

/**
 * Matcher configuration - which routes should be processed by this middleware
 */
export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!health).*)', '/auth/:path*'],
};
