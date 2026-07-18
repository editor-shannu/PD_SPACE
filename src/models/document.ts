import { model, Schema, models } from 'mongoose';
import { Document as IDocument, ExtractedData } from '@/types/documents';

const medicationSchema = new Schema(
  {
    name: { type: String, required: true },
    dosage: { type: String },
    frequency: { type: String },
  },
  { _id: false }
);

const extractedDataSchema = new Schema(
  {
    document_type: {
      type: String,
      enum: ['prescription', 'diagnostic_report', 'discharge_summary', 'other'],
      required: true,
    },
    doctor_name: String,
    date: Date,
    diagnosis: String,
    medications: [medicationSchema],
    follow_up_date: Date,
    notes: String,
  },
  { _id: false }
);

const documentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    fileUrl: String,
    fileType: { type: String, enum: ['image', 'pdf'], required: true },
    rawText: { type: String, required: true },
    extractedData: { type: extractedDataSchema, required: true },
    isConfirmed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DocumentModel = models.Document || model<IDocument>('Document', documentSchema);
