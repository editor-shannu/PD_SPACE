/**
 * GET /api/alerts/:patientId
 * Endpoint for Doctor Summary View and Hospital Admin Analytics to fetch alerts for a patient.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AlertModel } from '@/models/alert';
import { initCronJobs } from '@/lib/cron';

interface AlertsResponse {
  success: boolean;
  patientId?: string;
  alerts?: any[];
  error?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
): Promise<NextResponse<AlertsResponse>> {
  try {
    // Ensure cron job is initialized
    initCronJobs();

    const patientId = params.patientId;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const alerts = await AlertModel.find({ patientId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        patientId,
        alerts: alerts || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch alerts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alerts';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
