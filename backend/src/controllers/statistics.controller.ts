import { Response, NextFunction } from 'express';
import { statisticsService } from '../services/statistics.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class StatisticsController {
  async getUserStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const statistics = await statisticsService.getUserStatistics(userId);

      if (!statistics) {
        return res.status(404).json({
          error: {
            code: 'QUIT_PLAN_NOT_FOUND',
            message: 'No quit plan found. Please create a quit plan first.',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      logger.error('Get statistics error', { error: error.message });
      return next(error);
    }
  }

  async getSmokeFreeTimer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const timer = await statisticsService.getSmokeFreeTimer(userId);

      if (!timer) {
        return res.status(404).json({
          error: {
            code: 'QUIT_PLAN_NOT_FOUND',
            message: 'No quit plan found. Please create a quit plan first.',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          smokeFreeTime: timer,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Get timer error', { error: error.message });
      return next(error);
    }
  }
}

export const statisticsController = new StatisticsController();
