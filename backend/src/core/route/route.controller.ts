import { Request, Response } from 'express';
import * as routeService from './route.service';
import type { RouteDoc, StopDoc } from './route.service';

export async function listRoutes(req: Request, res: Response): Promise<void> {
  const routes: RouteDoc[] = await routeService.listRoutes(req.org.organizationId);
  res.json({ data: routes });
}

export async function getRoute(req: Request, res: Response): Promise<void> {
  const route = await routeService.getRoute(req.org.organizationId, req.params.id);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json({ data: route });
}

export async function createRoute(req: Request, res: Response): Promise<void> {
  const { name, stops } = req.body as { name?: string; stops?: StopDoc[] };

  if (!name || !Array.isArray(stops) || stops.length === 0) {
    res.status(400).json({ error: 'name and at least one stop are required' });
    return;
  }

  const route = await routeService.createRoute(req.org.organizationId, { name, stops });
  res.status(201).json({ data: route });
}

export async function updateRoute(req: Request, res: Response): Promise<void> {
  const { name, stops } = req.body as { name?: string; stops?: StopDoc[] };

  const route = await routeService.updateRoute(req.org.organizationId, req.params.id, {
    name,
    stops,
  });

  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json({ data: route });
}

export async function deleteRoute(req: Request, res: Response): Promise<void> {
  const route = await routeService.deleteRoute(req.org.organizationId, req.params.id);
  if (!route) {
    res.status(404).json({ error: 'Route not found' });
    return;
  }
  res.json({ data: route });
}
