import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEventRegistrations,
} from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Authenticated admin routes
router.post('/', authenticate, requireAdmin, createEvent);
router.patch('/:id', authenticate, requireAdmin, updateEvent);
router.patch('/:id/cancel', authenticate, requireAdmin, cancelEvent);
router.delete('/:id', authenticate, requireAdmin, deleteEvent);
router.get('/:id/registrations', authenticate, requireAdmin, getEventRegistrations);

export default router;
