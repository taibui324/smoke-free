import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = authService.verifyToken(token);

      if (decoded.type !== 'access') {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Get user from database to ensure they still exist and are active
      const user = await authService.getUserById(decoded.userId);

      if (!user || !user.isActive) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found or inactive',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Attach user info to request
      req.userId = user.id;
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      next();
    } catch (error: any) {
      if (error.message === 'Invalid or expired token') {
        res.status(401).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    logger.error('Authentication middleware error', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = authService.verifyToken(token);

      if (decoded.type === 'access') {
        const user = await authService.getUserById(decoded.userId);

        if (user && user.isActive) {
          req.userId = user.id;
          req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        }
      }
    } catch (error) {
      // Invalid token, but continue without authentication
      logger.debug('Optional authentication failed', { error });
    }

    next();
  } catch (error: any) {
    logger.error('Optional authentication middleware error', { error: error.message });
    next();
  }
};
