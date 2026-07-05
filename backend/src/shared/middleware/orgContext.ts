import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  organizationId: string;
  orgType: string;
  role: 'super_admin' | 'org_admin' | 'manager' | 'driver';
}

/**
 * Verifies the Bearer JWT and attaches `req.user`.
 * Returns 401 if the token is missing, malformed, or expired.
 * Apply this before `attachOrgContext` on all protected routes.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET ?? 'fallback-secret-for-dev';

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      orgType: payload.orgType,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Phase 1 — attaches `req.org` from the verified JWT payload.
 *
 * Phase 0 read PHASE0_ORG_ID from env. Now it reads from req.user,
 * which requireAuth already validated. Zero controller code changes —
 * every controller still reads req.org.organizationId identically.
 *
 * super_admin tokens have no organizationId (they span all orgs).
 * Routes that need org-scoping must not be accessible to super_admin
 * directly — use requireSuperAdmin instead of this middleware for those.
 */
export function attachOrgContext(req: Request, _res: Response, next: NextFunction): void {
  req.org = { organizationId: req.user.organizationId };
  next();
}
