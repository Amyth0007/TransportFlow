/**
 * Seed script — creates one hardcoded Organization and one Org Admin user.
 *
 * Run with: npm run seed
 *
 * The password is stored as a plain bcrypt hash of "changeme" (cost 10).
 * Change this before any real deployment.
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '../shared/db';
import { Organization, User } from '../shared/models';

// Simple SHA-256 stand-in for Phase 0 — replace with bcrypt when auth is built.
// Using a deterministic hash so re-running the seed is idempotent and doesn't
// require bcrypt at the scaffold stage.
function hashPassword(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

async function seed(): Promise<void> {
  await connectDB();

  // ── Organization ──────────────────────────────────────────────────────────
  let org = await Organization.findOne({ name: 'TransportFlow Demo Org' });
  if (!org) {
    org = await Organization.create({
      name: 'TransportFlow Demo Org',
      orgType: 'generic',
      isActive: true,
    });
    console.log(`Created organization: ${org.name} (${org._id})`);
  } else {
    console.log(`Organization already exists: ${org.name} (${org._id})`);
  }

  // ── Org Admin user ────────────────────────────────────────────────────────
  const adminEmail = 'admin@transportflow.local';
  let user = await User.findOne({ email: adminEmail });
  if (!user) {
    user = await User.create({
      organizationId: org._id,
      name: 'Demo Admin',
      email: adminEmail,
      passwordHash: hashPassword('changeme'),
      role: 'org_admin',
    });
    console.log(`Created user: ${user.email} (${user._id})`);
    console.log('  email:    admin@transportflow.local');
    console.log('  password: changeme  ← change before any real use');
  } else {
    console.log(`User already exists: ${user.email} (${user._id})`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
