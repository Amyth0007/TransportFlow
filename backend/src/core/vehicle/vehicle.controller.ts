import { Request, Response } from 'express';
import * as vehicleService from './vehicle.service';
import type { VehicleDoc } from './vehicle.service';

// organizationId is read from req.org.organizationId, set by the
// attachOrgContext middleware. In Phase 0 that middleware reads from
// PHASE0_ORG_ID env var; in Phase 1 it decodes the JWT instead.
// Nothing in this file changes when that swap happens.

export async function listVehicles(req: Request, res: Response): Promise<void> {
  const vehicles: VehicleDoc[] = await vehicleService.listVehicles(req.org.organizationId);
  res.json({ data: vehicles });
}

export async function getVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await vehicleService.getVehicle(req.org.organizationId, req.params.id);
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json({ data: vehicle });
}

export async function createVehicle(req: Request, res: Response): Promise<void> {
  const { vehicleNumber, type, capacity, status } = req.body as {
    vehicleNumber?: string;
    type?: string;
    capacity?: number | null;
    status?: VehicleDoc['status'];
  };

  if (!vehicleNumber || !type) {
    res.status(400).json({ error: 'vehicleNumber and type are required' });
    return;
  }

  const vehicle = await vehicleService.createVehicle(req.org.organizationId, {
    vehicleNumber,
    type,
    capacity,
    status,
  });
  res.status(201).json({ data: vehicle });
}

export async function updateVehicle(req: Request, res: Response): Promise<void> {
  const { vehicleNumber, type, capacity, status } = req.body as {
    vehicleNumber?: string;
    type?: string;
    capacity?: number | null;
    status?: VehicleDoc['status'];
  };

  const vehicle = await vehicleService.updateVehicle(req.org.organizationId, req.params.id, {
    vehicleNumber,
    type,
    capacity,
    status,
  });

  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json({ data: vehicle });
}

export async function deactivateVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await vehicleService.deactivateVehicle(req.org.organizationId, req.params.id);
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json({ data: vehicle });
}
