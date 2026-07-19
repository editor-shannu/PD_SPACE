import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { AppointmentModel } from '@/models/appointment';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = (session.user as any).id;

    await connectDB();
    const appointments = await AppointmentModel.find({ patientId })
      .sort({ date: -1, time: -1 })
      .lean();

    return NextResponse.json({ success: true, appointments: appointments || [] });
  } catch (error) {
    console.error('Fetch appointments error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = (session.user as any).id;

    const body = await req.json();
    const { doctorName, department, date, time, urgency } = body;

    if (!doctorName || !department || !date || !time) {
      return NextResponse.json({ success: false, error: 'Missing required booking fields' }, { status: 400 });
    }

    await connectDB();

    const appointment = new AppointmentModel({
      patientId,
      doctorName,
      department,
      date,
      time,
      status: 'pending',
      urgency: urgency || 'routine',
    });

    await appointment.save();

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error('Book appointment error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
