import { NextResponse } from 'next/server';
import { redisCache } from '@/lib/redis';

export async function GET() {
  try {
    const stats = redisCache.getStats();
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, pattern } = body;

    if (action === 'clear') {
      const cleared = await redisCache.clearPattern(pattern || '*');
      return NextResponse.json({
        success: true,
        message: `Cleared ${cleared} cached items from Redis matching '${pattern || '*'}'`,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
