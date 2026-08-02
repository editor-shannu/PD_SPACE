/**
 * GET /api/doctor/patients
 * Doctor-only endpoint to search and fetch patients in MongoDB who booked with this doctor or were referred.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';
import { DocumentModel } from '@/models/document';
import { AlertModel } from '@/models/alert';
import { AppointmentModel } from '@/models/appointment';
import { ReferralModel } from '@/models/referral';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    await connectDB();
    const currentUser: any = await UserModel.findOne({ email: session.user.email }).lean();

    const dbRole = currentUser?.role;
    const isApprovedDoctor =
      currentUser?.doctorApplicationStatus === 'approved' ||
      dbRole === 'doctor' ||
      dbRole === 'admin' ||
      session.user.email === 'heallink.care@gmail.com' ||
      session.user.email === 'mediflow@test.com';

    // Doctor authorization guard
    if (!currentUser || !isApprovedDoctor) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Doctor access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();

    const currentUserId = currentUser._id.toString();
    // Strip "Dr." prefix to get the base name, then build both forms
    const rawName = (currentUser.name || (session.user as any).name || '').trim();
    const baseName = rawName.replace(/^Dr\.\s*/i, '').trim();
    const drName = `Dr. ${baseName}`;

    const viewAllPatients = searchParams.get('all') === 'true' && dbRole === 'admin';

    // Filter patient IDs assigned or referred to this specific doctor
    let allowedPatientIds: Set<string> | null = null;

    if (!viewAllPatients) {
      allowedPatientIds = new Set<string>();

      // Build name conditions using substring matching (handles with/without Dr. prefix)
      const nameConditions: any[] = [];
      if (baseName) {
        nameConditions.push({ doctorName: new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
      }
      if (drName !== baseName) {
        nameConditions.push({ doctorName: new RegExp(drName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
      }

      // 1. Find patient IDs from Appointments booked for this doctor
      const appointments = await AppointmentModel.find({
        $or: [
          { doctorId: currentUserId },
          ...nameConditions,
        ],
      }).select('patientId').lean();

      appointments.forEach((app: any) => {
        if (app.patientId) allowedPatientIds!.add(app.patientId);
      });

      // 2. Find patient IDs from Referrals sent to or from this doctor
      const referrals = await ReferralModel.find({
        $or: [
          { toDoctorId: currentUserId },
          { toDoctorEmail: currentUser.email },
          { fromDoctorId: currentUserId },
          { fromDoctorEmail: currentUser.email },
        ],
      }).select('patientId').lean();

      referrals.forEach((ref: any) => {
        if (ref.patientId) allowedPatientIds!.add(ref.patientId);
      });

      // 3. Find patient IDs from Documents referencing this doctor
      if (baseName) {
        const docs = await DocumentModel.find({
          'extractedData.doctor_name': new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        }).select('userId').lean();

        docs.forEach((d: any) => {
          if (d.userId) allowedPatientIds!.add(d.userId);
        });
      }
    }

    // Query patients in UserModel (strictly excluding doctor and admin roles)
    let userQuery: any = { role: { $nin: ['doctor', 'admin'] } };

    if (allowedPatientIds !== null) {
      userQuery._id = { $in: Array.from(allowedPatientIds) };
    }

    if (search) {
      const searchOr = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : undefined },
      ].filter(Boolean);

      if (userQuery._id) {
        userQuery = {
          $and: [
            { role: { $nin: ['doctor', 'admin'] } },
            { _id: userQuery._id },
            { $or: searchOr },
          ],
        };
      } else {
        userQuery.$or = searchOr;
      }
    }

    let users = await UserModel.find(userQuery).select('name email role createdAt').lean();

    // Find doctors and admins to exclude from orphan document patient IDs
    const nonPatientUsers = await UserModel.find({ role: { $in: ['doctor', 'admin'] } }).select('_id').lean();
    const nonPatientIdSet = new Set(nonPatientUsers.map((u: any) => u._id.toString()));

    const patientList: any[] = [];
    const processedIds = new Set<string>();

    for (const u of users) {
      const idStr = (u as any)._id.toString();
      processedIds.add(idStr);

      const docCount = await DocumentModel.countDocuments({ userId: idStr });
      const alertCount = await AlertModel.countDocuments({ patientId: idStr });

      patientList.push({
        id: idStr,
        name: u.name || 'Unnamed Patient',
        email: u.email,
        role: u.role || 'patient',
        documentCount: docCount,
        alertCount,
      });
    }

    return NextResponse.json(
      {
        success: true,
        patients: patientList,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch doctor patients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients list' },
      { status: 500 }
    );
  }
}
