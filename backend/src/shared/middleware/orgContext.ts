import { Request, Response, NextFunction } from 'express';

/**
 * Phase 0 — org-context middleware
 *
 * Attaches `req.org` so every downstream controller can read
 * `req.org.organizationId` without knowing *where* it came from.
 *
 * ── Phase 1 migration note ─────────────────────────────────────────────────
 * Replace the body of this function with JWT verification:
 *
 *   const payload = verifyAccessToken(req.headers.authorization);
 *   req.org = { organizationId: payload.organizationId };
 *
 * The shape of `req.org` does NOT change, so every controller that reads
 * `req.org.organizationId` continues to compile and run without edits.
 * ───────────────────────────────────────────────────────────────────────────
 */
export function attachOrgContext(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const orgId = process.env.PHASE0_ORG_ID ?? '';
  req.org = { organizationId: orgId };
  next();
}
