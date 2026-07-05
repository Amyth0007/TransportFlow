import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
  organizationId: Types.ObjectId;
  vehicleNumber: string;
  type: string;
  capacity: number | null;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    vehicleNumber: { type: String, required: true },
    type: { type: String, required: true },
    capacity: { type: Number, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      required: true,
      default: 'active',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Vehicle = model<IVehicle>('Vehicle', vehicleSchema);
