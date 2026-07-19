/**
 * POST /api/doctor/role
 * Helper endpoint to set or toggle user role to doctor for testing/demonstration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';

export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Self-service role modification is disabled. Please contact the primary administrator (heallink.care@gmail.com) to request access.'
  }, { status: 403 });
}
