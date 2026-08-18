import { Router } from 'express';
import {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
} from '../controllers/registrationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/events/:eventId/register', registerForEvent);
router.patch('/events/:eventId/register/cancel', cancelRegistration);
router.get('/me', getMyRegistrations);

export default router;
