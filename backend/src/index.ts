import 'dotenv/config';
import express from 'express';
import { connectDB } from './shared/db';
import { attachOrgContext } from './shared/middleware/orgContext';
import { vehicleRouter } from './core/vehicle/vehicle.router';
import { driverRouter } from './core/driver/driver.router';
import { authRouter } from './core/auth/auth.router';

const app = express();
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Org context middleware (applies to all /api routes) ──────────────────────
// Phase 0: reads PHASE0_ORG_ID from env.
// Phase 1: will decode JWT instead. req.org.organizationId shape stays identical.
app.use('/api', attachOrgContext);

// ── Core routers ─────────────────────────────────────────────────────────────
app.use('/api/vehicles', vehicleRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/auth', authRouter);

const PORT = process.env.PORT ?? 3000;

async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`TransportFlow backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app };
