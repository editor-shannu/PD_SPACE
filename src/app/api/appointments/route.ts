import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { AppointmentModel } from '@/models/appointment';
import { UserModel } from '@/models/user';
import { ReferralModel } from '@/models/referral';
import { redisCache } from '@/lib/redis';
import { kafkaService } from '@/lib/kafka';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const viewAll = searchParams.get('all') === 'true';

    // ⚡ Redis Fast Cache Check
    const cacheKey = `appointments:${userId}:${viewAll ? 'all' : 'user'}`;
    const cached = await redisCache.get<any[]>(cacheKey);
    if (cached.hit && cached.data) {
      return NextResponse.json({
        success: true,
        appointments: cached.data,
        cached: true,
        latencyMs: cached.latencyMs,
      });
    }

    await connectDB();

    const currentUser: any = await UserModel.findOne({ email: session.user.email }).lean();
    const userRole = currentUser?.role || (session.user as any).role || 'patient';
    const isApprovedDoctor =
      currentUser?.doctorApplicationStatus === 'approved' ||
      userRole === 'doctor' ||
      userRole === 'admin' ||
      session.user.email === 'heallink.care@gmail.com';

    let appointments = [];
    if (isApprovedDoctor && !viewAll) {
      // Build all name variants for this doctor
      const rawName = (currentUser?.name || (session.user as any).name || '').trim();
      const baseName = rawName.replace(/^Dr\.\s*/i, '').trim();
      const drName = `Dr. ${baseName}`;

      const currentUserId = currentUser?._id?.toString() || userId;
      const userEmail = (currentUser?.email || session.user.email || '').toLowerCase().trim();

      const referrals = await ReferralModel.find({
        $or: [{ toDoctorId: currentUserId }, { toDoctorEmail: userEmail }],
      }).select('patientId').lean();
      const referredPatientIds = referrals.map((r: any) => r.patientId).filter(Boolean);

      const nameConditions: any[] = [];
      if (baseName) {
        nameConditions.push({ doctorName: new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
      }
      if (drName !== baseName) {
        nameConditions.push({ doctorName: new RegExp(drName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
      }

      const idConditions: any[] = [
        { doctorId: userId },
        { doctorId: currentUserId },
      ];

      const allDoctorConditions = [...idConditions, ...nameConditions];

      let doctorFilter: any;
      if (referredPatientIds.length > 0) {
        doctorFilter = {
          $or: [
            ...allDoctorConditions,
            { patientId: { $in: referredPatientIds }, $or: allDoctorConditions },
          ],
        };
      } else {
        doctorFilter = { $or: allDoctorConditions };
      }

      appointments = await AppointmentModel.find(doctorFilter)
        .sort({ createdAt: -1 })
        .lean();
    } else if (viewAll && userRole === 'admin') {
      appointments = await AppointmentModel.find({})
        .sort({ createdAt: -1 })
        .lean();
    } else {
      appointments = await AppointmentModel.find({ patientId: userId })
        .sort({ createdAt: -1 })
        .lean();
    }

    const enrichedAppointments = await Promise.all(
      appointments.map(async (app: any) => {
        if (!app.patientName || app.patientName === 'Patient' || app.patientName.startsWith('Patient (')) {
          if (app.patientId && app.patientId.match(/^[0-9a-fA-F]{24}$/)) {
            const patient: any = await UserModel.findById(app.patientId).select('name email emrProfile').lean().catch(() => null);
            if (patient) {
              app.patientName = patient.name || patient.emrProfile?.fullName || app.patientName;
              app.patientEmail = patient.email || app.patientEmail;
              app.patientPhone = patient.emrProfile?.phone || app.patientPhone;
            }
          }
        }
        return app;
      })
    );

    // Save to Redis Cache (15 seconds TTL for high dynamic traffic)
    await redisCache.set(cacheKey, enrichedAppointments, 15);

    return NextResponse.json({ success: true, appointments: enrichedAppointments || [], cached: false });
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
    const { doctorId, doctorName, hospitalId, hospitalName, department, date, time, urgency } = body;

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
      hospitalId: hospitalId || '',
      hospitalName: hospitalName || '',
      department,
      date,
      time,
      status: 'pending',
      urgency: urgency || 'routine',
    });

    await appointment.save();

    // 📡 Kafka Producer: Produce crowd event to patient-crowd-events & doctor-queue-events
    await kafkaService.produce('patient-crowd-events', {
      action: `Patient ${patientName} queued appointment with ${doctorName}`,
      appointmentId: appointment._id,
      patientId,
      department,
      urgency,
      timestamp: new Date().toISOString(),
    }, 'patient');

    // ⚡ Clear Redis Cache
    await redisCache.clearPattern('appointments:*');

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

    await connectDB();
    const currentUser: any = await UserModel.findOne({ email: session.user.email }).lean();
    const userRole = currentUser?.role || (session.user as any).role;
    const isApprovedDoctor =
      currentUser?.doctorApplicationStatus === 'approved' ||
      userRole === 'doctor' ||
      userRole === 'admin' ||
      session.user.email === 'heallink.care@gmail.com';

    if (!isApprovedDoctor) {
      return NextResponse.json({ success: false, error: 'Forbidden. Doctor authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const { appointmentId, status, completionDate, clinicalNotes, testResultsSummary, doctorSignature } = body;

    if (!appointmentId) {
      return NextResponse.json({ success: false, error: 'Missing appointmentId' }, { status: 400 });
    }

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

    // 📡 Kafka Producer: Produce doctor queue dispatch event
    await kafkaService.produce('doctor-queue-events', {
      action: `Doctor updated appointment ${appointmentId} to status '${status}'`,
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      status,
      timestamp: new Date().toISOString(),
    }, 'doctor');

    // ⚡ Invalidate Redis Cache
    await redisCache.clearPattern('appointments:*');

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error('Update appointment error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

