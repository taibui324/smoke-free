import { Response, NextFunction } from 'express';
import { cravingService } from '../services/craving.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createCravingSchema,
  updateCravingSchema,
  CreateCravingInput,
  UpdateCravingInput,
} from '../validators/craving.validator';
import { z } from 'zod';

export class CravingController {
  async createCraving(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      // Validate input
      const validatedData: CreateCravingInput = createCravingSchema.parse(req.body);

      const craving = await cravingService.createCraving(userId, validatedData);

      return res.status(201).json({
        success: true,
        data: craving,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid craving data',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Create craving error', { error: error.message });
      return next(error);
    }
  }

  async getCravings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const cravings = await cravingService.getCravings(userId, limit, offset);

      return res.status(200).json({
        success: true,
        data: cravings,
        pagination: {
          limit,
          offset,
          count: cravings.length,
        },
      });
    } catch (error: any) {
      logger.error('Get cravings error', { error: error.message });
      return next(error);
    }
  }

  async getCravingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const cravingId = req.params.id;

      const craving = await cravingService.getCravingById(userId, cravingId);

      if (!craving) {
        return res.status(404).json({
          error: {
            code: 'CRAVING_NOT_FOUND',
            message: 'Craving not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: craving,
      });
    } catch (error: any) {
      logger.error('Get craving error', { error: error.message });
      return next(error);
    }
  }

  async updateCraving(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const cravingId = req.params.id;

      // Validate input
      const validatedData: UpdateCravingInput = updateCravingSchema.parse(req.body);

      const craving = await cravingService.updateCraving(userId, cravingId, validatedData);

      if (!craving) {
        return res.status(404).json({
          error: {
            code: 'CRAVING_NOT_FOUND',
            message: 'Craving not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: craving,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Update craving error', { error: error.message });
      return next(error);
    }
  }

  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const days = parseInt(req.query.days as string) || 30;

      const analytics = await cravingService.getAnalytics(userId, days);

      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('Get analytics error', { error: error.message });
      return next(error);
    }
  }

  async getTriggerSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const triggers = await cravingService.getTriggerSummary(userId);

      return res.status(200).json({
        success: true,
        data: triggers,
      });
    } catch (error: any) {
      logger.error('Get trigger summary error', { error: error.message });
      return next(error);
    }
  }
}

export const cravingController = new CravingController();
