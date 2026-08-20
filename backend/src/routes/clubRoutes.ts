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

// AUTHENTICATED USER ROUTES
router.get('/saved', authenticate, getSavedClubs);
router.get('/joined', authenticate, getJoinedClubs);

// PUBLIC ROUTES
router.get('/', getClubs);
router.get('/:id', getClubById);
router.get('/:id/events', getClubEvents);

// AUTHENTICATED CLUB ACTIONS
router.post('/:id/join', authenticate, joinClub);
router.delete('/:id/leave', authenticate, leaveClub);
router.post('/:id/save', authenticate, saveClub);
router.delete('/:id/save', authenticate, unsaveClub);
router.get('/:id/saved', authenticate, getSavedStatus);

// ADMIN ROUTES
router.post('/', authenticate, requireAdmin, createClub);
router.patch('/:id', authenticate, requireAdmin, updateClub);
router.delete('/:id', authenticate, requireAdmin, deleteClub);
router.get('/:id/members', authenticate, requireAdmin, getClubMembers);

export default router;
