import { Router } from 'express';
import { quitPlanController } from '../controllers/quit-plan.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All quit plan routes require authentication
router.post('/', authenticate, quitPlanController.createQuitPlan.bind(quitPlanController));
router.get('/', authenticate, quitPlanController.getQuitPlan.bind(quitPlanController));
router.put('/', authenticate, quitPlanController.updateQuitPlan.bind(quitPlanController));
router.put('/quit-date', authenticate, quitPlanController.updateQuitDate.bind(quitPlanController));

export default router;
