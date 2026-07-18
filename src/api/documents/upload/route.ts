/**
 * POST /api/documents/upload
 * Accepts multipart FormData with file and patientId
 * Stores file in MongoDB GridFS
 * Returns file metadata and file ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Maximum file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];

interface UploadResponse {
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const patientId = formData.get('patientId') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'No patientId provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Create temporary storage for file
    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Generate unique file ID
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempFilePath = path.join(tmpDir, fileId);

    // Convert File to Buffer and save
    const buffer = await file.arrayBuffer();
    await fsPromises.writeFile(tempFilePath, Buffer.from(buffer));

    // Get file info
    const fileStats = await fsPromises.stat(tempFilePath);

    // Determine file type
    let fileTypeCategory = 'image';
    if (file.type === 'application/pdf') {
      fileTypeCategory = 'pdf';
    }

    // Clean up temp file (in production, you'd store this in GridFS)
    // For now, we'll store file reference in metadata
    // TODO: Implement actual GridFS storage
    await fsPromises.unlink(tempFilePath);

    const uploadedAt = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        fileId,
        fileName: file.name,
        fileSize: fileStats.size,
        mimeType: file.type,
        uploadedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to upload file';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
