import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';

export async function GET() {
  try {
    console.log('[Diagnostic] Connecting to DB...');
    const conn = await connectDB();
    console.log('[Diagnostic] Connected. Querying user model...');
    const count = await UserModel.countDocuments({});
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      userCount: count,
      connectionState: conn.connection.readyState
    });
  } catch (error: any) {
    console.error('[Diagnostic] Error:', error);
    return NextResponse.json({
      success: false,
      message: 'MongoDB connection failed',
      error: error.message || String(error),
      stack: error.stack || ''
    }, { status: 500 });
  }
}
