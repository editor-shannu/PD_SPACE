/**
 * GET /api/documents
 * Fetch all documents for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/document';
import type { Document } from '@/types/documents';

interface DocumentResponse {
  success: boolean;
  documents?: Document[];
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<DocumentResponse>> {
  try {
    // Get session
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Fetch documents for user
    const documents = await DocumentModel.find({ userId: (session.user as any).id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        documents: documents || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get documents error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch documents';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
