import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // 1. Query all users registered with role 'doctor' or 'admin'
    let registeredDoctors = await UserModel.find({
      role: { $in: ['doctor', 'admin'] },
    })
      .select('name email role emrProfile')
      .lean();

    // Map registered doctor portal users
    const doctorList = registeredDoctors.map((doc: any) => {
      // Determine department or default to General Medicine
      const dept = doc.emrProfile?.department || 'General Medicine';
      return {
        id: doc._id.toString(),
        name: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
        email: doc.email,
        department: dept,
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
