import { Request, Response } from 'express';
import * as vehicleService from './vehicle.service';
import type { VehicleDoc } from './vehicle.service';

// ── Phase 0 note ──────────────────────────────────────────────────────────────
// organizationId is read from an env variable rather than from a JWT,
// because Phase 0 is single-org with no auth middleware yet.
// In Phase 1 this becomes: const { organizationId } = req.user;
// and every handler below stays unchanged.
function getOrgId(_req: Request): string {
  const orgId = process.env.PHASE0_ORG_ID ?? '';
  return orgId;
}

export async function listVehicles(req: Request, res: Response): Promise<void> {
  const vehicles: VehicleDoc[] = await vehicleService.listVehicles(getOrgId(req));
  res.json({ data: vehicles });
}

export async function getVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await vehicleService.getVehicle(getOrgId(req), req.params.id);
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

  const vehicle = await vehicleService.createVehicle(getOrgId(req), {
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

  const vehicle = await vehicleService.updateVehicle(getOrgId(req), req.params.id, {
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
  const vehicle = await vehicleService.deactivateVehicle(getOrgId(req), req.params.id);
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json({ data: vehicle });
}
