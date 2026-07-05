import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { Trip, Route, Vehicle, Driver } from '../../shared/models';

export interface TripDoc {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  routeId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  driverId: Types.ObjectId;
  status: 'scheduled' | 'in_progress' | 'completed';
  publicTrackingToken: string;
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  lastKnownLocation: { lat: number; lng: number; updatedAt: Date } | null;
  createdAt: Date;
}

export interface CreateTripInput {
  routeId: string;
  vehicleId: string;
  driverId: string;
  scheduledAt: string | Date;
}

/** Get a single trip by its publicTrackingToken — no org scope needed (token is unguessable UUID). */
export async function getTripByToken(token: string): Promise<TripDoc | null> {
  return Trip.findOne({ publicTrackingToken: token }).lean<TripDoc>();
}

/** List all trips belonging to the given organization, newest first. */
export async function listTrips(organizationId: string): Promise<TripDoc[]> {
  return Trip.find({ organizationId }).sort({ createdAt: -1 }).lean<TripDoc[]>();
}

/** Get a single trip by id, scoped to the organization. */
export async function getTrip(
  organizationId: string,
  tripId: string
): Promise<TripDoc | null> {
  if (!Types.ObjectId.isValid(tripId)) return null;
  return Trip.findOne({ _id: tripId, organizationId }).lean<TripDoc>();
}

/**
 * Create a new trip.
 * Validates that routeId, vehicleId, and driverId all exist and belong to
 * the same organization before inserting. Throws a descriptive error if any
 * reference is invalid.
 */
export async function createTrip(
  organizationId: string,
  input: CreateTripInput
): Promise<TripDoc> {
  const { routeId, vehicleId, driverId, scheduledAt } = input;

  if (
    !Types.ObjectId.isValid(routeId) ||
    !Types.ObjectId.isValid(vehicleId) ||
    !Types.ObjectId.isValid(driverId)
  ) {
    throw Object.assign(new Error('Invalid routeId, vehicleId, or driverId'), { status: 400 });
  }

  const [route, vehicle, driver] = await Promise.all([
    Route.findOne({ _id: routeId, organizationId }).lean(),
    Vehicle.findOne({ _id: vehicleId, organizationId }).lean(),
    Driver.findOne({ _id: driverId, organizationId }).lean(),
  ]);

  if (!route) throw Object.assign(new Error('Route not found in this organization'), { status: 404 });
  if (!vehicle) throw Object.assign(new Error('Vehicle not found in this organization'), { status: 404 });
  if (!driver) throw Object.assign(new Error('Driver not found in this organization'), { status: 404 });

  const doc = await Trip.create({
    organizationId,
    routeId,
    vehicleId,
    driverId,
    scheduledAt: new Date(scheduledAt),
    publicTrackingToken: randomUUID(),
  });

  return doc.toObject<TripDoc>();
}

/**
 * Start a trip — only allowed when status is "scheduled".
 * Throws with status 409 if already in_progress or completed.
 * Throws with status 404 if not found.
 */
export async function startTrip(
  organizationId: string,
  tripId: string
): Promise<TripDoc> {
  if (!Types.ObjectId.isValid(tripId)) {
    throw Object.assign(new Error('Trip not found'), { status: 404 });
  }

  const trip = await Trip.findOne({ _id: tripId, organizationId }).lean<TripDoc>();
  if (!trip) throw Object.assign(new Error('Trip not found'), { status: 404 });

  if (trip.status === 'in_progress') {
    throw Object.assign(new Error('Trip is already in progress'), { status: 409 });
  }
  if (trip.status === 'completed') {
    throw Object.assign(new Error('Trip has already been completed'), { status: 409 });
  }

  const updated = await Trip.findByIdAndUpdate(
    tripId,
    { $set: { status: 'in_progress', startedAt: new Date() } },
    { new: true }
  ).lean<TripDoc>();

  return updated!;
}

/**
 * End a trip — only allowed when status is "in_progress".
 * Throws with status 409 if scheduled or already completed.
 * Throws with status 404 if not found.
 */
export async function endTrip(
  organizationId: string,
  tripId: string
): Promise<TripDoc> {
  if (!Types.ObjectId.isValid(tripId)) {
    throw Object.assign(new Error('Trip not found'), { status: 404 });
  }

  const trip = await Trip.findOne({ _id: tripId, organizationId }).lean<TripDoc>();
  if (!trip) throw Object.assign(new Error('Trip not found'), { status: 404 });

  if (trip.status === 'scheduled') {
    throw Object.assign(new Error('Trip has not been started yet'), { status: 409 });
  }
  if (trip.status === 'completed') {
    throw Object.assign(new Error('Trip has already been completed'), { status: 409 });
  }

  const updated = await Trip.findByIdAndUpdate(
    tripId,
    { $set: { status: 'completed', endedAt: new Date() } },
    { new: true }
  ).lean<TripDoc>();

  return updated!;
}
