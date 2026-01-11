import { Router } from 'express';
import { milestoneController } from '../controllers/milestone.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All milestone routes require authentication
router.get('/milestones', authenticate, milestoneController.getMilestones.bind(milestoneController));
router.get('/milestones/unlocked', authenticate, milestoneController.getUnlockedMilestones.bind(milestoneController));
router.post('/milestone/:id/share', authenticate, milestoneController.shareMilestone.bind(milestoneController));
router.get('/streak', authenticate, milestoneController.getBestStreak.bind(milestoneController));

export default router;
