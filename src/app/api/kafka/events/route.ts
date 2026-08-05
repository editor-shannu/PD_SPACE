import { NextResponse } from 'next/server';
import { kafkaService, KafkaTopic } from '@/lib/kafka';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic') as KafkaTopic | null;
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const metrics = kafkaService.getMetrics();
    const recentEvents = kafkaService.getRecentEvents(topic || undefined, limit);

    return NextResponse.json({
      success: true,
      metrics,
      events: recentEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, payload, role, key } = body;

    if (!topic || !payload) {
      return NextResponse.json(
        { success: false, message: 'Topic and payload are required' },
        { status: 400 }
      );
    }

    const event = await kafkaService.produce(topic as KafkaTopic, payload, role || 'system', key);

    return NextResponse.json({
      success: true,
      message: 'Kafka message produced successfully to high-throughput queue',
      event,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
