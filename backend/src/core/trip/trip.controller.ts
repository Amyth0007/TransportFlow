import { Request, Response } from 'express';
import * as tripService from './trip.service';
import type { CreateTripInput } from './trip.service';

function handleServiceError(res: Response, error: any): void {
  const status = error.status ?? 500;
  res.status(status).json({ error: error.message ?? 'Internal server error' });
}

/** Public — no auth required. Returns trip + route/vehicle/driver display data for live tracking. */
export async function getTripByToken(req: Request, res: Response): Promise<void> {
  const view = await tripService.getPublicTripView(req.params.token);
  if (!view) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ data: view });
}

export async function listMyTrips(req: Request, res: Response): Promise<void> {
  if (req.user.role !== 'driver') {
    res.status(403).json({ error: 'Only drivers can list assigned trips' });
    return;
  }
  const trips = await tripService.listMyTrips(req.org.organizationId, req.user.userId);
  res.json({ data: trips });
}

export async function getMyTrip(req: Request, res: Response): Promise<void> {
  if (req.user.role !== 'driver') {
    res.status(403).json({ error: 'Only drivers can load an assigned trip' });
    return;
  }
  const trip = await tripService.getMyTrip(
    req.org.organizationId,
    req.params.id,
    req.user.userId
  );
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ data: trip });
}

export async function listTrips(req: Request, res: Response): Promise<void> {
  if (req.user.role === 'driver') {
    res.status(403).json({ error: 'Drivers must use GET /api/trips/my' });
    return;
  }
  const trips = await tripService.listTrips(req.org.organizationId);
  res.json({ data: trips });
}

export async function getTrip(req: Request, res: Response): Promise<void> {
  try {
    const trip = await tripService.getTrip(req.org.organizationId, req.params.id, {
      role: req.user.role,
      userId: req.user.userId,
    });
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json({ data: trip });
  } catch (error: any) {
    handleServiceError(res, error);
  }
}

export async function createTrip(req: Request, res: Response): Promise<void> {
  if (req.user.role === 'driver') {
    res.status(403).json({ error: 'Drivers cannot create trips' });
    return;
  }
  const { routeId, vehicleId, driverId, scheduledAt } = req.body as Partial<CreateTripInput>;

  if (!routeId || !vehicleId || !driverId || !scheduledAt) {
    res.status(400).json({ error: 'routeId, vehicleId, driverId, and scheduledAt are required' });
    return;
  }

  try {
    const trip = await tripService.createTrip(req.org.organizationId, {
      routeId,
      vehicleId,
      driverId,
      scheduledAt,
    });
    res.status(201).json({ data: trip });
  } catch (error: any) {
    handleServiceError(res, error);
  }
}

export async function startTrip(req: Request, res: Response): Promise<void> {
  try {
    const trip = await tripService.startTrip(req.org.organizationId, req.params.id, {
      role: req.user.role,
      userId: req.user.userId,
    });
    res.json({ data: trip });
  } catch (error: any) {
    handleServiceError(res, error);
  }
}

export async function endTrip(req: Request, res: Response): Promise<void> {
  try {
    const trip = await tripService.endTrip(req.org.organizationId, req.params.id, {
      role: req.user.role,
      userId: req.user.userId,
    });
    res.json({ data: trip });
  } catch (error: any) {
    handleServiceError(res, error);
  }
}
