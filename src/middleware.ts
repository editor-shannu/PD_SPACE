/**
 * NextAuth middleware to protect routes
 * - Allow unauthenticated access to /api/health only
 * - Redirect to login for /dashboard/* routes if not authenticated
 * - Return 401 for /api/* routes if no session
 */

import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Protected routes that require authentication
 */
const protectedRoutes = ['/dashboard'];
const apiProtectedRoutes = ['/api'];

export default withAuth(
  function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = (request as any).nextauth?.token;

      // Check if it's an API route
      if (pathname.startsWith('/api')) {
        // Allow /api/health and /api/test-db-connection without authentication
        if (pathname === '/api/health' || pathname === '/api/test-db-connection') {
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

          // Allow health and test-db-connection without token
          if (pathname === '/api/health' || pathname === '/api/test-db-connection') {
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

/**
 * Matcher configuration - which routes should be processed by this middleware
 */
export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!health|test-db-connection).*)', '/auth/:path*'],
};
