import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Protected routes that require authentication
 */
const authMiddleware = withAuth(
  function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = (request as any).nextauth?.token;

    // API routes require authentication except health & hospital list & apply
    if (pathname.startsWith('/api')) {
      if (
        pathname === '/api/health' ||
        pathname === '/api/hospitals/list' ||
        pathname === '/api/hospital/apply'
      ) {
        return NextResponse.next();
      }

      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Check dashboard & hospadmin routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/hospadmin')) {
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
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Allow public pages & health check without token
        if (
          pathname === '/' ||
          pathname === '/api/health' ||
          pathname === '/api/hospitals/list' ||
          pathname === '/api/hospital/apply' ||
          pathname.startsWith('/auth')
        ) {
          return true;
        }

        // Protected routes require a token
        if (
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/hospadmin') ||
          pathname.startsWith('/api')
        ) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export default function middleware(request: NextRequest, event: any) {
  const rawHost = request.headers.get('host') || 'mediflow.shanmukhmedisetty.site';
  const host = rawHost.toLowerCase();
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const pathname = request.nextUrl.pathname;

  process.env.NEXTAUTH_URL = `${proto}://${rawHost}`;
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'default-mediflow-jwt-secret-key-1234567890-abcdef';

  // -------------------------------------------------------------
  // SUBDOMAIN ROUTING & ISOLATION MATRIX
  // -------------------------------------------------------------

  // 1. MAIN ADMIN DOMAIN: admin-mediflow.shanmukhmedisetty.site
  if (host.includes('admin-mediflow.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      return NextResponse.rewrite(new URL('/dashboard/admin', request.url));
    }
    // Block non-admin dashboards
    if (pathname.startsWith('/dashboard/patient') || pathname.startsWith('/dashboard/doctor') || pathname.startsWith('/hospadmin')) {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
  }

  // 2. HOSPITAL ADMIN DOMAIN: medi-hospadmin.shanmukhmedisetty.site
  else if (host.includes('medi-hospadmin.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      return NextResponse.rewrite(new URL('/hospadmin', request.url));
    }
    // Block non-hospital-admin dashboards
    if (pathname.startsWith('/dashboard/patient') || pathname.startsWith('/dashboard/doctor') || pathname.startsWith('/dashboard/admin')) {
      return NextResponse.redirect(new URL('/hospadmin', request.url));
    }
  }

  // 3. DOCTOR DOMAIN: doctor-mediflow.shanmukhmedisetty.site
  else if (host.includes('doctor-mediflow.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      return NextResponse.rewrite(new URL('/dashboard/doctor', request.url));
    }
    // Block non-doctor dashboards
    if (pathname.startsWith('/dashboard/patient') || pathname.startsWith('/dashboard/admin') || pathname.startsWith('/hospadmin')) {
      return NextResponse.redirect(new URL('/dashboard/doctor', request.url));
    }
  }

  // 4. PATIENT DOMAIN: patient-mediflow.shanmukhmedisetty.site
  else if (host.includes('patient-mediflow.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      return NextResponse.rewrite(new URL('/dashboard/patient', request.url));
    }
    // Block non-patient dashboards
    if (pathname.startsWith('/dashboard/doctor') || pathname.startsWith('/dashboard/admin') || pathname.startsWith('/hospadmin')) {
      return NextResponse.redirect(new URL('/dashboard/patient', request.url));
    }
  }

  // 5. MAIN LANDING DOMAIN: mediflow.shanmukhmedisetty.site
  else if (host.includes('mediflow.shanmukhmedisetty.site')) {
    // Redirect direct dashboard calls on main domain to their dedicated subdomains
    if (pathname.startsWith('/dashboard/admin')) {
      return NextResponse.redirect(`https://admin-mediflow.shanmukhmedisetty.site`);
    }
    if (pathname.startsWith('/hospadmin')) {
      return NextResponse.redirect(`https://medi-hospadmin.shanmukhmedisetty.site`);
    }
    if (pathname.startsWith('/dashboard/doctor')) {
      return NextResponse.redirect(`https://doctor-mediflow.shanmukhmedisetty.site`);
    }
    if (pathname.startsWith('/dashboard/patient')) {
      return NextResponse.redirect(`https://patient-mediflow.shanmukhmedisetty.site`);
    }
  }

  return authMiddleware(request as any, event);
}

export const config = {
  matcher: ['/dashboard/:path*', '/hospadmin/:path*', '/api/((?!health|hospitals/list|hospital/apply).*)', '/auth/:path*'],
};
