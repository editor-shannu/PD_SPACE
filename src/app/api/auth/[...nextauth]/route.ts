import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

const authHandler = NextAuth(authOptions);

const handler = (req: NextRequest, ctx: any) => {
  const host = req.headers.get('host') || 'mediflow.shanmukhmedisetty.site';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  process.env.NEXTAUTH_URL = `${proto}://${host}`;
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'default-mediflow-jwt-secret-key-1234567890-abcdef';
  return authHandler(req, ctx);
};

export { handler as GET, handler as POST };
