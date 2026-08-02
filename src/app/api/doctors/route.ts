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

    // 2. Default specialist list for departments
    const defaultDoctorSeed = [
      { name: 'Dr. Gregory House', email: 'dr.house@mediflow.care', department: 'General Medicine', slots: ['11:00 AM', '02:00 PM', '04:30 PM'] },
      { name: 'Dr. John Watson', email: 'dr.watson@mediflow.care', department: 'General Medicine', slots: ['10:00 AM', '12:30 PM', '03:00 PM'] },
      { name: 'Dr. Sarah Jenkins', email: 'dr.jenkins@mediflow.care', department: 'Cardiology', slots: ['09:00 AM', '11:30 AM', '02:00 PM'] },
      { name: 'Dr. Marcus Vance', email: 'dr.vance@mediflow.care', department: 'Cardiology', slots: ['10:00 AM', '01:30 PM', '04:00 PM'] },
      { name: 'Dr. Elena Rostova', email: 'dr.rostova@mediflow.care', department: 'Neurology', slots: ['09:30 AM', '11:00 AM', '03:30 PM'] },
      { name: 'Dr. Raymond Holt', email: 'dr.holt@mediflow.care', department: 'Neurology', slots: ['10:30 AM', '02:30 PM', '05:00 PM'] },
      { name: 'Dr. Lisa Cuddy', email: 'dr.cuddy@mediflow.care', department: 'Pediatrics', slots: ['08:30 AM', '10:30 AM', '01:00 PM'] },
      { name: 'Dr. Allison Cameron', email: 'dr.cameron@mediflow.care', department: 'Dermatology', slots: ['09:00 AM', '01:30 PM', '03:00 PM'] },
      { name: 'Dr. Robert Chase', email: 'dr.chase@mediflow.care', department: 'Orthopedics', slots: ['09:00 AM', '11:00 AM', '02:30 PM'] },
      { name: 'Dr. Anthony Fauci', email: 'dr.fauci@mediflow.care', department: 'Infectious Diseases', slots: ['09:00 AM', '11:00 AM', '02:00 PM'] },
    ];

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

    // Merge default seeds if no registered portal user covers a specific department
    defaultDoctorSeed.forEach((seed) => {
      const exists = doctorList.some(
        (d) => d.email.toLowerCase() === seed.email.toLowerCase() || d.name.toLowerCase() === seed.name.toLowerCase()
      );
      if (!exists) {
        doctorList.push({
          id: `seed-${seed.email}`,
          name: seed.name,
          email: seed.email,
          department: seed.department,
          slots: seed.slots,
          isRegisteredPortalUser: true,
        });
      }
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
