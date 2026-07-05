import { Router } from 'express';
import * as controller from './trip.controller';

const router = Router();

router.get('/', controller.listTrips);
router.get('/:id', controller.getTrip);
router.post('/', controller.createTrip);
router.patch('/:id/start', controller.startTrip);
router.patch('/:id/end', controller.endTrip);

export { router as tripRouter };
