import { Router } from 'express';
import * as controller from './vehicle.controller';

const router = Router();

router.get('/', controller.listVehicles);
router.get('/:id', controller.getVehicle);
router.post('/', controller.createVehicle);
router.patch('/:id', controller.updateVehicle);
router.delete('/:id', controller.deactivateVehicle);  // soft-delete (sets status=inactive)

export { router as vehicleRouter };
