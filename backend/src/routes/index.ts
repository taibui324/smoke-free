import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import quitPlanRoutes from './quit-plan.routes';
import statisticsRoutes from './statistics.routes';
import cravingRoutes from './craving.routes';
import milestoneRoutes from './milestone.routes';
import chatRoutes from './chat.routes';
import resourceRoutes from './resource.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', profileRoutes);
router.use('/quit-plan', quitPlanRoutes);
router.use('/progress', statisticsRoutes);
router.use('/cravings', cravingRoutes);
router.use('/progress', milestoneRoutes);
router.use('/chat', chatRoutes);
router.use('/resources', resourceRoutes);

export default router;
