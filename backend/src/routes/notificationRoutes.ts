import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Note: register '/unread' and '/read-all' BEFORE '/:id/read' or '/:id' to avoid parameter conflicts.
router.get('/', getMyNotifications);
router.get('/unread', getUnreadNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);

export default router;
