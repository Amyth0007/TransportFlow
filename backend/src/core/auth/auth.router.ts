import { Router } from 'express';
import * as controller from './auth.controller';

const router = Router();

router.post('/driver/otp/send', controller.requestOtp);
router.post('/driver/otp/verify', controller.verifyOtp);

export { router as authRouter };
