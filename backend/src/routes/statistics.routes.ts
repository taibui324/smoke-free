import { Router } from 'express';
import { statisticsController } from '../controllers/statistics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All statistics routes require authentication
router.get('/stats', authenticate, statisticsController.getUserStatistics.bind(statisticsController));
router.get('/timer', authenticate, statisticsController.getSmokeFreeTimer.bind(statisticsController));

export default router;
