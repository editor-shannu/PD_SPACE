/**
 * GET /api/doctor/patients
 * Doctor-only endpoint to search and fetch patients in MongoDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';
import { DocumentModel } from '@/models/document';
import { AlertModel } from '@/models/alert';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    // Doctor authorization guard
    if (!session?.user || (userRole !== 'doctor' && userRole !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Doctor access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();

    await connectDB();

    // Query patients in UserModel (strictly excluding doctor and admin roles)
    let userQuery: any = { role: { $nin: ['doctor', 'admin'] } };
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : undefined },
      ].filter(Boolean);
    }

    let users = await UserModel.find(userQuery).select('name email role createdAt').lean();

    // Find doctors and admins to exclude from orphan document patient IDs
    const nonPatientUsers = await UserModel.find({ role: { $in: ['doctor', 'admin'] } }).select('_id').lean();
    const nonPatientIdSet = new Set(nonPatientUsers.map((u: any) => u._id.toString()));

    const documentPatientIds = await DocumentModel.distinct('userId');

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

    // Include any document patient IDs not in user table (and not doctor/admin)
    for (const pId of documentPatientIds) {
      if (typeof pId === 'string' && !processedIds.has(pId) && !nonPatientIdSet.has(pId)) {
        processedIds.add(pId);

        if (search && !pId.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }

        const docCount = await DocumentModel.countDocuments({ userId: pId });
        const alertCount = await AlertModel.countDocuments({ patientId: pId });

        patientList.push({
          id: pId,
          name: `Patient (${pId.substring(0, 8)}...)`,
          email: `${pId}@patient.mediflow.internal`,
          role: 'patient',
          documentCount: docCount,
          alertCount,
        });
      }
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
