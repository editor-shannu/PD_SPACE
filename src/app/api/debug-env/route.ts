import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
    VERCEL_URL: process.env.VERCEL_URL || 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
  });
}
