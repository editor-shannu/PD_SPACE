import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { HospitalModel } from '@/models/hospital';

/**
 * GET /api/hospitals/list
 * Public API to fetch list of approved collaborated hospitals.
 */
export async function GET() {
  try {
    await connectDB();
    const hospitals = await HospitalModel.find({ status: 'approved' })
      .select('hospitalId name address specialties phone')
      .sort({ name: 1 })
      .lean();

    const formattedHospitals = hospitals.map((h: any) => ({
      hospitalId: h.hospitalId,
      name: h.name,
      address: h.address,
      specialties: h.specialties || [],
      phone: h.phone,
    }));

    return NextResponse.json({
      success: true,
      hospitals: formattedHospitals,
    });
  } catch (error: any) {
    console.error('Fetch public hospital list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hospital list' },
      { status: 500 }
    );
  }
}
