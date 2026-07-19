import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAlert extends Document {
  patientId: string;
  type: 'duplicate' | 'conflict' | 'missed_followup';
  severity: 'low' | 'medium' | 'high';
  message: string;
  related_medication_or_document_id?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    patientId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['duplicate', 'conflict', 'missed_followup'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    message: { type: String, required: true },
    related_medication_or_document_id: { type: String, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AlertModel: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', alertSchema, 'alerts');
