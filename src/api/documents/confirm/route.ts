/**
 * POST /api/documents/confirm
 * Accepts { file_id, extracted_data, patientId }
 * Validates extracted data against Zod schema
 * Saves to MongoDB collection documents
 * Returns saved document with ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/document';
import { ExtractedDataSchema } from '@/lib/validation';
import { Document } from '@/types/documents';
import { z } from 'zod';

interface ConfirmRequest {
  file_id: string;
  extracted_data: z.infer<typeof ExtractedDataSchema>;
  patientId: string;
  fileName?: string;
  mimeType?: string;
}

interface ConfirmResponse {
  success: boolean;
  document?: Document;
  documentId?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ConfirmResponse>> {
  try {
    const body = (await req.json()) as ConfirmRequest;
    const { file_id, extracted_data, patientId, fileName, mimeType } = body;

    // Validation
    if (!file_id) {
      return NextResponse.json(
        { success: false, error: 'file_id is required' },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId is required' },
        { status: 400 }
      );
    }

    if (!extracted_data) {
      return NextResponse.json(
        { success: false, error: 'extracted_data is required' },
        { status: 400 }
      );
    }

    // Validate extracted data against schema
    const validationResult = ExtractedDataSchema.safeParse(extracted_data);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Data validation failed: ${validationResult.error.message}`,
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Determine file type based on MIME type
    let fileType: 'image' | 'pdf' = 'image';
    if (mimeType === 'application/pdf') {
      fileType = 'pdf';
    }

    // Create document object
    const documentData = {
      userId: patientId,
      fileName: fileName || `document_${Date.now()}`,
      fileType,
      rawText: '', // TODO: Retrieve raw text from OCR step
      extractedData: validationResult.data,
      isConfirmed: true,
    };

    // Save to MongoDB
    const newDocument = new DocumentModel(documentData);
    await newDocument.save();

    const savedDocument = newDocument.toObject() as Document;
    savedDocument._id = newDocument._id.toString();

    return NextResponse.json(
      {
        success: true,
        document: savedDocument,
        documentId: newDocument._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Confirm error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to confirm document';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
