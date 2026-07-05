import { Types } from 'mongoose';
import { Route, Trip } from '../../shared/models';

export interface StopDoc {
  order: number;
  label: string;
  lat: number;
  lng: number;
}

export interface RouteDoc {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  stops: StopDoc[];
  createdAt: Date;
}

export interface CreateRouteInput {
  name: string;
  stops: StopDoc[];
}

export interface UpdateRouteInput {
  name?: string;
  stops?: StopDoc[];
}

/** List all routes belonging to the given organization. */
export async function listRoutes(organizationId: string): Promise<RouteDoc[]> {
  const docs = await Route.find({ organizationId })
    .sort({ createdAt: -1 })
    .lean<RouteDoc[]>();
  return docs;
}

/** Get a single route by id, scoped to the organization. */
export async function getRoute(
  organizationId: string,
  routeId: string
): Promise<RouteDoc | null> {
  if (!Types.ObjectId.isValid(routeId)) return null;
  return Route.findOne({ _id: routeId, organizationId }).lean<RouteDoc>();
}

/** Create a new route for the organization. */
export async function createRoute(
  organizationId: string,
  input: CreateRouteInput
): Promise<RouteDoc> {
  // Sort stops by order to ensure chronological pathing integrity
  const sortedStops = [...input.stops].sort((a, b) => a.order - b.order);

  const doc = await Route.create({
    organizationId,
    name: input.name,
    stops: sortedStops,
  });
  return doc.toObject<RouteDoc>();
}

/** Update a route by id, scoped to the organization. Returns null if not found. */
export async function updateRoute(
  organizationId: string,
  routeId: string,
  input: UpdateRouteInput
): Promise<RouteDoc | null> {
  if (!Types.ObjectId.isValid(routeId)) return null;

  const updatePayload: Record<string, any> = {};
  if (input.name !== undefined) {
    updatePayload.name = input.name;
  }
  if (input.stops !== undefined) {
    updatePayload.stops = [...input.stops].sort((a, b) => a.order - b.order);
  }

  return Route.findOneAndUpdate(
    { _id: routeId, organizationId },
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).lean<RouteDoc>();
}

/**
 * Delete a route by id, scoped to the organization.
 * Blocked if any trip referencing this route is currently scheduled or in_progress
 * (completed trips are fine — that's just history).
 * Returns null if the route is not found.
 */
export async function deleteRoute(
  organizationId: string,
  routeId: string
): Promise<RouteDoc | null> {
  if (!Types.ObjectId.isValid(routeId)) return null;

  const activeTrip = await Trip.findOne({
    routeId,
    organizationId,
    status: { $in: ['scheduled', 'in_progress'] },
  }).lean();

  if (activeTrip) {
    throw Object.assign(
      new Error('Cannot delete a route that has scheduled or in-progress trips'),
      { status: 409 }
    );
  }

  return Route.findOneAndDelete({ _id: routeId, organizationId }).lean<RouteDoc>();
}
