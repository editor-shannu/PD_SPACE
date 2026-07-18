import { model, Schema } from 'mongoose';
import { User } from '@/types/documents';

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const UserModel = model<User>('User', userSchema);
