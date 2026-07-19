/**
 * GET /api/alerts?patientId=...
 * Secondary endpoint supporting query parameter patientId lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AlertModel } from '@/models/alert';
import { initCronJobs } from '@/lib/cron';

export async function GET(req: NextRequest) {
  try {
    initCronJobs();

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    await connectDB();

    const query = patientId ? { patientId } : {};
    const alerts = await AlertModel.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      {
        success: true,
        patientId: patientId || undefined,
        alerts: alerts || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch alerts query error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alerts';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
