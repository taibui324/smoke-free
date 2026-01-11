import { Response, NextFunction } from 'express';
import { quitPlanService } from '../services/quit-plan.service';
import {
  createQuitPlanSchema,
  updateQuitPlanSchema,
  updateQuitDateSchema,
} from '../validators/quit-plan.validator';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class QuitPlanController {
  async createQuitPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validatedData = createQuitPlanSchema.parse(req.body);

      // Check if quit plan already exists
      const existing = await quitPlanService.getQuitPlan(userId);
      if (existing) {
        return res.status(409).json({
          error: {
            code: 'QUIT_PLAN_EXISTS',
            message: 'Quit plan already exists. Use PUT to update.',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const quitPlan = await quitPlanService.createQuitPlan(userId, {
        ...validatedData,
        quitDate: new Date(validatedData.quitDate),
      });

      const savings = quitPlanService.calculateSavings(quitPlan);

      return res.status(201).json({
        success: true,
        data: {
          quitPlan,
          savings,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (
        error.message === 'Quit date must be within the next 14 days' ||
        error.message === 'Quit date cannot be in the past'
      ) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUIT_DATE',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Create quit plan error', { error: error.message });
      return next(error);
    }
  }

  async getQuitPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const quitPlan = await quitPlanService.getQuitPlan(userId);

      if (!quitPlan) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Quit plan not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const savings = quitPlanService.calculateSavings(quitPlan);

      return res.status(200).json({
        success: true,
        data: {
          quitPlan,
          savings,
        },
      });
    } catch (error: any) {
      logger.error('Get quit plan error', { error: error.message });
      return next(error);
    }
  }

  async updateQuitPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validatedData = updateQuitPlanSchema.parse(req.body);

      const updateData = {
        ...validatedData,
        quitDate: validatedData.quitDate ? new Date(validatedData.quitDate) : undefined,
      };

      const quitPlan = await quitPlanService.updateQuitPlan(userId, updateData);

      const savings = quitPlanService.calculateSavings(quitPlan);

      return res.status(200).json({
        success: true,
        data: {
          quitPlan,
          savings,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (
        error.message === 'Quit date must be within the next 14 days' ||
        error.message === 'Quit date cannot be in the past'
      ) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUIT_DATE',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (error.message === 'Quit plan not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Update quit plan error', { error: error.message });
      return next(error);
    }
  }

  async updateQuitDate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validatedData = updateQuitDateSchema.parse(req.body);

      const quitPlan = await quitPlanService.updateQuitPlan(userId, {
        quitDate: new Date(validatedData.quitDate),
      });

      const savings = quitPlanService.calculateSavings(quitPlan);

      return res.status(200).json({
        success: true,
        data: {
          quitPlan,
          savings,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (
        error.message === 'Quit date must be within the next 14 days' ||
        error.message === 'Quit date cannot be in the past'
      ) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUIT_DATE',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (error.message === 'Quit plan not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Update quit date error', { error: error.message });
      return next(error);
    }
  }
}

export const quitPlanController = new QuitPlanController();
