import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests from this IP, please try again later',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const gameRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 game actions per minute
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many game actions, please slow down',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Phaser needs unsafe-eval
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for game compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Recursively sanitize all string inputs
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj
          .replace(/[<>]/g, '') // Remove basic XSS vectors
          .replace(/javascript:/gi, '') // Remove javascript: protocols
          .replace(/on\w+=/gi, '') // Remove event handlers
          .trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({ error: 'Invalid input format' });
  }
};

// Validate request size
export const validateRequestSize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 1024 * 1024; // 1MB

  if (contentLength > maxSize) {
    return res.status(413).json({ 
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload too large' 
    });
  }

  next();
};

// Error handling middleware that doesn't leak sensitive information
export const secureErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);

  // Don't leak sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: isDevelopment ? error.message : undefined
    });
  }

  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  if (error.status === 403) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied'
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    details: isDevelopment ? error.message : undefined
  });
};