import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export default async function middleware(request: NextRequest) {
  const rawHost = request.headers.get('host') || 'mediflow.shanmukhmedisetty.site';
  const host = rawHost.toLowerCase();
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const pathname = request.nextUrl.pathname;

  const secret = process.env.NEXTAUTH_SECRET || 'default-mediflow-jwt-secret-key-1234567890-abcdef';
  process.env.NEXTAUTH_URL = `${proto}://${rawHost}`;
  process.env.NEXTAUTH_SECRET = secret;

  // Get session token
  const token = await getToken({ req: request, secret });

  // Public API routes allow bypass (including NextAuth API endpoints)
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname === '/api/hospitals/list' ||
    pathname === '/api/hospital/apply'
  ) {
    return NextResponse.next();
  }

  // Protected API routes check
  if (pathname.startsWith('/api')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Auth pages (login/register) allow bypass
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // SUBDOMAIN ROUTING & ISOLATION MATRIX
  // -------------------------------------------------------------

  // 1. MAIN ADMIN DOMAIN: admin-mediflow.shanmukhmedisetty.site
  if (host.includes('admin-mediflow.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', '/dashboard/admin');
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.rewrite(new URL('/dashboard/admin', request.url));
    }
    if (
      pathname.startsWith('/dashboard/patient') ||
      pathname.startsWith('/dashboard/doctor') ||
      pathname.startsWith('/hospadmin')
    ) {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
    if (pathname.startsWith('/dashboard/admin')) {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 2. HOSPITAL ADMIN DOMAIN: medi-hospadmin.shanmukhmedisetty.site
  else if (host.includes('medi-hospadmin.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', '/hospadmin');
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.rewrite(new URL('/hospadmin', request.url));
    }
    if (
      pathname.startsWith('/dashboard/patient') ||
      pathname.startsWith('/dashboard/doctor') ||
      pathname.startsWith('/dashboard/admin')
    ) {
      return NextResponse.redirect(new URL('/hospadmin', request.url));
    }
    if (pathname.startsWith('/hospadmin')) {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 3. DOCTOR DOMAIN: doctor-mediflow.shanmukhmedisetty.site
  else if (host.includes('doctor-mediflow.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', '/dashboard/doctor');
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.rewrite(new URL('/dashboard/doctor', request.url));
    }
    if (
      pathname.startsWith('/dashboard/patient') ||
      pathname.startsWith('/dashboard/admin') ||
      pathname.startsWith('/hospadmin')
    ) {
      return NextResponse.redirect(new URL('/dashboard/doctor', request.url));
    }
    if (pathname.startsWith('/dashboard/doctor')) {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 4. PATIENT DOMAIN: patient-mediflow.shanmukhmedisetty.site
  else if (host.includes('patient-mediflow.shanmukhmedisetty.site')) {
    if (pathname === '/' || pathname === '/dashboard') {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', '/dashboard/patient');
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.rewrite(new URL('/dashboard/patient', request.url));
    }
    if (
      pathname.startsWith('/dashboard/doctor') ||
      pathname.startsWith('/dashboard/admin') ||
      pathname.startsWith('/hospadmin')
    ) {
      return NextResponse.redirect(new URL('/dashboard/patient', request.url));
    }
    if (pathname.startsWith('/dashboard/patient')) {
      if (!token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
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

  return NextResponse.next();
}

/**
 * Intercept all route requests except static assets and images
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css)$).*)'],
};
