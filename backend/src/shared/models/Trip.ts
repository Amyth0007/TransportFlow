import { Schema, model, Document, Types } from 'mongoose';

export interface ILastKnownLocation {
  lat: number;
  lng: number;
  updatedAt: Date;
}

export interface ITrip extends Document {
  organizationId: Types.ObjectId;
  routeId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  driverId: Types.ObjectId;
  status: 'scheduled' | 'in_progress' | 'completed';
  publicTrackingToken: string;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  lastKnownLocation: ILastKnownLocation | null;
  createdAt: Date;
}

const lastKnownLocationSchema = new Schema<ILastKnownLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const tripSchema = new Schema<ITrip>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    routeId: { type: Schema.Types.ObjectId, required: true, ref: 'Route' },
    vehicleId: { type: Schema.Types.ObjectId, required: true, ref: 'Vehicle' },
    driverId: { type: Schema.Types.ObjectId, required: true, ref: 'Driver' },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed'],
      required: true,
      default: 'scheduled',
    },
    publicTrackingToken: { type: String, required: true, unique: true },
    scheduledAt: { type: Date, required: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    lastKnownLocation: { type: lastKnownLocationSchema, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Trip = model<ITrip>('Trip', tripSchema);
