/**
 * GET /api/documents
 * Fetch all documents for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { model, Schema } from 'mongoose';
import type { Document, ExtractedData, Medication } from '@/types/documents';

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

    // Define Document schema inline to avoid circular imports
    const medicationSchema = new Schema<Medication>(
      {
        name: { type: String, required: true },
        dosage: { type: String },
        frequency: { type: String },
      },
      { _id: false }
    );

    const extractedDataSchema = new Schema<ExtractedData>(
      {
        document_type: {
          type: String,
          enum: ['prescription', 'diagnostic_report', 'discharge_summary', 'other'],
          required: true,
        },
        doctor_name: String,
        date: Date,
        diagnosis: String,
        medications: { type: [medicationSchema], default: [] },
        follow_up_date: Date,
        notes: String,
      },
      { _id: false }
    );

    const documentSchema = new Schema<Document>(
      {
        userId: { type: String, required: true, index: true },
        fileName: { type: String, required: true },
        fileUrl: String,
        fileType: { type: String, enum: ['image', 'pdf'], required: true },
        rawText: { type: String, required: true },
        extractedData: { type: extractedDataSchema, required: true },
        isConfirmed: { type: Boolean, default: false },
      },
      { timestamps: true }
    );

    const DocumentModel = model<Document>('Document', documentSchema);

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
