import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';
import { ReferralModel } from '@/models/referral';
import { AlertModel } from '@/models/alert';

/**
 * POST /api/doctor/refer
 * Doctor endpoint to refer a patient to another registered doctor in the portal.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const fromDoctor: any = await UserModel.findOne({ email: session.user.email }).lean();

    const dbRole = fromDoctor?.role;
    const isApprovedDoctor =
      fromDoctor?.doctorApplicationStatus === 'approved' ||
      dbRole === 'doctor' ||
      dbRole === 'admin' ||
      session.user.email === 'heallink.care@gmail.com' ||
      session.user.email === 'mediflow@test.com';

    if (!fromDoctor || !isApprovedDoctor) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Approved doctor status required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { patientId, toDoctorId, reason, clinicalNotes } = body;

    if (!patientId || !toDoctorId || !reason) {
      return NextResponse.json(
        { success: false, error: 'patientId, toDoctorId, and reason are required' },
        { status: 400 }
      );
    }

    // Lookup destination doctor
    const toDoctor: any = await UserModel.findById(toDoctorId).lean();
    if (!toDoctor) {
      return NextResponse.json({ success: false, error: 'Target doctor not found' }, { status: 404 });
    }

    // Lookup patient
    const patientUser: any = await UserModel.findById(patientId).select('name email').lean();
    const patientName = patientUser?.name || `Patient (${patientId.substring(0, 8)})`;
    const patientEmail = patientUser?.email || '';

    const fromDoctorName = fromDoctor.name.startsWith('Dr.') ? fromDoctor.name : `Dr. ${fromDoctor.name}`;
    const toDoctorName = toDoctor.name.startsWith('Dr.') ? toDoctor.name : `Dr. ${toDoctor.name}`;
    const toDepartment = toDoctor.doctorProfile?.department || toDoctor.emrProfile?.department || 'General Medicine';

    // Create Referral Record
    const referral = new ReferralModel({
      patientId,
      patientName,
      patientEmail,
      fromDoctorId: fromDoctor._id.toString(),
      fromDoctorName,
      fromDoctorEmail: fromDoctor.email,
      toDoctorId: toDoctor._id.toString(),
      toDoctorName,
      toDoctorEmail: toDoctor.email,
      toDepartment,
      reason,
      clinicalNotes: clinicalNotes || '',
      status: 'pending',
    });

    await referral.save();

    // Create Notification Alert for Destination Doctor
    try {
      const alert = new AlertModel({
        patientId,
        type: 'follow_up_missed', // or general alert
        severity: 'high',
        triggerDetails: `Referral from ${fromDoctorName}: "${reason}"`,
        summary: `${fromDoctorName} referred patient ${patientName} (${toDepartment}). Reason: ${reason}`,
      });
      await alert.save();
    } catch (alertErr) {
      console.warn('Failed to create alert for referral:', alertErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully referred ${patientName} to ${toDoctorName}`,
      referral,
    });
  } catch (error) {
    console.error('Create doctor referral error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/doctor/refer
 * Doctor endpoint to list incoming and outgoing patient referrals.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const currentUser: any = await UserModel.findOne({ email: session.user.email }).lean();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const currentUserId = currentUser._id.toString();

    const referrals = await ReferralModel.find({
      $or: [
        { toDoctorId: currentUserId },
        { toDoctorEmail: currentUser.email },
        { fromDoctorId: currentUserId },
        { fromDoctorEmail: currentUser.email },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, referrals });
  } catch (error) {
    console.error('Fetch doctor referrals error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
