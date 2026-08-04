import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { HospitalModel } from '@/models/hospital';
import { UserModel } from '@/models/user';
import { AppointmentModel } from '@/models/appointment';

async function checkHospitalAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !user.email) {
    return { authorized: false, session: null, hospitalId: null, email: null };
  }

  if (user.role === 'hospital_admin' || user.hospitalId) {
    return { authorized: true, session, hospitalId: user.hospitalId, email: user.email as string };
  }

  await connectDB();
  const cleanEmail = user.email.toLowerCase().trim();
  const approvedHospital: any = await HospitalModel.findOne({
    $or: [
      { applicantGoogleEmail: cleanEmail },
      { 'credentials.hospitalAdminEmail': cleanEmail },
      { contactEmail: cleanEmail },
    ],
    status: 'approved',
  }).lean();

  if (approvedHospital) {
    return { authorized: true, session, hospitalId: approvedHospital.hospitalId, email: user.email as string };
  }

  return { authorized: false, session: null, hospitalId: null, email: null };
}

/**
 * GET /api/hospital/admin
 * Fetches dashboard data for the authenticated Hospital Admin.
 */
export async function GET() {
  try {
    const { authorized, session, hospitalId, email } = await checkHospitalAdmin();
    if (!authorized || !session || !email) {
      return NextResponse.json({ success: false, error: 'Access Denied: Hospital Admin access only' }, { status: 403 });
    }

    await connectDB();
    const cleanEmail = email.toLowerCase().trim();

    // Fetch hospital details
    const hospital: any = await HospitalModel.findOne({
      $or: [
        { hospitalId: hospitalId },
        { applicantGoogleEmail: cleanEmail },
        { 'credentials.hospitalAdminEmail': cleanEmail },
      ],
    }).lean();

    const activeHospitalId = hospital?.hospitalId || hospitalId;
    const hospitalName = hospital?.name || (session.user as any).hospitalName || 'Collaborated Hospital';

    // Fetch pending doctor applications for THIS hospital
    const pendingDoctors = await UserModel.find({
      doctorApplicationStatus: 'pending',
      $or: [
        { 'doctorProfile.hospitalId': activeHospitalId },
        { 'doctorProfile.hospitalAffiliation': { $regex: hospitalName, $options: 'i' } },
        { hospitalId: activeHospitalId },
      ],
    })
      .select('name email doctorProfile createdAt')
      .lean();

    // Fetch verified active doctors for THIS hospital
    const activeDoctors = await UserModel.find({
      role: 'doctor',
      $or: [
        { 'doctorProfile.hospitalId': activeHospitalId },
        { 'doctorProfile.hospitalAffiliation': { $regex: hospitalName, $options: 'i' } },
        { hospitalId: activeHospitalId },
      ],
    })
      .select('name email doctorProfile createdAt isEmrCompleted')
      .lean();

    // Fetch appointments related to doctors of this hospital
    const doctorNames = activeDoctors.map((d: any) => d.name);
    const appointments = await AppointmentModel.find({
      $or: [
        { doctorName: { $in: doctorNames } },
        { hospitalAffiliation: { $regex: hospitalName, $options: 'i' } },
      ],
    })
      .sort({ date: -1 })
      .lean();

    // Unique patients count
    const uniquePatientIds = new Set(appointments.map((a: any) => a.patientId.toString()));

    return NextResponse.json({
      success: true,
      hospital: {
        hospitalId: activeHospitalId,
        name: hospitalName,
        address: hospital?.address || 'N/A',
        phone: hospital?.phone || 'N/A',
        contactEmail: hospital?.contactEmail || email,
        bedCapacity: hospital?.bedCapacity || '50+',
        specialties: hospital?.specialties || [],
        rawTempPassword: hospital?.credentials?.rawTempPassword,
      },
      stats: {
        totalDoctors: activeDoctors.length,
        pendingApprovals: pendingDoctors.length,
        totalAppointments: appointments.length,
        totalPatients: uniquePatientIds.size,
      },
      pendingDoctors: pendingDoctors.map((d: any) => ({
        id: d._id.toString(),
        name: d.name,
        email: d.email,
        department: d.doctorProfile?.department || 'General Medicine',
        licenseNumber: d.doctorProfile?.licenseNumber || 'N/A',
        experienceYears: d.doctorProfile?.experienceYears || '1+',
        phone: d.doctorProfile?.phone || 'N/A',
        qualifications: d.doctorProfile?.qualifications || '',
        appliedAt: d.doctorProfile?.appliedAt || d.createdAt,
      })),
      activeDoctors: activeDoctors.map((d: any) => ({
        id: d._id.toString(),
        name: d.name,
        email: d.email,
        department: d.doctorProfile?.department || 'General Medicine',
        licenseNumber: d.doctorProfile?.licenseNumber || 'N/A',
        phone: d.doctorProfile?.phone || 'N/A',
        joinedAt: d.createdAt,
      })),
      appointments: appointments.map((a: any) => ({
        id: a._id.toString(),
        patientName: a.patientName || 'Patient',
        doctorName: a.doctorName,
        department: a.department,
        date: a.date,
        time: a.time,
        status: a.status,
      })),
    });
  } catch (error: any) {
    console.error('Fetch hospital admin data error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hospital admin data' }, { status: 500 });
  }
}

/**
 * POST /api/hospital/admin
 * Actions by Hospital Admin (Approve/Reject Doctor, Change Password).
 */
export async function POST(req: NextRequest) {
  try {
    const { authorized, session, hospitalId, email } = await checkHospitalAdmin();
    if (!authorized || !session || !email) {
      return NextResponse.json({ success: false, error: 'Access Denied: Hospital Admin access only' }, { status: 403 });
    }

    const body = await req.json();
    const { action, doctorUserId, reason, newPassword } = body;
    const cleanEmail = email.toLowerCase().trim();

    await connectDB();

    const hospital: any = await HospitalModel.findOne({
      $or: [
        { hospitalId: hospitalId },
        { applicantGoogleEmail: cleanEmail },
        { 'credentials.hospitalAdminEmail': cleanEmail },
      ],
    });

    const activeHospitalId = hospital?.hospitalId || hospitalId;
    const hospitalName = hospital?.name || (session.user as any).hospitalName || 'Hospital';

    if (action === 'approve_doctor') {
      if (!doctorUserId) {
        return NextResponse.json({ success: false, error: 'Doctor User ID is required' }, { status: 400 });
      }

      const doctorUser = await UserModel.findById(doctorUserId);
      if (!doctorUser) {
        return NextResponse.json({ success: false, error: 'Doctor record not found' }, { status: 404 });
      }

      doctorUser.role = 'doctor';
      doctorUser.doctorApplicationStatus = 'approved';
      doctorUser.hospitalId = activeHospitalId;
      doctorUser.hospitalName = hospitalName;
      if (doctorUser.doctorProfile) {
        doctorUser.doctorProfile.hospitalId = activeHospitalId;
        doctorUser.doctorProfile.hospitalAffiliation = hospitalName;
      }
      await doctorUser.save();

      return NextResponse.json({
        success: true,
        message: `Doctor Dr. ${doctorUser.name} has been approved to practice at ${hospitalName}!`,
      });
    } else if (action === 'reject_doctor') {
      if (!doctorUserId) {
        return NextResponse.json({ success: false, error: 'Doctor User ID is required' }, { status: 400 });
      }

      const doctorUser = await UserModel.findById(doctorUserId);
      if (!doctorUser) {
        return NextResponse.json({ success: false, error: 'Doctor record not found' }, { status: 404 });
      }

      doctorUser.role = 'patient';
      doctorUser.doctorApplicationStatus = 'rejected';
      doctorUser.doctorRejectedAt = new Date();
      doctorUser.doctorRejectionReason = reason || `Verification declined by ${hospitalName} Hospital Administration.`;
      await doctorUser.save();

      return NextResponse.json({
        success: true,
        message: `Doctor application for Dr. ${doctorUser.name} was rejected.`,
      });
    } else if (action === 'change_password') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'New password must be at least 6 characters long' }, { status: 400 });
      }

      if (hospital) {
        hospital.credentials.rawTempPassword = newPassword;
        hospital.credentials.passwordHash = newPassword;
        await hospital.save();
      }

      // Also update UserModel record for this admin
      const adminEmail = (hospital?.credentials?.hospitalAdminEmail || cleanEmail).toLowerCase();
      const adminUser = await UserModel.findOne({ email: adminEmail });
      if (adminUser) {
        adminUser.password = newPassword;
        await adminUser.save();
      }

      return NextResponse.json({
        success: true,
        message: 'Hospital Admin password updated successfully! Please use your new password for future sign-ins.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Hospital admin action error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to process hospital admin action' }, { status: 500 });
  }
}
