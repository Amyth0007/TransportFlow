import { Request, Response, NextFunction } from 'express';

/**
 * Rejects any request whose JWT role is not "super_admin".
 * Must be applied after requireAuth (which sets req.user).
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Super Admin access required' });
    return;
  }
  next();
}
