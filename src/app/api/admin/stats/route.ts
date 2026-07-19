import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';
import { DocumentModel } from '@/models/document';
import { AppointmentModel } from '@/models/appointment';

// Helper to generate seed data if needed
async function seedDataIfNeeded() {
  return;
  const patientCount = await UserModel.countDocuments({ role: 'patient' });
  const docCount = await DocumentModel.countDocuments();
  const appointmentCount = await AppointmentModel.countDocuments();

  // If there is already substantial data, no need to seed
  if (patientCount >= 5 && docCount >= 15 && appointmentCount >= 15) {
    console.log('[DEBUG] DB already has enough data. Skipping seed.');
    return;
  }

  console.log('[DEBUG] Seeding database with rich demo data for admin analytics...');

  // 1. Create Patient Users
  const mockPatients = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', role: 'patient' },
    { name: 'Ananya Reddy', email: 'ananya.reddy@example.com', role: 'patient' },
    { name: 'Rahul Verma', email: 'rahul.verma@example.com', role: 'patient' },
    { name: 'Sneha Patel', email: 'sneha.patel@example.com', role: 'patient' },
    { name: 'Vikram Malhotra', email: 'vikram.malhotra@example.com', role: 'patient' },
    { name: 'Kavita Rao', email: 'kavita.rao@example.com', role: 'patient' },
  ];

  const patients = [];
  for (const mp of mockPatients) {
    let u = await UserModel.findOne({ email: mp.email });
    if (!u) {
      u = new UserModel(mp);
      await u.save();
    }
    patients.push(u);
  }

  // Clear previous demo records if they exist to avoid bloated duplicates
  // only delete documents / appointments associated with mock patients
  const patientIds = patients.map(p => p._id.toString());
  await DocumentModel.deleteMany({ userId: { $in: patientIds } });
  await AppointmentModel.deleteMany({ patientId: { $in: patientIds } });

  const now = new Date();

  // Departments list
  const depts = ['Cardiology', 'Pediatrics', 'Oncology', 'Orthopedics', 'General Medicine', 'Neurology', 'Dermatology', 'Gastroenterology'];
  const doctors: Record<string, string[]> = {
    Cardiology: ['Dr. Sarah Jenkins', 'Dr. Robert Chen'],
    Pediatrics: ['Dr. Emily Taylor', 'Dr. Marcus Vance'],
    Oncology: ['Dr. Allison Vance', 'Dr. David Kim'],
    Orthopedics: ['Dr. Arthur Pendelton', 'Dr. James Smith'],
    'General Medicine': ['Dr. Amit Patel', 'Dr. Jessica Alba'],
    Neurology: ['Dr. Charles Xavier', 'Dr. Bruce Banner'],
    Dermatology: ['Dr. Diana Prince', 'Dr. Clark Kent'],
    Gastroenterology: ['Dr. Tony Stark', 'Dr. Pepper Potts']
  };

  // Helper for generating dates relative to now
  const daysAgo = (num: number) => {
    const d = new Date();
    d.setDate(now.getDate() - num);
    return d;
  };

  const daysAhead = (num: number) => {
    const d = new Date();
    d.setDate(now.getDate() + num);
    return d;
  };

  // 2. Generate detailed histories for patients
  // Patient 0: Aarav Sharma (Highly compliant)
  // First consultation: 80 days ago (General Medicine)
  // Follow-up set for 66 days ago. Completed on-time (65 days ago) via Orthopedics.
  // Follow-up set for 35 days ago. Completed on-time (36 days ago) via Orthopedics.
  // Upcoming appointment: 5 days ahead.
  const aaravId = patients[0]._id.toString();
  await new DocumentModel({
    userId: aaravId,
    fileName: 'prescription_first.pdf',
    fileType: 'pdf',
    rawText: 'Prescription Aarav Sharma. Diagnosis: Knee Pain. Doctor: Dr. Amit Patel.',
    isConfirmed: true,
    createdAt: daysAgo(80),
    extractedData: {
      document_type: 'prescription',
      doctor_name: 'Dr. Amit Patel',
      date: daysAgo(80),
      diagnosis: 'Knee Pain',
      medications: [{ name: 'Ibuprofen', dosage: '400mg', frequency: 'Twice daily' }],
      follow_up_date: daysAgo(66),
      notes: 'Follow up in 2 weeks.'
    }
  }).save();

  await new AppointmentModel({
    patientId: aaravId,
    doctorName: 'Dr. James Smith',
    department: 'Orthopedics',
    date: daysAgo(65).toISOString().split('T')[0],
    time: '10:00 AM',
    status: 'confirmed',
    urgency: 'routine',
    createdAt: daysAgo(68)
  }).save();

  await new DocumentModel({
    userId: aaravId,
    fileName: 'lab_report_knee.pdf',
    fileType: 'pdf',
    rawText: 'MRI Knee Joint. Cartilage wear detected.',
    isConfirmed: true,
    createdAt: daysAgo(65),
    extractedData: {
      document_type: 'diagnostic_report',
      doctor_name: 'Dr. James Smith',
      date: daysAgo(65),
      diagnosis: 'Mild Osteoarthritis',
      medications: [],
      follow_up_date: daysAgo(35),
      notes: 'Recommended physical therapy.'
    }
  }).save();

  await new AppointmentModel({
    patientId: aaravId,
    doctorName: 'Dr. James Smith',
    department: 'Orthopedics',
    date: daysAgo(36).toISOString().split('T')[0],
    time: '11:30 AM',
    status: 'confirmed',
    urgency: 'routine',
    createdAt: daysAgo(38)
  }).save();

  await new DocumentModel({
    userId: aaravId,
    fileName: 'discharge_summary.pdf',
    fileType: 'pdf',
    rawText: 'Discharge Summary. Condition resolved with therapy.',
    isConfirmed: true,
    createdAt: daysAgo(36),
    extractedData: {
      document_type: 'discharge_summary',
      doctor_name: 'Dr. James Smith',
      date: daysAgo(36),
      diagnosis: 'Osteoarthritis Resolved',
      medications: [],
      notes: 'Discharged.'
    }
  }).save();

  await new AppointmentModel({
    patientId: aaravId,
    doctorName: 'Dr. James Smith',
    department: 'Orthopedics',
    date: daysAhead(5).toISOString().split('T')[0],
    time: '02:00 PM',
    status: 'pending',
    urgency: 'routine',
    createdAt: daysAgo(1)
  }).save();


  // Patient 1: Ananya Reddy (Missed follow-up)
  // First consultation: 45 days ago (Cardiology)
  // Follow-up set for 30 days ago. Not completed (no records after).
  const ananyaId = patients[1]._id.toString();
  await new DocumentModel({
    userId: ananyaId,
    fileName: 'cardiac_report.pdf',
    fileType: 'pdf',
    rawText: 'ECG report. Mild sinus tachycardia.',
    isConfirmed: true,
    createdAt: daysAgo(45),
    extractedData: {
      document_type: 'diagnostic_report',
      doctor_name: 'Dr. Sarah Jenkins',
      date: daysAgo(45),
      diagnosis: 'Sinus Tachycardia',
      medications: [{ name: 'Metoprolol', dosage: '25mg', frequency: 'Once daily' }],
      follow_up_date: daysAgo(30),
      notes: 'Repeat ECG in 15 days.'
    }
  }).save();

  await new AppointmentModel({
    patientId: ananyaId,
    doctorName: 'Dr. Sarah Jenkins',
    department: 'Cardiology',
    date: daysAgo(45).toISOString().split('T')[0],
    time: '09:00 AM',
    status: 'confirmed',
    urgency: 'soon',
    createdAt: daysAgo(46)
  }).save();


  // Patient 2: Rahul Verma (Completed follow-up LATE, meaning not on time)
  // First consultation: 60 days ago (Pediatrics)
  // Follow up set for 45 days ago. Completed 20 days ago (25 days late).
  const rahulId = patients[2]._id.toString();
  await new DocumentModel({
    userId: rahulId,
    fileName: 'pediatric_prescription.pdf',
    fileType: 'pdf',
    rawText: 'Child fever prescription.',
    isConfirmed: true,
    createdAt: daysAgo(60),
    extractedData: {
      document_type: 'prescription',
      doctor_name: 'Dr. Emily Taylor',
      date: daysAgo(60),
      diagnosis: 'Acute Tonsillitis',
      medications: [{ name: 'Amoxicillin', dosage: '250mg', frequency: 'Three times daily' }],
      follow_up_date: daysAgo(45),
      notes: 'Check back in 15 days.'
    }
  }).save();

  await new AppointmentModel({
    patientId: rahulId,
    doctorName: 'Dr. Emily Taylor',
    department: 'Pediatrics',
    date: daysAgo(20).toISOString().split('T')[0],
    time: '03:15 PM',
    status: 'confirmed',
    urgency: 'routine',
    createdAt: daysAgo(22)
  }).save();


  // Patient 3: Sneha Patel (Highly compliant)
  // First consultation: 30 days ago (Dermatology)
  // Follow up set for 15 days ago. Completed on-time (14 days ago).
  const snehaId = patients[3]._id.toString();
  await new DocumentModel({
    userId: snehaId,
    fileName: 'skin_prescription.pdf',
    fileType: 'pdf',
    rawText: 'Eczema treatment.',
    isConfirmed: true,
    createdAt: daysAgo(30),
    extractedData: {
      document_type: 'prescription',
      doctor_name: 'Dr. Diana Prince',
      date: daysAgo(30),
      diagnosis: 'Eczema',
      medications: [{ name: 'Hydrocortisone cream', dosage: '1%', frequency: 'Apply twice daily' }],
      follow_up_date: daysAgo(15),
      notes: 'Review in 2 weeks.'
    }
  }).save();

  await new AppointmentModel({
    patientId: snehaId,
    doctorName: 'Dr. Diana Prince',
    department: 'Dermatology',
    date: daysAgo(14).toISOString().split('T')[0],
    time: '11:00 AM',
    status: 'confirmed',
    urgency: 'routine',
    createdAt: daysAgo(16)
  }).save();

  await new DocumentModel({
    userId: snehaId,
    fileName: 'dermatology_discharge.pdf',
    fileType: 'pdf',
    rawText: 'Skin cleared. Eczema resolved.',
    isConfirmed: true,
    createdAt: daysAgo(14),
    extractedData: {
      document_type: 'discharge_summary',
      doctor_name: 'Dr. Diana Prince',
      date: daysAgo(14),
      diagnosis: 'Eczema Resolved',
      medications: [],
      notes: 'Discharged.'
    }
  }).save();


  // Patient 4: Vikram Malhotra (Missed follow-up)
  // First consultation: 20 days ago (Neurology)
  // Follow up set for 5 days ago. Not completed.
  const vikramId = patients[4]._id.toString();
  await new DocumentModel({
    userId: vikramId,
    fileName: 'migraine_plan.pdf',
    fileType: 'pdf',
    rawText: 'Migraine management plan.',
    isConfirmed: true,
    createdAt: daysAgo(20),
    extractedData: {
      document_type: 'prescription',
      doctor_name: 'Dr. Charles Xavier',
      date: daysAgo(20),
      diagnosis: 'Chronic Migraine',
      medications: [{ name: 'Sumatriptan', dosage: '50mg', frequency: 'As needed' }],
      follow_up_date: daysAgo(5),
      notes: 'Follow up if symptoms persist.'
    }
  }).save();


  // Patient 5: Kavita Rao (Upcoming follow-up)
  // First consultation: 10 days ago (Gastroenterology)
  // Follow up set for 10 days ahead (upcoming, so it doesn't count as missed or completed yet).
  const kavitaId = patients[5]._id.toString();
  await new DocumentModel({
    userId: kavitaId,
    fileName: 'gastro_report.pdf',
    fileType: 'pdf',
    rawText: 'Acid reflux assessment.',
    isConfirmed: true,
    createdAt: daysAgo(10),
    extractedData: {
      document_type: 'prescription',
      doctor_name: 'Dr. Tony Stark',
      date: daysAgo(10),
      diagnosis: 'Acid Reflux',
      medications: [{ name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast' }],
      follow_up_date: daysAhead(10),
      notes: 'Follow up in 20 days.'
    }
  }).save();

  // 3. Seed some random additional appointments for other departments to build good bottleneck metrics
  // We'll create random appointments linked to our patients
  const randomDepts = ['Cardiology', 'Pediatrics', 'Oncology', 'Orthopedics', 'General Medicine', 'Neurology', 'Dermatology', 'Gastroenterology'];
  let patientIdx = 0;
  for (let i = 0; i < 20; i++) {
    const dept = randomDepts[i % randomDepts.length];
    const docList = doctors[dept];
    const doc = docList[i % docList.length];
    const pId = patients[patientIdx % patients.length]._id.toString();
    patientIdx++;

    await new AppointmentModel({
      patientId: pId,
      doctorName: doc,
      department: dept,
      date: daysAgo(15 + i).toISOString().split('T')[0],
      time: '10:30 AM',
      status: i % 5 === 0 ? 'cancelled' : 'confirmed',
      urgency: i % 3 === 0 ? 'urgent' : i % 2 === 0 ? 'soon' : 'routine',
      createdAt: daysAgo(30)
    }).save();
  }

  console.log('[DEBUG] Seeding finished successfully!');
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Check role and email to ensure safety
    const email = session.user.email?.toLowerCase().trim();
    const dbUser = await UserModel.findOne({ email });
    if (!dbUser || dbUser.role !== 'admin' || email !== 'heallink.care@gmail.com') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }



    // 2. Fetch all data for calculations
    const allUsers = await UserModel.find().lean();
    const allDocs = await DocumentModel.find().lean();
    const allApps = await AppointmentModel.find().lean();

    const now = new Date();

    // Missed Follow-up Calculation:
    // Definition: Follow-up date was in the past (< now), and patient has no records (new document or confirmed appointment)
    // created after follow_up_date.
    let totalPastFollowups = 0;
    let missedFollowups = 0;
    let completedOnTime = 0;

    allDocs.forEach((doc) => {
      if (doc.extractedData?.follow_up_date) {
        const followUpDate = new Date(doc.extractedData.follow_up_date);
        if (followUpDate < now) {
          totalPastFollowups++;

          const patientId = doc.userId;
          const docCreatedAt = doc.createdAt ? new Date(doc.createdAt) : new Date();

          // Check if patient has any document or confirmed appointment after follow_up_date
          const hasPostFollowUpDoc = allDocs.some(
            (d) => d.userId === patientId && d.createdAt && new Date(d.createdAt) > followUpDate && d._id?.toString() !== doc._id?.toString()
          );

          const hasPostFollowUpApp = allApps.some(
            (a) => a.patientId === patientId && a.status === 'confirmed' && new Date(a.date) > followUpDate
          );

          const isCompleted = hasPostFollowUpDoc || hasPostFollowUpApp;

          if (!isCompleted) {
            missedFollowups++;
          }

          // Compliance check (Completed on time):
          // Subsequent document or appointment created in window: [followUpDate - 3 days, followUpDate + 7 days]
          const threeDaysBefore = new Date(followUpDate.getTime() - 3 * 24 * 60 * 60 * 1000);
          const sevenDaysAfter = new Date(followUpDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          const completedOnTimeDoc = allDocs.some(
            (d) =>
              d.userId === patientId &&
              d.createdAt &&
              new Date(d.createdAt) >= threeDaysBefore &&
              new Date(d.createdAt) <= sevenDaysAfter &&
              d._id?.toString() !== doc._id?.toString()
          );

          const completedOnTimeApp = allApps.some(
            (a) =>
              a.patientId === patientId &&
              a.status === 'confirmed' &&
              new Date(a.date) >= threeDaysBefore &&
              new Date(a.date) <= sevenDaysAfter
          );

          if (completedOnTimeDoc || completedOnTimeApp) {
            completedOnTime++;
          }
        }
      }
    });

    const missedRate = totalPastFollowups > 0 ? (missedFollowups / totalPastFollowups) * 100 : 0;
    const complianceScore = totalPastFollowups > 0 ? (completedOnTime / totalPastFollowups) * 100 : 0;

    // Appointment Bottlenecks: department-wise appointment volume
    const deptVolume: Record<string, number> = {};
    allApps.forEach((app) => {
      if (app.department) {
        deptVolume[app.department] = (deptVolume[app.department] || 0) + 1;
      }
    });

    const bottlenecks = Object.keys(deptVolume).map((dept) => ({
      department: dept,
      appointments: deptVolume[dept]
    })).sort((a, b) => b.appointments - a.appointments);

    // Average Treatment Timeline:
    // Difference between a patient's first document/appointment date and their latest case document/appointment date
    const patientTimelines: Record<string, Date[]> = {};

    allDocs.forEach((doc) => {
      const pId = doc.userId;
      const date = doc.createdAt ? new Date(doc.createdAt) : new Date();
      if (!patientTimelines[pId]) patientTimelines[pId] = [];
      patientTimelines[pId].push(date);
    });

    allApps.forEach((app) => {
      const pId = app.patientId;
      const date = new Date(app.date);
      if (!isNaN(date.getTime())) {
        if (!patientTimelines[pId]) patientTimelines[pId] = [];
        patientTimelines[pId].push(date);
      }
    });

    let totalTimelineDays = 0;
    let patientCountWithTimeline = 0;

    Object.keys(patientTimelines).forEach((pId) => {
      const dates = patientTimelines[pId].sort((a, b) => a.getTime() - b.getTime());
      if (dates.length >= 2) {
        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        const diffDays = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 0) {
          totalTimelineDays += diffDays;
          patientCountWithTimeline++;
        }
      }
    });

    const avgTimeline = patientCountWithTimeline > 0 ? totalTimelineDays / patientCountWithTimeline : 0;

    // 3. Generate Insight using Gemini API
    let geminiInsight = '';
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      const prompt = `You are a clinical operations analyst at a hospital.
Analyze the following aggregated metrics for our hospital:
- Missed Follow-up Rate: ${missedRate.toFixed(1)}% (Target: < 15%)
- Patient Follow-up On-Time Compliance: ${complianceScore.toFixed(1)}% (Target: > 80%)
- Average Patient Treatment Timeline: ${avgTimeline.toFixed(1)} days
- Department Appointment Bottlenecks (Volume): ${JSON.stringify(bottlenecks)}

Provide a single, short paragraph (strictly under 75 words) summarizing operational performance. Highlight the primary department bottleneck and patient compliance concerns, offering a direct clinical workflow solution. Do not include markdown bolding, lists, titles, or code blocks.`;

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let geminiResponse: Response | null = null;
      let lastError: any = null;

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: prompt,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.3,
                  topK: 1,
                  topP: 1,
                  maxOutputTokens: 150,
                },
              }),
            }
          );

          if (response.ok) {
            geminiResponse = response;
            break;
          } else {
            lastError = await response.json().catch(() => ({}));
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (geminiResponse) {
        const geminiData = await geminiResponse.json();
        geminiInsight = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        geminiInsight = geminiInsight.trim();
        // Clean markdown block tags if LLM wraps it
        if (geminiInsight.startsWith('```')) {
          geminiInsight = geminiInsight.replace(/^```(text|json)?/, '').replace(/```$/, '').trim();
        }
      } else {
        console.warn('Gemini analytics insight failed:', lastError);
        geminiInsight = 'Operational data indicates consistent patient flow. Monitor compliance rates and focus on enhancing patient communication to reduce missed follow-ups.';
      }
    } else {
      geminiInsight = 'Operational data indicates consistent patient flow. Monitor compliance rates and focus on enhancing patient communication to reduce missed follow-ups.';
    }

    return NextResponse.json({
      success: true,
      stats: {
        missedFollowupRate: missedRate,
        patientComplianceScore: complianceScore,
        averageTreatmentTimeline: avgTimeline,
        bottlenecks,
        geminiInsight,
        totalPatients: allUsers.filter(u => u.role === 'patient').length,
        totalDocuments: allDocs.length,
        totalAppointments: allApps.length
      }
    });

  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
