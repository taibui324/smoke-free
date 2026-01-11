import { Router } from 'express';
import { cravingController } from '../controllers/craving.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All craving routes require authentication
router.post('/', authenticate, cravingController.createCraving.bind(cravingController));
router.get('/', authenticate, cravingController.getCravings.bind(cravingController));
router.get('/analytics', authenticate, cravingController.getAnalytics.bind(cravingController));
router.get('/triggers', authenticate, cravingController.getTriggerSummary.bind(cravingController));
router.get('/:id', authenticate, cravingController.getCravingById.bind(cravingController));
router.put('/:id', authenticate, cravingController.updateCraving.bind(cravingController));

export default router;
