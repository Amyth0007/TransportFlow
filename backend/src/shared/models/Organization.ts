import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  orgType: 'gas' | 'school' | 'corporate' | 'generic';
  createdAt: Date;
  isActive: boolean;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    orgType: {
      type: String,
      enum: ['gas', 'school', 'corporate', 'generic'],
      required: true,
    },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Organization = model<IOrganization>(
  'Organization',
  organizationSchema
);
