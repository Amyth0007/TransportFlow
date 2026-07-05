import { Schema, model, Document, Types } from 'mongoose';

export interface IDriver extends Document {
  organizationId: Types.ObjectId;
  name: string;
  phone: string;
  passwordHash: string;
  licenseNumber: string;
  status: 'active' | 'inactive';
  assignedVehicleId: Types.ObjectId | null;
  createdAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      required: true,
      default: 'active',
    },
    assignedVehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Driver = model<IDriver>('Driver', driverSchema);
