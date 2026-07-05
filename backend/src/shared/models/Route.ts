import { Schema, model, Document, Types } from 'mongoose';

export interface IStop {
  order: number;
  label: string;
  lat: number;
  lng: number;
}

export interface IRoute extends Document {
  organizationId: Types.ObjectId;
  name: string;
  stops: IStop[];
  createdAt: Date;
}

const stopSchema = new Schema<IStop>(
  {
    order: { type: Number, required: true },
    label: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const routeSchema = new Schema<IRoute>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    name: { type: String, required: true },
    stops: { type: [stopSchema], required: true, default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Route = model<IRoute>('Route', routeSchema);
