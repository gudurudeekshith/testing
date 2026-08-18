import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'admin';
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: 'JWT configuration is missing.',
      });
      return;
    }

    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      });
      return;
    }

    const token = authorization.substring(7);

    const decoded = jwt.verify(
      token,
      JWT_SECRET,
    ) as JwtPayload;

    const user = await User.findById(decoded.userId).select(
      '_id email role',
    );

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
    return;
  }

  next();
}