/**
 * POST /api/doctor/summary
 * Doctor endpoint to fetch patient timeline, medications, alerts and generate AI pre-consultation summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/user';
import { DocumentModel } from '@/models/document';
import { AlertModel } from '@/models/alert';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session?.user || (userRole !== 'doctor' && userRole !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Doctor access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const patientId = body.patientId;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: 'patientId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Fetch Patient profile
    const patientUser: any = await UserModel.findById(patientId).select('name email role').lean().catch(() => null);

    // 2. Fetch full medical history timeline
    const timeline = await DocumentModel.find({ userId: patientId })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Aggregate active medications
    const medicationsSet = new Map<string, { name: string; dosage?: string; frequency?: string }>();
    timeline.forEach((doc) => {
      const meds = doc.extractedData?.medications;
      if (Array.isArray(meds)) {
        meds.forEach((m: any) => {
          if (m && m.name) {
            const key = m.name.trim().toLowerCase();
            if (!medicationsSet.has(key)) {
              medicationsSet.set(key, {
                name: m.name,
                dosage: m.dosage || undefined,
                frequency: m.frequency || undefined,
              });
            }
          }
        });
      }
    });
    const activeMedications = Array.from(medicationsSet.values());

    // 4. Fetch active alerts from Module A
    const alerts = await AlertModel.find({ patientId }).sort({ createdAt: -1 }).lean();

    // 5. Generate AI pre-consultation summary with Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    let aiSummary = '';

    if (apiKey) {
      const prompt = `You are a clinical AI assistant generating a concise 4-5 line plain-English pre-consultation summary for an attending physician prior to seeing the patient.

Patient Details:
- Name/ID: ${patientUser?.name || patientId}
- Total Medical Documents: ${timeline.length}

Active Medications:
${activeMedications.length > 0 ? JSON.stringify(activeMedications, null, 2) : 'No active medications recorded.'}

Active Clinical Safety Alerts (Module A Engine):
${alerts.length > 0 ? JSON.stringify(alerts, null, 2) : 'No active safety alerts.'}

Recent Timeline Entries (Diagnoses & Notes):
${timeline
  .slice(0, 5)
  .map(
    (d) =>
      `- [${d.createdAt?.toISOString().split('T')[0] || 'Date Unknown'}] Type: ${d.extractedData?.document_type || 'Record'}, Diagnosis: ${
        d.extractedData?.diagnosis || 'N/A'
      }, Notes: ${d.extractedData?.notes || 'None'}`
  )
  .join('\n')}

INSTRUCTIONS:
1. Provide a clear, 4 to 5 line plain-English pre-consultation summary tailored for a doctor.
2. You MUST explicitly call out and highlight any drug duplicate, drug conflict, or missed follow-up alerts present in the alerts list.
3. Keep the text professional, concise, and structured for fast clinical reading. Do not use Markdown header blocks (# or ##), output plain readable paragraphs.`;

      const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro'];

      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              aiSummary = text.trim();
              break;
            }
          }
        } catch (err) {
          console.warn(`Gemini call for doctor summary failed on model ${model}:`, err);
        }
      }
    }

    // Fallback summary if Gemini API is not available or returned empty
    if (!aiSummary) {
      const alertSummary = alerts.length > 0
        ? `Patient has ${alerts.length} active safety alert(s): ${alerts.map((a) => `${a.type.toUpperCase()} (${a.severity})`).join(', ')}.`
        : 'No active clinical safety alerts flagged.';

      const medSummary = activeMedications.length > 0
        ? `Currently prescribed ${activeMedications.length} active medication(s): ${activeMedications.map((m) => m.name).join(', ')}.`
        : 'No active medications on record.';

      const docSummary = timeline.length > 0
        ? `Medical history includes ${timeline.length} document(s) with primary diagnosis: ${timeline[0]?.extractedData?.diagnosis || 'Not specified'}.`
        : 'No uploaded medical documents in history timeline.';

      aiSummary = `Patient pre-consultation brief for ${patientUser?.name || patientId}:\n1. ${docSummary}\n2. ${medSummary}\n3. ${alertSummary}\n4. Please verify current prescription compliance and address any flagged follow-up dates before proceeding.`;
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patientId,
        name: patientUser?.name || `Patient (${patientId.substring(0, 8)})`,
        email: patientUser?.email || '',
      },
      summary: aiSummary,
      medications: activeMedications,
      alerts,
      timeline,
    });
  } catch (error) {
    console.error('Doctor summary generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate doctor pre-consultation summary' },
      { status: 500 }
    );
  }
}
