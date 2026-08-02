import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompletedDetails {
  completionDate?: string;
  clinicalNotes?: string;
  testResultsSummary?: string;
  doctorSignature?: string;
}

export interface IAppointment extends Document {
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorId?: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  urgency: 'routine' | 'soon' | 'urgent';
  completedDetails?: ICompletedDetails;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, default: '' },
    patientEmail: { type: String, default: '' },
    patientPhone: { type: String, default: '' },
    doctorId: { type: String, index: true, default: '' },
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending', required: true },
    urgency: { type: String, enum: ['routine', 'soon', 'urgent'], default: 'routine', required: true },
    completedDetails: {
      completionDate: { type: String, default: '' },
      clinicalNotes: { type: String, default: '' },
      testResultsSummary: { type: String, default: '' },
      doctorSignature: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const AppointmentModel: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);
