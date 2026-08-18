import { Router } from 'express';

import {
  login,
  register,
  deleteAccount,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  googleAuth,
} from '../controllers/authController';

import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleAuth);

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);

router.delete(
  '/delete-account',
  authenticate,
  deleteAccount,
);

export default router;