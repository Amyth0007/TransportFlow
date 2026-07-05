import { Types } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Driver } from '../../shared/models';

export type DriverDoc = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  phone: string;
  passwordHash: string;
  licenseNumber: string;
  status: 'active' | 'inactive';
  assignedVehicleId: Types.ObjectId | null;
  createdAt: Date;
};

export interface CreateDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
  status?: DriverDoc['status'];
  assignedVehicleId?: string | null;
}

export interface UpdateDriverInput {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  status?: DriverDoc['status'];
  assignedVehicleId?: string | null;
}

/** List all drivers belonging to the given organization. */
export async function listDrivers(organizationId: string): Promise<DriverDoc[]> {
  const docs = await Driver.find({ organizationId })
    .sort({ createdAt: -1 })
    .lean<DriverDoc[]>();
  return docs;
}

/** Get a single driver by id, scoped to the organization. */
export async function getDriver(
  organizationId: string,
  driverId: string
): Promise<DriverDoc | null> {
  if (!Types.ObjectId.isValid(driverId)) return null;
  return Driver.findOne({ _id: driverId, organizationId }).lean<DriverDoc>();
}

/** 
 * Create a new driver for the organization.
 * Generates a random temporary password, hashes it using bcrypt, and returns
 * the plaintext password alongside the saved Driver document.
 */
export async function createDriver(
  organizationId: string,
  input: CreateDriverInput
): Promise<{ driver: DriverDoc; tempPassword: string }> {
  const assignedVehicleId = input.assignedVehicleId && Types.ObjectId.isValid(input.assignedVehicleId)
    ? new Types.ObjectId(input.assignedVehicleId)
    : null;

  // Generate a random 8-character alphanumeric password
  const tempPassword = crypto.randomBytes(4).toString('hex');
  
  // Hash the password using bcrypt (rounds = 10)
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const doc = await Driver.create({
    organizationId,
    name: input.name,
    phone: input.phone,
    passwordHash,
    licenseNumber: input.licenseNumber,
    status: input.status ?? 'active',
    assignedVehicleId,
  });

  return {
    driver: doc.toObject<DriverDoc>(),
    tempPassword,
  };
}

/** Update a driver by id, scoped to the organization. Returns null if not found. */
export async function updateDriver(
  organizationId: string,
  driverId: string,
  input: UpdateDriverInput
): Promise<DriverDoc | null> {
  if (!Types.ObjectId.isValid(driverId)) return null;

  const updatePayload: Record<string, any> = { ...input };
  if (input.assignedVehicleId !== undefined) {
    updatePayload.assignedVehicleId = input.assignedVehicleId && Types.ObjectId.isValid(input.assignedVehicleId)
      ? new Types.ObjectId(input.assignedVehicleId)
      : null;
  }

  return Driver.findOneAndUpdate(
    { _id: driverId, organizationId },
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).lean<DriverDoc>();
}

/**
 * Deactivate a driver (sets status to 'inactive').
 * Soft-delete: we do not hard-delete drivers to preserve historical references.
 */
export async function deactivateDriver(
  organizationId: string,
  driverId: string
): Promise<DriverDoc | null> {
  if (!Types.ObjectId.isValid(driverId)) return null;
  return Driver.findOneAndUpdate(
    { _id: driverId, organizationId },
    { $set: { status: 'inactive' } },
    { new: true }
  ).lean<DriverDoc>();
}
