import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All profile routes require authentication
router.get('/profile', authenticate, profileController.getProfile.bind(profileController));
router.put('/profile', authenticate, profileController.updateProfile.bind(profileController));
router.put(
  '/preferences',
  authenticate,
  profileController.updatePreferences.bind(profileController)
);
router.delete('/account', authenticate, profileController.deleteAccount.bind(profileController));

export default router;
