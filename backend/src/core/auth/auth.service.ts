import jwt from 'jsonwebtoken';
import { Driver, Organization } from '../../shared/models';

// In-memory OTP store: phone -> { otp, expiresAt }
interface OtpEntry {
  otp: string;
  expiresAt: Date;
}

const otpStore = new Map<string, OtpEntry>();

// OTP expiry time (5 minutes)
const OTP_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Generate and store OTP for a driver's phone number.
 * Returns the generated OTP (so the controller can log/use it).
 */
export async function sendOtp(phone: string): Promise<string> {
  // Verify driver exists
  const driver = await Driver.findOne({ phone, status: 'active' });
  if (!driver) {
    throw new Error('Driver not found or inactive');
  }

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  otpStore.set(phone, { otp, expiresAt });

  // Console log the OTP for Phase 0
  console.log(`\n=== [OTP SERVICE] ===\nOTP for driver phone ${phone}: ${otp}\n=====================\n`);

  return otp;
}

interface LoginResponse {
  token: string;
  driver: {
    _id: string;
    name: string;
    phone: string;
    licenseNumber: string;
  };
}

/**
 * Verify OTP and return a JWT access token.
 */
export async function verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
  const entry = otpStore.get(phone);
  if (!entry) {
    throw new Error('No OTP request found for this phone number');
  }

  if (entry.expiresAt.getTime() < Date.now()) {
    otpStore.delete(phone);
    throw new Error('OTP has expired');
  }

  if (entry.otp !== otp) {
    throw new Error('Invalid OTP');
  }

  // OTP is valid, clear it
  otpStore.delete(phone);

  // Retrieve driver and their organization details for JWT payload
  const driver = await Driver.findOne({ phone, status: 'active' });
  if (!driver) {
    throw new Error('Driver not found or inactive');
  }

  const org = await Organization.findById(driver.organizationId);
  if (!org) {
    throw new Error('Driver organization not found');
  }

  // Generate JWT payload matching docs/DATA-MODELS.md
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = {
    userId: driver._id.toString(),
    organizationId: driver.organizationId.toString(),
    orgType: org.orgType,
    role: 'driver',
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

  return {
    token,
    driver: {
      _id: driver._id.toString(),
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
    },
  };
}
