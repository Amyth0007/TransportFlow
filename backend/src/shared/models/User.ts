import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  organizationId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'org_admin' | 'manager';
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['org_admin', 'manager'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = model<IUser>('User', userSchema);
