import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 1. Query all users registered with role 'doctor', 'admin', or 'hospital_admin', excluding pending or rejected applications
    let registeredDoctors = await UserModel.find({
      role: { $in: ['doctor', 'admin', 'hospital_admin'] },
      doctorApplicationStatus: { $nin: ['pending', 'rejected'] },
    })
      .select('name email role emrProfile doctorProfile hospitalId hospitalName')
      .lean();

    // Map registered doctor portal users
    const doctorList = registeredDoctors.map((doc: any) => {
      // Determine department or default to General Medicine
      const dept = doc.doctorProfile?.department || doc.emrProfile?.department || 'General Medicine';
      const hospitalName = doc.hospitalName || doc.doctorProfile?.hospitalAffiliation || '';
      const hospitalId = doc.hospitalId || doc.doctorProfile?.hospitalId || '';

      return {
        id: doc._id.toString(),
        name: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
        email: doc.email,
        department: dept,
        hospitalName,
        hospitalId,
        slots: ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'],
        isRegisteredPortalUser: true,
      };
    });

    return NextResponse.json({
      success: true,
      doctors: doctorList,
    });
  } catch (error) {
    console.error('Fetch registered doctors error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
