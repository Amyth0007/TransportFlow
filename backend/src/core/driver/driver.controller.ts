import { Request, Response } from 'express';
import * as driverService from './driver.service';
import type { DriverDoc } from './driver.service';

export async function listDrivers(req: Request, res: Response): Promise<void> {
  const drivers = await driverService.listDrivers(req.org.organizationId);
  res.json({ data: drivers });
}

export async function getDriver(req: Request, res: Response): Promise<void> {
  const driver = await driverService.getDriver(req.org.organizationId, req.params.id);
  if (!driver) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }
  res.json({ data: driver });
}

export async function createDriver(req: Request, res: Response): Promise<void> {
  const { name, phone, licenseNumber, status, assignedVehicleId } = req.body as {
    name?: string;
    phone?: string;
    licenseNumber?: string;
    status?: DriverDoc['status'];
    assignedVehicleId?: string | null;
  };

  if (!name || !phone || !licenseNumber) {
    res.status(400).json({ error: 'name, phone, and licenseNumber are required' });
    return;
  }

  try {
    const { driver, tempPassword } = await driverService.createDriver(req.org.organizationId, {
      name,
      phone,
      licenseNumber,
      status,
      assignedVehicleId,
    });
    res.status(201).json({ data: driver, tempPassword });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Phone number already registered' });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

export async function updateDriver(req: Request, res: Response): Promise<void> {
  const { name, phone, licenseNumber, status, assignedVehicleId } = req.body as {
    name?: string;
    phone?: string;
    licenseNumber?: string;
    status?: DriverDoc['status'];
    assignedVehicleId?: string | null;
  };

  try {
    const driver = await driverService.updateDriver(req.org.organizationId, req.params.id, {
      name,
      phone,
      licenseNumber,
      status,
      assignedVehicleId,
    });

    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.json({ data: driver });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ error: 'Phone number already registered' });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

export async function deactivateDriver(req: Request, res: Response): Promise<void> {
  const driver = await driverService.deactivateDriver(req.org.organizationId, req.params.id);
  if (!driver) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }
  res.json({ data: driver });
}
