/**
 * Augments the Express Request type with `req.org` and `req.user`.
 *
 * `req.org` shape is intentionally unchanged from Phase 0 — every
 * controller that reads `req.org.organizationId` continues to work.
 *
 * `req.user` is set by `requireAuth` middleware and carries the full
 * JWT payload for use in auth guards (e.g. `requireSuperAdmin`).
 */
declare namespace Express {
  interface Request {
    org: {
      organizationId: string;
    };
    user: {
      userId: string;
      organizationId: string;
      orgType: string;
      role: 'super_admin' | 'org_admin' | 'manager' | 'driver';
    };
  }
}
