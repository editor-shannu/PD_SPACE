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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json().catch(() => ({}));
    const newRole = body.role === 'patient' ? 'patient' : 'doctor';

    await connectDB();
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      role: user?.role || newRole,
      message: `User role updated to ${newRole}`,
    });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}
