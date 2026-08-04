import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { HospitalModel } from '@/models/hospital';

/**
 * GET /api/hospital/apply
 * Gets hospital application status for current logged-in Google user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const email = session.user.email.toLowerCase().trim();
    await connectDB();

    const hospital: any = await HospitalModel.findOne({ applicantGoogleEmail: email }).lean();

    if (!hospital) {
      return NextResponse.json({
        success: true,
        hasApplication: false,
        status: 'none',
      });
    }

    return NextResponse.json({
      success: true,
      hasApplication: true,
      status: hospital.status,
      hospital: {
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        address: hospital.address,
        phone: hospital.phone,
        contactEmail: hospital.contactEmail,
        reasonToJoin: hospital.reasonToJoin,
        bedCapacity: hospital.bedCapacity,
        specialties: hospital.specialties,
        appliedAt: hospital.appliedAt,
        approvedAt: hospital.approvedAt,
        credentials: (hospital.status === 'approved' && hospital.credentials) ? {
          hospitalAdminId: hospital.credentials.hospitalAdminId,
          hospitalAdminEmail: hospital.credentials.hospitalAdminEmail,
          rawTempPassword: hospital.credentials.rawTempPassword || '',
        } : undefined,
      },
    });
  } catch (error: any) {
    console.error('Fetch hospital application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hospital application status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hospital/apply
 * Submits a new hospital collaboration application.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in with Google.' },
        { status: 401 }
      );
    }

    const email = session.user.email.toLowerCase().trim();
    const body = await req.json();
    const { name, address, phone, contactEmail, reasonToJoin, bedCapacity, specialties } = body;

    if (!name || !address || !phone || !contactEmail || !reasonToJoin) {
      return NextResponse.json(
        { success: false, error: 'Please provide all required fields: Hospital Name, Address, Phone, Contact Email, and Reason to Join.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if hospital application already exists for this email
    let existingHospital: any = await HospitalModel.findOne({ applicantGoogleEmail: email });

    if (existingHospital && existingHospital.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'You already have a pending hospital application under review.' },
        { status: 400 }
      );
    }

    // Generate unique Hospital ID (e.g. HOSP-92841)
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const hospitalId = `HOSP-${randomCode}`;

    if (existingHospital) {
      existingHospital.name = name.trim();
      existingHospital.address = address.trim();
      existingHospital.phone = phone.trim();
      existingHospital.contactEmail = contactEmail.trim();
      existingHospital.reasonToJoin = reasonToJoin.trim();
      existingHospital.bedCapacity = bedCapacity || '50+';
      existingHospital.specialties = Array.isArray(specialties) ? specialties : [];
      existingHospital.status = 'pending';
      existingHospital.rejectionReason = '';
      existingHospital.appliedAt = new Date();
      existingHospital.credentials = {
        hospitalAdminId: hospitalId,
        hospitalAdminEmail: contactEmail.trim(),
      };
      await existingHospital.save();
    } else {
      existingHospital = new HospitalModel({
        hospitalId,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        contactEmail: contactEmail.trim(),
        applicantGoogleEmail: email,
        reasonToJoin: reasonToJoin.trim(),
        bedCapacity: bedCapacity || '50+',
        specialties: Array.isArray(specialties) ? specialties : [],
        status: 'pending',
        credentials: {
          hospitalAdminId: hospitalId,
          hospitalAdminEmail: contactEmail.trim(),
        },
        appliedAt: new Date(),
      });
      await existingHospital.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Hospital application submitted successfully! Main Admin will review your application.',
      status: 'pending',
      hospitalId,
    });
  } catch (error: any) {
    console.error('Submit hospital application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit hospital application' },
      { status: 500 }
    );
  }
}
