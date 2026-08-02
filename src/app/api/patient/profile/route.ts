/**
 * /api/patient/profile
 * GET: Retrieves logged in patient's EMR profile data and completion status
 * POST/PUT: Saves or updates compulsory patient EMR details and unlocks dashboard access
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const email = session.user.email.toLowerCase();
    const user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      isEmrCompleted: !!user.isEmrCompleted,
      emrProfile: user.emrProfile || null,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isEmrCompleted: !!user.isEmrCompleted,
      },
    });
  } catch (error: any) {
    console.error('Fetch EMR profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch EMR profile' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const emrProfile = body.emrProfile || body;

    // Validate compulsory required fields
    if (!emrProfile?.fullName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full Name is required' },
        { status: 400 }
      );
    }

    if (!emrProfile?.phone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Contact phone number is required' },
        { status: 400 }
      );
    }

    if (!emrProfile?.emergencyContactPhone?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Emergency contact phone number is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const email = session.user.email.toLowerCase();

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = new UserModel({
        email,
        name: emrProfile.fullName.trim(),
        role: 'patient',
      });
    }

    // Clean up & assign EMR profile
    user.emrProfile = {
      fullName: emrProfile.fullName.trim(),
      dob: emrProfile.dob || '',
      age: emrProfile.age ? Number(emrProfile.age) : undefined,
      gender: emrProfile.gender || 'Prefer not to say',
      phone: emrProfile.phone.trim(),
      bloodGroup: emrProfile.bloodGroup || 'Not specified',
      emergencyContactName: emrProfile.emergencyContactName || '',
      emergencyContactPhone: emrProfile.emergencyContactPhone.trim(),
      emergencyRelation: emrProfile.emergencyRelation || 'Emergency Contact',
      preExistingConditions: emrProfile.preExistingConditions || 'None reported',
      allergies: emrProfile.allergies || 'No known allergies',
      currentMedications: emrProfile.currentMedications || 'None',
      height: emrProfile.height || '',
      weight: emrProfile.weight || '',
      address: emrProfile.address || '',
    };

    user.isEmrCompleted = true;
    user.name = emrProfile.fullName.trim(); // keep user display name synced
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'EMR Profile saved successfully. Dashboard unlocked!',
      isEmrCompleted: true,
      emrProfile: user.emrProfile,
    });
  } catch (error: any) {
    console.error('Save EMR profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save EMR profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
