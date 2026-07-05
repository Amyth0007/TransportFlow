import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Organization, User } from '../../shared/models';

export interface OrgDoc {
  _id: Types.ObjectId;
  name: string;
  orgType: 'gas' | 'school' | 'corporate' | 'generic';
  isActive: boolean;
  createdAt: Date;
}

export interface OrgAdminDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
}

export interface CreateOrgInput {
  name: string;
  orgType: OrgDoc['orgType'];
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Create a new organization and its first Org Admin in one call.
 * Returns both so the Super Admin panel can display the new admin's
 * credentials immediately.
 */
export async function createOrg(
  input: CreateOrgInput
): Promise<{ org: OrgDoc; admin: OrgAdminDoc }> {
  const existing = await User.findOne({ email: input.adminEmail }).lean();
  if (existing) {
    throw Object.assign(new Error('A user with that email already exists'), { status: 409 });
  }

  const org = await Organization.create({
    name: input.name,
    orgType: input.orgType,
    isActive: true,
  });

  const passwordHash = await bcrypt.hash(input.adminPassword, 10);
  const admin = await User.create({
    organizationId: org._id,
    name: input.adminName,
    email: input.adminEmail,
    passwordHash,
    role: 'org_admin',
  });

  return {
    org: org.toObject<OrgDoc>(),
    admin: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

/** List all organizations, newest first. */
export async function listOrgs(): Promise<OrgDoc[]> {
  return Organization.find().sort({ createdAt: -1 }).lean<OrgDoc[]>();
}

/**
 * Disable an organization by setting isActive: false.
 * Returns null if not found.
 */
export async function disableOrg(orgId: string): Promise<OrgDoc | null> {
  if (!Types.ObjectId.isValid(orgId)) return null;
  return Organization.findByIdAndUpdate(
    orgId,
    { $set: { isActive: false } },
    { new: true }
  ).lean<OrgDoc>();
}
