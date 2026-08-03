import { model, Schema, models } from 'mongoose';

export interface IHospital {
  _id?: string;
  hospitalId: string; // Unique generated ID e.g. HOSP-98241
  name: string;
  address: string;
  phone: string;
  contactEmail: string;
  applicantGoogleEmail: string;
  reasonToJoin: string;
  bedCapacity?: string;
  specialties?: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  credentials: {
    hospitalAdminId: string;
    hospitalAdminEmail: string;
    passwordHash?: string;
    rawTempPassword?: string;
  };
  appliedAt: Date;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    hospitalId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    applicantGoogleEmail: { type: String, required: true, lowercase: true, index: true },
    reasonToJoin: { type: String, required: true },
    bedCapacity: { type: String, default: '50+' },
    specialties: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
    credentials: {
      hospitalAdminId: { type: String, required: true },
      hospitalAdminEmail: { type: String, required: true },
      passwordHash: { type: String },
      rawTempPassword: { type: String },
    },
    appliedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export const HospitalModel = models.Hospital || model<IHospital>('Hospital', hospitalSchema);
