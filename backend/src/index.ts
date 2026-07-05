import 'dotenv/config';
import express from 'express';
import { connectDB } from './shared/db';
import { vehicleRouter } from './core/vehicle/vehicle.router';

const app = express();
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Core routers ─────────────────────────────────────────────────────────────
app.use('/api/vehicles', vehicleRouter);

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
