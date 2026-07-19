import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';

// Enforce admin check helper
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!session?.user || (email !== 'heallink.care@gmail.com' && email !== 'mediflow@test.com')) {
    return { authorized: false, session };
  }
  return { authorized: true, session };
}

/**
 * GET /api/admin/users
 * Returns list of all users in the system for permission management.
 */
export async function GET(req: NextRequest) {
  try {
    const { authorized } = await checkAdmin();
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Access Denied: Admin access only' }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    // Sort by role (admins first, then doctors, then patients) and name
    const users = await UserModel.find(query)
      .select('name email role')
      .lean();

    const formattedUsers = users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || 'patient',
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Updates a user's role to manage doctor portal access.
 */
export async function POST(req: NextRequest) {
  try {
    const { authorized } = await checkAdmin();
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Access Denied: Admin access only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'User ID and Role are required' }, { status: 400 });
    }

    if (role !== 'doctor' && role !== 'patient') {
      return NextResponse.json({ success: false, error: 'Invalid role assignment. Can only grant doctor or patient access.' }, { status: 400 });
    }

    await connectDB();

    // Verify we are not modifying the admin user themselves
    const userToModify = await UserModel.findById(userId);
    if (!userToModify) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const emailToModify = userToModify.email.toLowerCase().trim();
    if (emailToModify === 'heallink.care@gmail.com' || emailToModify === 'mediflow@test.com') {
      return NextResponse.json({ success: false, error: 'Cannot modify permissions for the primary administrator.' }, { status: 400 });
    }

    userToModify.role = role;
    await userToModify.save();

    return NextResponse.json({
      success: true,
      message: `Successfully set role for ${userToModify.email} to ${role}`,
      user: {
        id: userToModify._id.toString(),
        email: userToModify.email,
        role: userToModify.role,
      },
    });
  } catch (error: any) {
    console.error('Update user role error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update user role' }, { status: 500 });
  }
}
