import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';
import { kafkaService } from '@/lib/kafka';

const COOLING_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * GET /api/doctor/apply
 * Retrieves the current doctor application status & cooling period info for logged-in user.
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

    await connectDB();
    const user: any = await UserModel.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User account not found.' },
        { status: 404 }
      );
    }

    // Default status logic for hardcoded/admin doctors
    let status = user.doctorApplicationStatus || 'none';
    if (user.role === 'doctor' || user.role === 'admin') {
      status = 'approved';
    }

    // Check if user is an existing registered patient who completed EMR as a patient
    const isExistingPatient =
      user.role === 'patient' &&
      (user.emrCompleted === true || !!user.emrProfile?.name || !!user.emrProfile?.phone) &&
      (!user.doctorApplicationStatus || user.doctorApplicationStatus === 'none');

    let coolingDaysRemaining = 0;
    let isCoolingActive = false;

    if (status === 'rejected' && user.doctorRejectedAt) {
      const rejectedTime = new Date(user.doctorRejectedAt).getTime();
      const now = Date.now();
      const elapsed = now - rejectedTime;

      if (elapsed < COOLING_PERIOD_MS) {
        isCoolingActive = true;
        coolingDaysRemaining = Math.ceil((COOLING_PERIOD_MS - elapsed) / (1000 * 60 * 60 * 24));
      }
    }

    return NextResponse.json({
      success: true,
      status,
      role: user.role,
      isExistingPatient,
      doctorProfile: user.doctorProfile || null,
      doctorRejectedAt: user.doctorRejectedAt || null,
      doctorRejectionReason: user.doctorRejectionReason || '',
      isCoolingActive,
      coolingDaysRemaining,
    });
  } catch (error) {
    console.error('Fetch doctor application status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctor application status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/doctor/apply
 * Submits/re-submits doctor verification profile for admin review.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, department, licenseNumber, experienceYears, hospitalAffiliation, hospitalId, doctorJoinType, phone, qualifications } = body;

    if (!name || !department || !licenseNumber || !phone) {
      return NextResponse.json(
        { success: false, error: 'Please complete all required fields: Name, Department, License #, and Phone.' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await UserModel.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User account not found.' },
        { status: 404 }
      );
    }

    // Block existing registered patients from submitting doctor applications
    const isExistingPatient =
      user.role === 'patient' &&
      (user.emrCompleted === true || !!user.emrProfile?.name || !!user.emrProfile?.phone) &&
      (!user.doctorApplicationStatus || user.doctorApplicationStatus === 'none');

    if (isExistingPatient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient Account Detected: Accounts registered as a Patient in MediFlow cannot use or apply for the Doctor Portal.',
        },
        { status: 403 }
      );
    }

    // Check cooling period if previously rejected
    if (user.doctorApplicationStatus === 'rejected' && user.doctorRejectedAt) {
      const rejectedTime = new Date(user.doctorRejectedAt).getTime();
      const elapsed = Date.now() - rejectedTime;

      if (elapsed < COOLING_PERIOD_MS) {
        const daysLeft = Math.ceil((COOLING_PERIOD_MS - elapsed) / (1000 * 60 * 60 * 24));
        return NextResponse.json(
          {
            success: false,
            error: `Your application was previously rejected. A mandatory 1-week cooling period is active. Please re-apply in ${daysLeft} day(s).`,
          },
          { status: 429 }
        );
      }
    }

    const joinType = doctorJoinType === 'hospital' ? 'hospital' : 'individual';
    const finalAffiliation = joinType === 'hospital' ? (hospitalAffiliation || 'Collaborated Hospital') : 'Individual Practice';

    // Update user record with pending doctor profile
    user.name = name.trim();
    user.doctorApplicationStatus = 'pending';
    user.doctorRejectedAt = undefined;
    user.doctorRejectionReason = '';
    user.hospitalId = joinType === 'hospital' ? hospitalId : undefined;
    user.hospitalName = joinType === 'hospital' ? finalAffiliation : undefined;
    user.doctorProfile = {
      department: department.trim(),
      licenseNumber: licenseNumber.trim(),
      experienceYears: experienceYears ? String(experienceYears).trim() : '1+',
      hospitalAffiliation: finalAffiliation,
      hospitalId: joinType === 'hospital' ? hospitalId : undefined,
      doctorJoinType: joinType,
      phone: phone.trim(),
      qualifications: qualifications ? qualifications.trim() : '',
      appliedAt: new Date(),
    };

    await user.save();

    // 📡 Kafka Producer: Produce crowd event to doctor-queue-events
    await kafkaService.produce('doctor-queue-events', {
      action: `Doctor verification application submitted by ${name.trim()} (${department.trim()})`,
      doctorEmail: session.user.email,
      department: department.trim(),
      timestamp: new Date().toISOString(),
    }, 'doctor');

    const reviewMsg = joinType === 'hospital' 
      ? `Doctor application submitted! Your request has been sent directly to ${finalAffiliation} Hospital Administration for approval.` 
      : 'Doctor application submitted! Your profile is under review by MediFlow Main Administrators.';

    return NextResponse.json({
      success: true,
      message: reviewMsg,
      status: 'pending',
      doctorProfile: user.doctorProfile,
    });
  } catch (error) {
    console.error('Submit doctor application error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit doctor verification application' },
      { status: 500 }
    );
  }
}
