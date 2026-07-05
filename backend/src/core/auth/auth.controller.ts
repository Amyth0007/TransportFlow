import { Request, Response } from 'express';
import * as authService from './auth.service';

export async function loginDriver(req: Request, res: Response): Promise<void> {
  const { phone, password } = req.body as { phone?: string; password?: string };

  if (!phone || !password) {
    res.status(400).json({ error: 'Phone number and password are required' });
    return;
  }

  try {
    const result = await authService.loginDriver(phone, password);
    res.json({ data: result });
  } catch (error: any) {
    if (error.message === 'Invalid phone number or password') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'Driver organization not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}
