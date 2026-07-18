import { model, Schema, models } from 'mongoose';
import { User } from '@/types/documents';

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const UserModel = models.User || model<User>('User', userSchema);
