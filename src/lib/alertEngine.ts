import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/document';
import { AppointmentModel } from '@/models/appointment';
import { AlertModel } from '@/models/alert';

interface RawAlert {
  type: 'duplicate' | 'conflict' | 'missed_followup';
  severity: 'low' | 'medium' | 'high';
  message: string;
  related_medication_or_document_id?: string;
}

/**
  * Calls Gemini API to analyze a list of active medications for duplicate drugs and conflicts.
  */
async function analyzeMedicationsWithGemini(
  medications: Array<{ name: string; dosage?: string; frequency?: string; documentId?: string }>
): Promise<RawAlert[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || medications.length === 0) {
    return [];
  }

  const prompt = `You are a clinical pharmacy AI. Analyze the following patient medication list to detect duplicate medications and possible drug-drug conflicts or dangerous interactions.

Medication List:
${JSON.stringify(medications, null, 2)}

Provide your assessment in plain-language reasoning. You MUST return ONLY a raw JSON object (no markdown, no backticks, no markdown codeblocks) matching this schema:
{
  "alerts": [
    {
      "type": "duplicate" | "conflict",
      "severity": "low" | "medium" | "high",
      "message": "Plain language reasoning explaining the duplicate medication or conflict",
      "related_medication_or_document_id": "Medication name or document ID related to this alert"
    }
  ]
}

If no duplicates or conflicts are found, return: { "alerts": [] }`;

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) continue;

      const cleanedText = textResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      const parsed = JSON.parse(cleanedText);
      if (parsed && Array.isArray(parsed.alerts)) {
        return parsed.alerts.map((a: any) => ({
          type: (['duplicate', 'conflict', 'missed_followup'].includes(a.type) ? a.type : 'conflict') as any,
          severity: (['low', 'medium', 'high'].includes(a.severity) ? a.severity : 'medium') as any,
          message: String(a.message || 'Potential medication issue identified.'),
          related_medication_or_document_id: a.related_medication_or_document_id ? String(a.related_medication_or_document_id) : undefined,
        }));
      }
    } catch (err) {
      console.warn(`Gemini model ${model} call failed:`, err);
    }
  }

  // Local fallback rule-based duplicate detection if Gemini API fails or is unavailable
  const fallbackAlerts: RawAlert[] = [];
  const seenNames = new Map<string, string>();

  medications.forEach((med) => {
    const normName = med.name.trim().toLowerCase();
    if (seenNames.has(normName)) {
      fallbackAlerts.push({
        type: 'duplicate',
        severity: 'medium',
        message: `Duplicate medication detected: "${med.name}" appears in multiple prescription records.`,
        related_medication_or_document_id: med.name,
      });
    } else {
      seenNames.set(normName, med.documentId || med.name);
    }
  });

  return fallbackAlerts;
}

/**
  * Checks follow_up_date fields for a patient against current date.
  * Generates "missed_followup" alerts if follow-up date has passed with no linked consultation record.
  */
export async function checkMissedFollowupsForPatient(patientId: string): Promise<RawAlert[]> {
  await connectDB();
  const documents = await DocumentModel.find({ userId: patientId }).lean();
  const appointments = await AppointmentModel.find({ patientId, status: { $ne: 'cancelled' } }).lean();

  const generatedAlerts: RawAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const doc of documents) {
    const followUpDateRaw = doc.extractedData?.follow_up_date;
    if (!followUpDateRaw) continue;

    const followUpDate = new Date(followUpDateRaw);
    followUpDate.setHours(0, 0, 0, 0);

    // If follow-up date is in the past
    if (followUpDate < today) {
      // Check if there is any appointment scheduled on or after follow_up_date
      const hasConsultation = appointments.some((apt) => {
        if (!apt.date) return false;
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= followUpDate;
      });

      if (!hasConsultation) {
        const formattedDate = followUpDate.toISOString().split('T')[0];
        const alert: RawAlert = {
          type: 'missed_followup',
          severity: 'high',
          message: `Missed follow-up scheduled for ${formattedDate}. No linked consultation record found.`,
          related_medication_or_document_id: (doc as any)._id?.toString(),
        };

        generatedAlerts.push(alert);

        // Save to DB if not already present
        const existing = await AlertModel.findOne({
          patientId,
          type: 'missed_followup',
          related_medication_or_document_id: (doc as any)._id?.toString(),
        });

        if (!existing) {
          await AlertModel.create({
            patientId,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            related_medication_or_document_id: alert.related_medication_or_document_id,
          });
        }
      }
    }
  }

  return generatedAlerts;
}

/**
  * Main background engine function triggered when a new Document is saved for a patient.
  */
export async function generateAlertsForPatient(patientId: string, newDocumentId?: string): Promise<void> {
  await connectDB();

  // 1. Fetch all documents for patient
  const documents = await DocumentModel.find({ userId: patientId }).lean();

  // 2. Fetch all active medications across patient documents
  const activeMedications: Array<{ name: string; dosage?: string; frequency?: string; documentId?: string }> = [];

  documents.forEach((doc) => {
    const docId = (doc as any)._id?.toString();
    const meds = doc.extractedData?.medications;
    if (Array.isArray(meds)) {
      meds.forEach((m: any) => {
        if (m && m.name) {
          activeMedications.push({
            name: String(m.name),
            dosage: m.dosage ? String(m.dosage) : undefined,
            frequency: m.frequency ? String(m.frequency) : undefined,
            documentId: docId,
          });
        }
      });
    }
  });

  // 3. Send medication list to Gemini API for duplicate/conflict detection
  if (activeMedications.length > 0) {
    const geminiAlerts = await analyzeMedicationsWithGemini(activeMedications);

    for (const rawAlert of geminiAlerts) {
      // Save or update alert in MongoDB
      const existing = await AlertModel.findOne({
        patientId,
        type: rawAlert.type,
        message: rawAlert.message,
      });

      if (!existing) {
        await AlertModel.create({
          patientId,
          type: rawAlert.type,
          severity: rawAlert.severity,
          message: rawAlert.message,
          related_medication_or_document_id: rawAlert.related_medication_or_document_id || newDocumentId,
        });
      }
    }
  }

  // 4. Run missed follow-up check
  await checkMissedFollowupsForPatient(patientId);
}

/**
  * Scheduled daily check for all patients with missed follow-up dates.
  */
export async function checkAllMissedFollowups(): Promise<void> {
  await connectDB();
  const distinctPatientIds = await DocumentModel.distinct('userId');
  for (const patientId of distinctPatientIds) {
    if (typeof patientId === 'string' && patientId) {
      try {
        await checkMissedFollowupsForPatient(patientId);
      } catch (err) {
        console.error(`Error in missed follow-up check for patient ${patientId}:`, err);
      }
    }
  }
}
