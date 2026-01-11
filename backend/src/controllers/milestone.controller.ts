import { Response, NextFunction } from 'express';
import { milestoneService } from '../services/milestone.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class MilestoneController {
  async getMilestones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      // Check and unlock any new milestones
      await milestoneService.checkAndUnlockMilestones(userId);

      // Get milestone progress
      const progress = await milestoneService.getMilestoneProgress(userId);

      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      logger.error('Get milestones error', { error: error.message });
      return next(error);
    }
  }

  async getUnlockedMilestones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const milestones = await milestoneService.getUserMilestones(userId);

      return res.status(200).json({
        success: true,
        data: milestones,
      });
    } catch (error: any) {
      logger.error('Get unlocked milestones error', { error: error.message });
      return next(error);
    }
  }

  async shareMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const milestoneId = req.params.id;

      const success = await milestoneService.shareMilestone(userId, milestoneId);

      if (!success) {
        return res.status(404).json({
          error: {
            code: 'MILESTONE_NOT_FOUND',
            message: 'Milestone not found or not unlocked',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Milestone marked as shared',
      });
    } catch (error: any) {
      logger.error('Share milestone error', { error: error.message });
      return next(error);
    }
  }

  async getBestStreak(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const bestStreak = await milestoneService.getBestStreak(userId);

      return res.status(200).json({
        success: true,
        data: {
          bestStreak,
        },
      });
    } catch (error: any) {
      logger.error('Get best streak error', { error: error.message });
      return next(error);
    }
  }
}

export const milestoneController = new MilestoneController();
