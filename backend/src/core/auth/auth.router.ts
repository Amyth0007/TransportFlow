import { Router } from 'express';
import * as controller from './auth.controller';

const router = Router();

router.post('/driver/login', controller.loginDriver);

export { router as authRouter };
