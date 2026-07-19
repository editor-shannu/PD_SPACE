import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

const handler = (req: NextRequest, ctx: any) => {
  const host = req.headers.get('host') || 'mediflow.shanmukhmedisetty.site';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  process.env.NEXTAUTH_URL = `${proto}://${host}`;
  return NextAuth(req, ctx, authOptions);
};

export { handler as GET, handler as POST };
