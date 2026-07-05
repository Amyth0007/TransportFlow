import { Router } from 'express';
import * as controller from './driver.controller';

const router = Router();

router.get('/', controller.listDrivers);
router.get('/:id', controller.getDriver);
router.post('/', controller.createDriver);
router.patch('/:id', controller.updateDriver);
router.delete('/:id', controller.deactivateDriver); // soft-delete (sets status=inactive)

export { router as driverRouter };
