import { Router } from 'express';
import * as controller from './route.controller';

const router = Router();

router.get('/', controller.listRoutes);
router.get('/:id', controller.getRoute);
router.post('/', controller.createRoute);
router.patch('/:id', controller.updateRoute);
router.delete('/:id', controller.deleteRoute); // hard-delete (routes have no status field)

export { router as routeRouter };
