import { Response, NextFunction } from 'express';
import { resourceService } from '../services/resource.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['article', 'video', 'tip']).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export class ResourceController {
  async getResources(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId || null;

      // Parse query parameters
      const params = {
        query: req.query.query as string | undefined,
        type: req.query.type as string | undefined,
        category: req.query.category as string | undefined,
        tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) as string[] : undefined,
        isFeatured: req.query.isFeatured === 'true' ? true : req.query.isFeatured === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      // Validate parameters
      const validatedParams = searchSchema.parse(params);

      const resources = await resourceService.getResources(userId, validatedParams);

      return res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Get resources error', { error: error.message });
      return next(error);
    }
  }

  async getResourceById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId || null;
      const resourceId = req.params.id;

      const resource = await resourceService.getResourceById(userId, resourceId);

      if (!resource) {
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: resource,
      });
    } catch (error: any) {
      logger.error('Get resource by ID error', { error: error.message });
      return next(error);
    }
  }

  async searchResources(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId || null;
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!query) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query is required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const resources = await resourceService.searchResources(userId, query, limit);

      return res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error: any) {
      logger.error('Search resources error', { error: error.message });
      return next(error);
    }
  }

  async bookmarkResource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const resourceId = req.params.id;

      // Check if resource exists
      const resource = await resourceService.getResourceById(null, resourceId);
      if (!resource) {
        return res.status(404).json({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      await resourceService.bookmarkResource(userId, resourceId);

      return res.status(200).json({
        success: true,
        message: 'Resource bookmarked',
      });
    } catch (error: any) {
      logger.error('Bookmark resource error', { error: error.message });
      return next(error);
    }
  }

  async removeBookmark(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const resourceId = req.params.id;

      const removed = await resourceService.removeBookmark(userId, resourceId);

      if (!removed) {
        return res.status(404).json({
          error: {
            code: 'BOOKMARK_NOT_FOUND',
            message: 'Bookmark not found',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Bookmark removed',
      });
    } catch (error: any) {
      logger.error('Remove bookmark error', { error: error.message });
      return next(error);
    }
  }

  async getBookmarkedResources(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const resources = await resourceService.getBookmarkedResources(userId, limit, offset);

      return res.status(200).json({
        success: true,
        data: resources,
      });
    } catch (error: any) {
      logger.error('Get bookmarked resources error', { error: error.message });
      return next(error);
    }
  }

  async getDailyTip(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tip = await resourceService.getDailyTip();

      if (!tip) {
        return res.status(404).json({
          error: {
            code: 'NO_TIPS_AVAILABLE',
            message: 'No tips available',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: tip,
      });
    } catch (error: any) {
      logger.error('Get daily tip error', { error: error.message });
      return next(error);
    }
  }
}

export const resourceController = new ResourceController();
