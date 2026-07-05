import { Request, Response } from 'express';
import * as authService from './auth.service';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: 'Phone number is required' });
    return;
  }

  try {
    const otp = await authService.sendOtp(phone);
    // Return success message. In production, we don't return the OTP in the JSON response,
    // but in development we can output it or just rely on the server logs. Let's return it
    // in dev for easy API testing if wanted, or just rely on console logs. Let's stick to
    // logging it to the console as requested, and return standard response.
    res.json({ message: 'OTP sent successfully' });
  } catch (error: any) {
    if (error.message === 'Driver not found or inactive') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    res.status(400).json({ error: 'Phone number and OTP are required' });
    return;
  }

  try {
    const result = await authService.verifyOtp(phone, otp);
    res.json({ data: result });
  } catch (error: any) {
    if (
      error.message === 'Invalid OTP' ||
      error.message === 'OTP has expired' ||
      error.message === 'No OTP request found for this phone number'
    ) {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Driver not found or inactive') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
}
