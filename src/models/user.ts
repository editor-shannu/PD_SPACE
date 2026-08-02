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

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    isEmrCompleted: { type: Boolean, default: false },
    emrProfile: { type: emrProfileSchema },
  },
  { timestamps: true }
);

export const UserModel = models.User || model<User>('User', userSchema);


