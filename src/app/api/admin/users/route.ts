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
      .select('name email role isEmrCompleted emrProfile doctorApplicationStatus doctorProfile doctorRejectedAt doctorRejectionReason createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    const formattedUsers = users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || 'patient',
      isEmrCompleted: !!u.isEmrCompleted,
      emrProfile: u.emrProfile,
      doctorApplicationStatus: u.doctorApplicationStatus || 'none',
      doctorProfile: u.doctorProfile || null,
      doctorRejectedAt: u.doctorRejectedAt || null,
      doctorRejectionReason: u.doctorRejectionReason || '',
      createdAt: u.createdAt || u.updatedAt || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Updates a user's role and doctor application approval/rejection status.
 */
export async function POST(req: NextRequest) {
  try {
    const { authorized } = await checkAdmin();
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Access Denied: Admin access only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, role, action, reason } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
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

    if (action === 'approve' || role === 'doctor') {
      userToModify.role = 'doctor';
      userToModify.doctorApplicationStatus = 'approved';
    } else if (action === 'reject') {
      userToModify.role = 'patient';
      userToModify.doctorApplicationStatus = 'rejected';
      userToModify.doctorRejectedAt = new Date();
      userToModify.doctorRejectionReason = reason || 'Verification requirements not met as determined by MediFlow Administrator.';
    } else if (role === 'patient') {
      userToModify.role = 'patient';
      if (userToModify.doctorApplicationStatus === 'approved') {
        userToModify.doctorApplicationStatus = 'rejected';
        userToModify.doctorRejectedAt = new Date();
      }
    }

    await userToModify.save();

    return NextResponse.json({
      success: true,
      message: `Updated status for ${userToModify.email}. Status: ${userToModify.doctorApplicationStatus}, Role: ${userToModify.role}`,
      user: {
        id: userToModify._id.toString(),
        email: userToModify.email,
        role: userToModify.role,
        doctorApplicationStatus: userToModify.doctorApplicationStatus,
      },
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update user status' }, { status: 500 });
  }
}
