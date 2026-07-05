import { Types } from 'mongoose';
import { Vehicle } from '../../shared/models';

// Plain-object type returned from service functions.
// Using `any` for the _id chain avoids the FlattenMaps<Document> incompatibility
// that Mongoose 8 introduces when .lean() is combined with a Document-extending interface.
export type VehicleDoc = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  vehicleNumber: string;
  type: string;
  capacity: number | null;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
};

export interface CreateVehicleInput {
  vehicleNumber: string;
  type: string;
  capacity?: number | null;
  status?: VehicleDoc['status'];
}

export interface UpdateVehicleInput {
  vehicleNumber?: string;
  type?: string;
  capacity?: number | null;
  status?: VehicleDoc['status'];
}

/** List all vehicles belonging to the given organization. */
export async function listVehicles(organizationId: string): Promise<VehicleDoc[]> {
  const docs = await Vehicle.find({ organizationId })
    .sort({ createdAt: -1 })
    .lean<VehicleDoc[]>();
  return docs;
}

/** Get a single vehicle by id, scoped to the organization. */
export async function getVehicle(
  organizationId: string,
  vehicleId: string
): Promise<VehicleDoc | null> {
  if (!Types.ObjectId.isValid(vehicleId)) return null;
  return Vehicle.findOne({ _id: vehicleId, organizationId }).lean<VehicleDoc>();
}

/** Create a new vehicle for the organization. */
export async function createVehicle(
  organizationId: string,
  input: CreateVehicleInput
): Promise<VehicleDoc> {
  const doc = await Vehicle.create({
    organizationId,
    vehicleNumber: input.vehicleNumber,
    type: input.type,
    capacity: input.capacity ?? null,
    status: input.status ?? 'active',
  });
  return doc.toObject<VehicleDoc>();
}

/** Update a vehicle by id, scoped to the organization. Returns null if not found. */
export async function updateVehicle(
  organizationId: string,
  vehicleId: string,
  input: UpdateVehicleInput
): Promise<VehicleDoc | null> {
  if (!Types.ObjectId.isValid(vehicleId)) return null;
  return Vehicle.findOneAndUpdate(
    { _id: vehicleId, organizationId },
    { $set: input },
    { new: true, runValidators: true }
  ).lean<VehicleDoc>();
}

/**
 * Deactivate a vehicle (set status to 'inactive').
 * Soft-delete: we do not hard-delete vehicles to preserve historical trip references.
 */
export async function deactivateVehicle(
  organizationId: string,
  vehicleId: string
): Promise<VehicleDoc | null> {
  if (!Types.ObjectId.isValid(vehicleId)) return null;
  return Vehicle.findOneAndUpdate(
    { _id: vehicleId, organizationId },
    { $set: { status: 'inactive' } },
    { new: true }
  ).lean<VehicleDoc>();
}
