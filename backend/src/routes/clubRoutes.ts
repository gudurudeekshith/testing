import { Router } from 'express';
import {
  getClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub,
  saveClub,
  unsaveClub,
  getSavedStatus,
  getSavedClubs,
  getJoinedClubs,
  getClubEvents,
  getClubMembers,
} from '../controllers/clubController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/', getClubs);
router.get('/:id', getClubById);
router.get('/:id/events', getClubEvents);

// Authenticated user routes (NOTE: Register '/saved' and '/joined' BEFORE '/:id' to prevent routing conflicts)
router.get('/saved', authenticate, getSavedClubs);
router.get('/joined', authenticate, getJoinedClubs);
router.post('/:id/join', authenticate, joinClub);
router.delete('/:id/leave', authenticate, leaveClub);
router.post('/:id/save', authenticate, saveClub);
router.delete('/:id/save', authenticate, unsaveClub);
router.get('/:id/saved', authenticate, getSavedStatus);

// Authenticated admin routes
router.post('/', authenticate, requireAdmin, createClub);
router.patch('/:id', authenticate, requireAdmin, updateClub);
router.delete('/:id', authenticate, requireAdmin, deleteClub);
router.get('/:id/members', authenticate, requireAdmin, getClubMembers);

export default router;
