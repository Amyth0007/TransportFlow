import { Router } from 'express';
import * as controller from './auth.controller';

const router = Router();

router.post('/driver/login', controller.loginDriver);
router.post('/admin/login', controller.loginAdmin);

export { router as authRouter };
