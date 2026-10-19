import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './shared/db';
import { attachOrgContext, requireAuth, requireOrgScoped } from './shared/middleware/orgContext';
import { vehicleRouter } from './core/vehicle/vehicle.router';
import { driverRouter } from './core/driver/driver.router';
import { routeRouter } from './core/route/route.router';
import { tripRouter } from './core/trip/trip.router';
import { authRouter } from './core/auth/auth.router';
import { organizationRouter } from './core/organization/organization.router';
import { registerTrackingHandlers } from './core/tracking/tracking.handler';
import { getTripByToken } from './core/trip/trip.controller';
import { setIO } from './shared/io';

const app = express();
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Public endpoints (no auth, no org context) ───────────────────────────────
app.get('/api/public/trips/:token', getTripByToken);

// ── Super Admin endpoints (own auth inside the router) ───────────────────────
app.use('/api/admin/orgs', organizationRouter);

// ── Auth middleware (all /api routes except /api/auth/* and /api/public/*) ──
// requireAuth verifies the JWT and sets req.user.
// attachOrgContext reads req.user.organizationId into req.org.
// Controllers never change — they still read req.org.organizationId.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/public/') || req.path.startsWith('/admin/')) {
    return next();
  }
  requireAuth(req, res, () =>
    attachOrgContext(req, res, () => requireOrgScoped(req, res, next))
  );
});

// ── Core routers ─────────────────────────────────────────────────────────────
app.use('/api/vehicles', vehicleRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/routes', routeRouter);
app.use('/api/trips', tripRouter);
app.use('/api/auth', authRouter);

const PORT = process.env.PORT ?? 3000;

async function start(): Promise<void> {
  await connectDB();

  const httpServer = http.createServer(app);

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  // Single instance, no Redis adapter (see docs/DECISIONS.md).
  // CORS origin is open for Phase 0; lock down in Phase 1 when web/mobile
  // origins are known.
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    registerTrackingHandlers(io, socket);
  });

  setIO(io);

  httpServer.listen(PORT, () => {
    console.log(`TransportFlow backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app };
