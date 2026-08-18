import { Router } from 'express';

import {
  getDashboardStats,
  getUserById,
  getUsers,
  getEventsClubsStats,
} from '../controllers/adminController';

import {
  authenticate,
  requireAdmin,
} from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);

router.get('/events-clubs/stats', getEventsClubsStats);

router.get('/users', getUsers);

router.get('/users/:id', getUserById);

export default router;