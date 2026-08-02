import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { AppointmentModel } from '@/models/appointment';
import { UserModel } from '@/models/user';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || 'patient';

    await connectDB();

    let appointments = [];
    if (userRole === 'doctor' || userRole === 'admin') {
      // Return appointments assigned to doctor or all if admin
      appointments = await AppointmentModel.find(
        userRole === 'admin' ? {} : { $or: [{ doctorId: userId }, { doctorName: new RegExp((session.user as any).name || '', 'i') }] }
      )
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // Patient appointments
      appointments = await AppointmentModel.find({ patientId: userId })
        .sort({ createdAt: -1 })
        .lean();
    }

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

    await connectDB();
    const patientUser: any = await UserModel.findById(patientId).select('name email emrProfile').lean().catch(() => null);

    const body = await req.json();
    const { doctorId, doctorName, department, date, time, urgency } = body;

    if (!doctorName || !department || !date || !time) {
      return NextResponse.json({ success: false, error: 'Missing required booking fields' }, { status: 400 });
    }

    const patientName = patientUser?.name || session.user.name || 'Patient';
    const patientEmail = patientUser?.email || session.user.email || '';
    const patientPhone = patientUser?.emrProfile?.phone || patientUser?.emrProfile?.emergencyContactPhone || '';

    const appointment = new AppointmentModel({
      patientId,
      patientName,
      patientEmail,
      patientPhone,
      doctorId: doctorId || '',
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

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'doctor' && userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Doctor authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const { appointmentId, status, completionDate, clinicalNotes, testResultsSummary, doctorSignature } = body;

    if (!appointmentId) {
      return NextResponse.json({ success: false, error: 'Missing appointmentId' }, { status: 400 });
    }

    await connectDB();

    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    if (status) {
      appointment.status = status;
    }

    if (status === 'completed' || completionDate) {
      appointment.completedDetails = {
        completionDate: completionDate || new Date().toISOString().split('T')[0],
        clinicalNotes: clinicalNotes || 'Checkup and examination completed successfully.',
        testResultsSummary: testResultsSummary || 'Vitals normal. Patient cleared.',
        doctorSignature: doctorSignature || `${session.user.name || 'Doctor'}, M.D. - Verified Digital Signature`,
      };
    }

    await appointment.save();

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
