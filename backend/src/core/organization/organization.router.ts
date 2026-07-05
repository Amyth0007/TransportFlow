import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/orgContext';
import { requireSuperAdmin } from '../../shared/middleware/requireSuperAdmin';
import * as controller from './organization.controller';

const router = Router();

// All org management routes require a valid super_admin JWT
router.use(requireAuth, requireSuperAdmin);

router.get('/', controller.listOrgs);
router.post('/', controller.createOrg);
router.patch('/:id/disable', controller.disableOrg);

export { router as organizationRouter };
