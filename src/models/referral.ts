import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReferral extends Document {
  patientId: string;
  patientName: string;
  patientEmail: string;
  fromDoctorId: string;
  fromDoctorName: string;
  fromDoctorEmail: string;
  toDoctorId: string;
  toDoctorName: string;
  toDoctorEmail: string;
  toDepartment: string;
  reason: string;
  clinicalNotes?: string;
  status: 'pending' | 'accepted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, default: 'Patient' },
    patientEmail: { type: String, default: '' },
    fromDoctorId: { type: String, required: true, index: true },
    fromDoctorName: { type: String, required: true },
    fromDoctorEmail: { type: String, required: true },
    toDoctorId: { type: String, required: true, index: true },
    toDoctorName: { type: String, required: true },
    toDoctorEmail: { type: String, required: true },
    toDepartment: { type: String, default: 'General Medicine' },
    reason: { type: String, required: true },
    clinicalNotes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'completed'], default: 'pending' },
  },
  { timestamps: true }
);

export const ReferralModel: Model<IReferral> =
  mongoose.models.Referral || mongoose.model<IReferral>('Referral', referralSchema);
