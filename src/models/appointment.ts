import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAppointment extends Document {
  patientId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  urgency: 'routine' | 'soon' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending', required: true },
    urgency: { type: String, enum: ['routine', 'soon', 'urgent'], default: 'routine', required: true },
  },
  { timestamps: true }
);

export const AppointmentModel: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);
