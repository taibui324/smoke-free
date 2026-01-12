import { Router } from 'express';
import { resourceController } from '../controllers/resource.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes (can be accessed without authentication, but will show bookmark status if authenticated)
router.get('/', optionalAuthenticate, resourceController.getResources.bind(resourceController));
router.get('/search', optionalAuthenticate, resourceController.searchResources.bind(resourceController));
router.get('/daily-tip', resourceController.getDailyTip.bind(resourceController));
router.get('/:id', optionalAuthenticate, resourceController.getResourceById.bind(resourceController));

// Protected routes (require authentication)
router.post('/:id/bookmark', authenticate, resourceController.bookmarkResource.bind(resourceController));
router.delete('/:id/bookmark', authenticate, resourceController.removeBookmark.bind(resourceController));
router.get('/bookmarks/list', authenticate, resourceController.getBookmarkedResources.bind(resourceController));

export default router;
