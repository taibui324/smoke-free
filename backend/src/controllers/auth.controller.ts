import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import { logger } from '../utils/logger';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);

      const { user, tokens } = await authService.registerUser(validatedData);

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: user.profilePictureUrl,
            createdAt: user.createdAt,
          },
          tokens,
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

      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Registration error', { error: error.message });
      return next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);

      const { user, tokens } = await authService.loginUser(
        validatedData.email,
        validatedData.password
      );

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: user.profilePictureUrl,
            lastLoginAt: user.lastLoginAt,
          },
          tokens,
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
        error.message === 'Invalid email or password' ||
        error.message === 'Account is inactive'
      ) {
        return res.status(401).json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Login error', { error: error.message });
      return next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);

      const decoded = authService.verifyToken(validatedData.refreshToken);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const user = await authService.getUserById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const tokens = {
        accessToken: authService.generateAccessToken(user.id),
        refreshToken: authService.generateRefreshToken(user.id),
      };

      return res.status(200).json({
        success: true,
        data: { tokens },
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

      if (error.message === 'Invalid or expired token') {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Token refresh error', { error: error.message });
      return next(error);
    }
  }

  async logout(_req: Request, res: Response) {
    // In a stateless JWT system, logout is handled client-side by removing tokens
    // For enhanced security, you could implement a token blacklist here
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = resetPasswordRequestSchema.parse(req.body);

      const resetToken = await authService.generatePasswordResetToken(validatedData.email);
      await emailService.sendPasswordResetEmail(validatedData.email, resetToken);

      // Always return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
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

      // Don't reveal if email doesn't exist
      if (error.message === 'If the email exists, a reset link will be sent') {
        return res.status(200).json({
          success: true,
          message: error.message,
        });
      }

      logger.error('Password reset request error', { error: error.message });
      return next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);

      await authService.resetPassword(validatedData.token, validatedData.newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
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

      if (error.message === 'Invalid or expired reset token' || error.message === 'Invalid reset token') {
        return res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Password reset error', { error: error.message });
      return next(error);
    }
  }
}

export const authController = new AuthController();
