/**
 * Seed script — creates one hardcoded Organization and one Org Admin user.
 *
 * Run with: npm run seed
 *
 * The password is stored as a bcrypt hash of "changeme" (cost 10).
 * Change this before any real deployment.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB } from '../shared/db';
import { Organization, User } from '../shared/models';

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
    passwordHash: await bcrypt.hash('changeme', 10),
      role: 'org_admin',
    });
    console.log(`Created user: ${user.email} (${user._id})`);
    console.log('  email:    admin@transportflow.local');
    console.log('  password: changeme  ← change before any real use');
  } else {
    // If the stored hash isn't a bcrypt hash (e.g. old SHA-256 placeholder),
    // re-hash with bcrypt so admin login works.
    const isBcrypt = user.passwordHash.startsWith('$2');
    if (!isBcrypt) {
      user.passwordHash = await bcrypt.hash('changeme', 10);
      await user.save();
      console.log(`Updated user password to bcrypt: ${user.email}`);
    } else {
      console.log(`User already exists: ${user.email} (${user._id})`);
    }
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
