import { Request, Response, NextFunction } from 'express';
import { AuthService } from './service.js';
import type { TokenPayload } from '@toodee/shared';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await AuthService.verifyToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth, just continue
    next();
  }
};

export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Skip verification check for guest accounts
  if (req.user.isGuest) {
    return next();
  }

  // In a real implementation, you'd check the user's email verification status
  // For now, we'll assume verified users based on token validity
  next();
};

export const requireNonGuest = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.isGuest) {
    return res.status(403).json({ error: 'This action requires a registered account' });
  }

  next();
};