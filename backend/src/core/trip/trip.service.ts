import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { Trip, Route, Vehicle, Driver } from '../../shared/models';
import { getIO } from '../../shared/io';

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
  currentStopIndex: number;
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

/** Read-only view for the public tracking page — includes route/vehicle/driver display fields. */
export interface PublicTripView {
  _id: Types.ObjectId;
  status: TripDoc['status'];
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  lastKnownLocation: TripDoc['lastKnownLocation'];
  currentStopIndex: number;
  route: {
    name: string;
    stops: { order: number; label: string; lat: number; lng: number }[];
    roadPath: { lat: number; lng: number }[] | null;
  };
  vehicle: { vehicleNumber: string };
  driver: { name: string };
}

export async function getPublicTripView(token: string): Promise<PublicTripView | null> {
  const trip = await Trip.findOne({ publicTrackingToken: token }).lean<TripDoc>();
  if (!trip) return null;

  const [route, vehicle, driver] = await Promise.all([
    Route.findById(trip.routeId).lean(),
    Vehicle.findById(trip.vehicleId).lean(),
    Driver.findById(trip.driverId).lean(),
  ]);

  if (!route || !vehicle || !driver) return null;

  return {
    _id: trip._id,
    status: trip.status,
    scheduledAt: trip.scheduledAt,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    lastKnownLocation: trip.lastKnownLocation,
    currentStopIndex: trip.currentStopIndex ?? 0,
    route: {
      name: route.name,
      stops: route.stops,
      roadPath: route.roadPath ?? null,
    },
    vehicle: { vehicleNumber: vehicle.vehicleNumber },
    driver: { name: driver.name },
  };
}

export interface TripActor {
  role: string;
  userId: string;
}

function assertDriverOwnsTrip(trip: TripDoc, actor?: TripActor): void {
  if (!actor || actor.role !== 'driver') return;
  if (trip.driverId.toString() !== actor.userId) {
    throw Object.assign(new Error('Trip is not assigned to this driver'), { status: 403 });
  }
}

/** Driver home: assigned open trips plus recently completed ones, with route/vehicle. */
export interface DriverTripView {
  _id: Types.ObjectId;
  status: TripDoc['status'];
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  lastKnownLocation: TripDoc['lastKnownLocation'];
  currentStopIndex: number;
  route: {
    _id: Types.ObjectId;
    name: string;
    stops: { order: number; label: string; lat: number; lng: number }[];
    roadPath: { lat: number; lng: number }[] | null;
  };
  vehicle: { vehicleNumber: string };
}

export async function listMyTrips(
  organizationId: string,
  driverId: string
): Promise<DriverTripView[]> {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const trips = await Trip.find({
    organizationId,
    driverId,
    $or: [
      { status: { $in: ['scheduled', 'in_progress'] } },
      { status: 'completed', endedAt: { $gte: since } },
    ],
  }).lean<TripDoc[]>();

  const routeIds = [...new Set(trips.map((t) => t.routeId.toString()))];
  const vehicleIds = [...new Set(trips.map((t) => t.vehicleId.toString()))];

  const [routes, vehicles] = await Promise.all([
    Route.find({ _id: { $in: routeIds }, organizationId }).lean(),
    Vehicle.find({ _id: { $in: vehicleIds }, organizationId }).lean(),
  ]);

  const routeById = new Map(routes.map((r) => [r._id.toString(), r]));
  const vehicleById = new Map(vehicles.map((v) => [v._id.toString(), v]));

  const views: DriverTripView[] = [];
  for (const trip of trips) {
    const route = routeById.get(trip.routeId.toString());
    const vehicle = vehicleById.get(trip.vehicleId.toString());
    if (!route || !vehicle) continue;
    views.push({
      _id: trip._id,
      status: trip.status,
      scheduledAt: trip.scheduledAt,
      startedAt: trip.startedAt,
      endedAt: trip.endedAt,
      lastKnownLocation: trip.lastKnownLocation,
      currentStopIndex: trip.currentStopIndex ?? 0,
      route: {
        _id: route._id,
        name: route.name,
        stops: route.stops,
        roadPath: route.roadPath ?? null,
      },
      vehicle: { vehicleNumber: vehicle.vehicleNumber },
    });
  }

  const rank = (s: TripDoc['status']) =>
    s === 'in_progress' ? 0 : s === 'scheduled' ? 1 : 2;

  views.sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    if (a.status === 'scheduled') {
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    }
    return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
  });

  return views;
}

export async function getMyTrip(
  organizationId: string,
  tripId: string,
  driverId: string
): Promise<DriverTripView | null> {
  if (!Types.ObjectId.isValid(tripId)) return null;
  const trip = await Trip.findOne({ _id: tripId, organizationId, driverId }).lean<TripDoc>();
  if (!trip) return null;

  const [route, vehicle] = await Promise.all([
    Route.findById(trip.routeId).lean(),
    Vehicle.findById(trip.vehicleId).lean(),
  ]);
  if (!route || !vehicle) return null;

  return {
    _id: trip._id,
    status: trip.status,
    scheduledAt: trip.scheduledAt,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    lastKnownLocation: trip.lastKnownLocation,
    currentStopIndex: trip.currentStopIndex ?? 0,
    route: {
      _id: route._id,
      name: route.name,
      stops: route.stops,
      roadPath: route.roadPath ?? null,
    },
    vehicle: { vehicleNumber: vehicle.vehicleNumber },
  };
}

/** List all trips belonging to the given organization, newest first. */
export async function listTrips(organizationId: string): Promise<TripDoc[]> {
  return Trip.find({ organizationId }).sort({ createdAt: -1 }).lean<TripDoc[]>();
}

/** Get a single trip by id, scoped to the organization. */
export async function getTrip(
  organizationId: string,
  tripId: string,
  actor?: TripActor
): Promise<TripDoc | null> {
  if (!Types.ObjectId.isValid(tripId)) return null;
  const trip = await Trip.findOne({ _id: tripId, organizationId }).lean<TripDoc>();
  if (!trip) return null;
  assertDriverOwnsTrip(trip, actor);
  return trip;
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

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    throw Object.assign(new Error('scheduledAt must be a valid date and time'), { status: 400 });
  }

  const doc = await Trip.create({
    organizationId,
    routeId,
    vehicleId,
    driverId,
    scheduledAt: when,
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
  tripId: string,
  actor?: TripActor
): Promise<TripDoc> {
  if (!Types.ObjectId.isValid(tripId)) {
    throw Object.assign(new Error('Trip not found'), { status: 404 });
  }

  const trip = await Trip.findOne({ _id: tripId, organizationId }).lean<TripDoc>();
  if (!trip) throw Object.assign(new Error('Trip not found'), { status: 404 });
  assertDriverOwnsTrip(trip, actor);

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

  getIO()?.to(`trip_${tripId}`).emit('trip:status_changed', { tripId, status: 'in_progress' });

  return updated!;
}

/**
 * End a trip — only allowed when status is "in_progress".
 * Throws with status 409 if scheduled or already completed.
 * Throws with status 404 if not found.
 */
export async function endTrip(
  organizationId: string,
  tripId: string,
  actor?: TripActor
): Promise<TripDoc> {
  if (!Types.ObjectId.isValid(tripId)) {
    throw Object.assign(new Error('Trip not found'), { status: 404 });
  }

  const trip = await Trip.findOne({ _id: tripId, organizationId }).lean<TripDoc>();
  if (!trip) throw Object.assign(new Error('Trip not found'), { status: 404 });
  assertDriverOwnsTrip(trip, actor);

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

  getIO()?.to(`trip_${tripId}`).emit('trip:status_changed', { tripId, status: 'completed' });

  return updated!;
}
