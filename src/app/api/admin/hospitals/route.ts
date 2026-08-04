import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { HospitalModel } from '@/models/hospital';
import { UserModel } from '@/models/user';

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  const role = (session?.user as any)?.role;
  if (!session?.user || (email !== 'heallink.care@gmail.com' && role !== 'admin')) {
    return { authorized: false, session };
  }
  return { authorized: true, session };
}

/**
 * GET /api/admin/hospitals
 * Retrieves list of all hospital applications & collaborated hospitals.
 */
export async function GET() {
  try {
    const { authorized } = await checkAdmin();
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Access Denied: Main Admin access only' }, { status: 403 });
    }

    await connectDB();

    const hospitals = await HospitalModel.find({}).sort({ appliedAt: -1 }).lean();

    // Get count of doctors affiliated with each hospital
    const doctorCounts = await UserModel.aggregate([
      { $match: { role: 'doctor', hospitalId: { $exists: true, $ne: null } } },
      { $group: { _id: '$hospitalId', count: { $sum: 1 } } },
    ]);

    const doctorCountMap: Record<string, number> = {};
    doctorCounts.forEach((item: any) => {
      if (item._id) doctorCountMap[item._id] = item.count;
    });

    const formattedHospitals = hospitals.map((h: any) => ({
      id: h._id.toString(),
      hospitalId: h.hospitalId,
      name: h.name,
      address: h.address,
      phone: h.phone,
      contactEmail: h.contactEmail,
      applicantGoogleEmail: h.applicantGoogleEmail,
      reasonToJoin: h.reasonToJoin,
      bedCapacity: h.bedCapacity || '50+',
      specialties: h.specialties || [],
      status: h.status,
      rejectionReason: h.rejectionReason || '',
      credentials: h.credentials,
      doctorCount: doctorCountMap[h.hospitalId] || 0,
      appliedAt: h.appliedAt,
      approvedAt: h.approvedAt,
    }));

    return NextResponse.json({
      success: true,
      hospitals: formattedHospitals,
    });
  } catch (error: any) {
    console.error('Fetch admin hospitals error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hospital applications' }, { status: 500 });
  }
}

/**
 * POST /api/admin/hospitals
 * Main Admin approves or rejects hospital registration application.
 */
export async function POST(req: NextRequest) {
  try {
    const { authorized } = await checkAdmin();
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Access Denied: Main Admin access only' }, { status: 403 });
    }

    const body = await req.json();
    const { hospitalId, action, reason } = body;

    if (!hospitalId || !action) {
      return NextResponse.json({ success: false, error: 'Hospital ID and action (approve/reject) are required' }, { status: 400 });
    }

    await connectDB();

    const hospital = await HospitalModel.findOne({ hospitalId });
    if (!hospital) {
      return NextResponse.json({ success: false, error: 'Hospital application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Generate temporary random password
      const randPassNum = Math.floor(1000 + Math.random() * 9000);
      const tempPassword = `MediHosp#${randPassNum}`;

      hospital.status = 'approved';
      hospital.approvedAt = new Date();
      hospital.rejectionReason = '';
      hospital.credentials = {
        hospitalAdminId: hospital.hospitalId,
        hospitalAdminEmail: hospital.contactEmail || hospital.applicantGoogleEmail,
        rawTempPassword: tempPassword,
        passwordHash: tempPassword,
      };
      await hospital.save();

      // Create/update UserModel record for Hospital Admin credential login
      const adminEmail = (hospital.contactEmail || hospital.applicantGoogleEmail).toLowerCase();
      let userAdmin = await UserModel.findOne({ email: adminEmail });
      if (!userAdmin) {
        userAdmin = new UserModel({
          email: adminEmail,
          name: `${hospital.name} Admin`,
          role: 'hospital_admin',
          password: tempPassword,
          hospitalId: hospital.hospitalId,
          hospitalName: hospital.name,
        });
      } else {
        userAdmin.role = 'hospital_admin';
        userAdmin.password = tempPassword;
        userAdmin.hospitalId = hospital.hospitalId;
        userAdmin.hospitalName = hospital.name;
      }
      await userAdmin.save();

      return NextResponse.json({
        success: true,
        message: `Hospital ${hospital.name} approved successfully! Credentials generated.`,
        credentials: {
          hospitalId: hospital.hospitalId,
          hospitalAdminEmail: adminEmail,
          password: tempPassword,
        },
      });
    } else if (action === 'reject') {
      hospital.status = 'rejected';
      hospital.rejectionReason = reason || 'Collaboration application does not meet current platform requirements.';
      await hospital.save();

      return NextResponse.json({
        success: true,
        message: `Hospital application for ${hospital.name} was rejected.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update hospital application error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update hospital application' }, { status: 500 });
  }
}
