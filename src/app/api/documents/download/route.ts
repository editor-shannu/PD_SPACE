import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return new NextResponse('fileId is required', { status: 400 });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return new NextResponse('Database connection not established', { status: 500 });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'documents' });

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(fileId);
    } catch {
      return new NextResponse('Invalid fileId format', { status: 400 });
    }

    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    const file = files[0];
    const downloadStream = bucket.openDownloadStream(objectId);

    // Stream the file back
    const responseHeaders = new Headers({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${file.filename}"`,
    });

    // Convert Stream to Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        downloadStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        downloadStream.on('end', () => {
          controller.close();
        });
        downloadStream.on('error', (err) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(readableStream, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
