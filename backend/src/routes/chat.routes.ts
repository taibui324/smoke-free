import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.post('/message', authenticate, chatController.sendMessage.bind(chatController));
router.get('/history', authenticate, chatController.getChatHistory.bind(chatController));
router.delete('/history', authenticate, chatController.deleteChatHistory.bind(chatController));

export default router;
