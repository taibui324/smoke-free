import { Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  includeContext: z.boolean().optional(),
});

export class ChatController {
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      // Validate input
      const validatedData = sendMessageSchema.parse(req.body);

      const response = await chatService.sendMessage(userId, validatedData);

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid message data',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.error('Send message error', { error: error.message });
      return next(error);
    }
  }

  async getChatHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = await chatService.getChatHistory(userId, limit);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error('Get chat history error', { error: error.message });
      return next(error);
    }
  }

  async deleteChatHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const deletedCount = await chatService.deleteChatHistory(userId);

      return res.status(200).json({
        success: true,
        message: 'Chat history deleted',
        data: {
          deletedCount,
        },
      });
    } catch (error: any) {
      logger.error('Delete chat history error', { error: error.message });
      return next(error);
    }
  }
}

export const chatController = new ChatController();
