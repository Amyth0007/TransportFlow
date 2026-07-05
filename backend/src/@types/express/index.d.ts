/**
 * Augments the Express Request type with `req.org`.
 *
 * Shape is intentionally minimal — only what every controller needs.
 * In Phase 1, when the middleware reads this from the JWT, the payload
 * will contain more fields (role, orgType, etc.) but those additions
 * are backwards-compatible: existing controllers keep working.
 */
declare namespace Express {
  interface Request {
    org: {
      organizationId: string;
    };
  }
}
