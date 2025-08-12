import { Router, Request, Response } from 'express';
import { AuthService } from '../auth/service.js';
import { authRateLimit } from '../middleware/security.js';
import { 
  validateRegistration, 
  validateLogin, 
  validatePasswordReset 
} from '../middleware/validation.js';
import { authenticateToken } from '../auth/middleware.js';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Register new user
router.post('/register', validateRegistration, async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed due to server error' 
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed due to server error' 
    });
  }
});

// Create guest account
router.post('/guest', async (req: Request, res: Response) => {
  try {
    const result = await AuthService.createGuestAccount();
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Guest account creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create guest account' 
    });
  }
});

// Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token is required' 
      });
    }

    const result = await AuthService.refreshAccessToken(refreshToken);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Token refresh failed' 
    });
  }
});

// Request password reset
router.post('/forgot-password', validatePasswordReset, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await AuthService.requestPasswordReset(email);
    
    // Always return success to prevent email enumeration
    res.json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Password reset request failed' 
    });
  }
});

// Verify token (for debugging/testing)
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    user: req.user,
    message: 'Token is valid' 
  });
});

// Logout (client-side token clearing, but we can track it server-side if needed)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more sophisticated implementation, you might:
  // - Add the token to a blacklist
  // - Track logout events for analytics
  // - Clear server-side sessions
  
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

export default router;