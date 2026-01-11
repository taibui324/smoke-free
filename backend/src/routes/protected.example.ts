import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Example of a protected route that requires authentication
router.get('/profile', authenticate, (req: AuthRequest, res: Response) => {
  // req.userId and req.user are available here
  res.json({
    success: true,
    data: {
      userId: req.userId,
      user: req.user,
    },
  });
});

// Example of a protected route with custom logic
router.put('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  
  // Your business logic here
  // e.g., update user settings in database
  
  res.json({
    success: true,
    message: 'Settings updated',
  });
});

export default router;
