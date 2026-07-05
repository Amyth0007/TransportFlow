import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './shared/db';
import { attachOrgContext } from './shared/middleware/orgContext';
import { vehicleRouter } from './core/vehicle/vehicle.router';
import { driverRouter } from './core/driver/driver.router';
import { routeRouter } from './core/route/route.router';
import { tripRouter } from './core/trip/trip.router';
import { authRouter } from './core/auth/auth.router';
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

// ── Org context middleware (applies to all /api routes) ──────────────────────
// Phase 0: reads PHASE0_ORG_ID from env.
// Phase 1: will decode JWT instead. req.org.organizationId shape stays identical.
app.use('/api', attachOrgContext);

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
