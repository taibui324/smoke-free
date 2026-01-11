import { Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';
import { updateProfileSchema, updatePreferencesSchema } from '../validators/profile.validator';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProfileController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const data = await profileService.getProfile(userId);

      if (!data) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Profile not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      logger.error('Get profile error', { error: error.message });
      return next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validatedData = updateProfileSchema.parse(req.body);

      const profile = await profileService.updateProfile(userId, validatedData);

      return res.status(200).json({
        success: true,
        data: { profile },
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

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Update profile error', { error: error.message });
      return next(error);
    }
  }

  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validatedData = updatePreferencesSchema.parse(req.body);

      const preferences = await profileService.updatePreferences(userId, validatedData);

      return res.status(200).json({
        success: true,
        data: { preferences },
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

      if (error.message === 'User not found' || error.message === 'User preferences not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Update preferences error', { error: error.message });
      return next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      await profileService.deleteAccount(userId);

      return res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'User not found or already deleted') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Delete account error', { error: error.message });
      return next(error);
    }
  }
}

export const profileController = new ProfileController();
