import { model, Schema, models } from 'mongoose';
import { User } from '@/types/documents';

const emrProfileSchema = new Schema(
  {
    fullName: { type: String, required: true },
    dob: { type: String },
    age: { type: Number },
    gender: { type: String },
    phone: { type: String },
    bloodGroup: { type: String },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    emergencyRelation: { type: String },
    preExistingConditions: { type: String },
    allergies: { type: String },
    currentMedications: { type: String },
    height: { type: String },
    weight: { type: String },
    address: { type: String },
  },
  { _id: false, timestamps: true }
);

const doctorProfileSchema = new Schema(
  {
    department: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    experienceYears: { type: String },
    hospitalAffiliation: { type: String },
    hospitalId: { type: String },
    doctorJoinType: { type: String, enum: ['individual', 'hospital'], default: 'individual' },
    phone: { type: String },
    qualifications: { type: String },
    appliedAt: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: true }
);

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String },
    role: { type: String, enum: ['patient', 'doctor', 'admin', 'hospital_admin'], default: 'patient' },
    hospitalId: { type: String },
    hospitalName: { type: String },
    isEmrCompleted: { type: Boolean, default: false },
    emrProfile: { type: emrProfileSchema },
    doctorApplicationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    doctorProfile: { type: doctorProfileSchema },
    doctorRejectedAt: { type: Date },
    doctorRejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const UserModel = models.User || model<User>('User', userSchema);


