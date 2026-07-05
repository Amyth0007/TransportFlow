import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Driver, Organization, User } from '../../shared/models';

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
 * Log in a driver using phone and password.
 * Returns a JWT access token if successful.
 */
export async function loginDriver(phone: string, password: string): Promise<LoginResponse> {
  // Find active driver by phone
  const driver = await Driver.findOne({ phone, status: 'active' });
  if (!driver) {
    throw new Error('Invalid phone number or password');
  }

  // Verify password using bcrypt
  const isMatch = await bcrypt.compare(password, driver.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid phone number or password');
  }

  // Find organization to get orgType for JWT payload
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

interface AdminLoginResponse {
  token: string;
  user: { _id: string; name: string; email: string; role: string };
}

/**
 * Log in an org admin using email and password.
 * Returns a JWT access token if successful.
 */
export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error('Invalid email or password');

  const org = await Organization.findById(user.organizationId);
  if (!org) throw new Error('Organization not found');

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
  const payload = {
    userId: user._id.toString(),
    organizationId: user.organizationId.toString(),
    orgType: org.orgType,
    role: user.role,
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

  return {
    token,
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
