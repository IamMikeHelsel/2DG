import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, AUTH_CONFIG } from './config.js';
import type { AuthUser, TokenPayload, LoginRequest, RegisterRequest, AuthResponse } from '@toodee/shared';

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  is_guest: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string;
}

export class AuthService {
  private static loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validate input
      if (!data.email || !data.password || !data.displayName) {
        return { success: false, error: 'Missing required fields' };
      }

      if (data.password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName
          }
        }
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed' };
      }

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        displayName: data.displayName,
        isGuest: false,
        emailVerified: authData.user.email_confirmed_at !== null,
        createdAt: authData.user.created_at,
        lastLoginAt: new Date().toISOString()
      };

      // Generate JWT tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        user,
        token,
        refreshToken,
        message: AUTH_CONFIG.requireEmailVerification ? 'Please check your email to verify your account' : 'Registration successful'
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(data.email);
      if (!rateLimitResult.allowed) {
        return { success: false, error: 'Too many login attempts. Please try again later.' };
      }

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (authError || !authData.user) {
        this.recordFailedAttempt(data.email);
        return { success: false, error: 'Invalid email or password' };
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(data.email);

      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email!,
        displayName: authData.user.user_metadata?.display_name || 'User',
        isGuest: false,
        emailVerified: authData.user.email_confirmed_at !== null,
        createdAt: authData.user.created_at,
        lastLoginAt: new Date().toISOString()
      };

      // Generate JWT tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        success: true,
        user,
        token,
        refreshToken,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  static async createGuestAccount(): Promise<AuthResponse> {
    if (!AUTH_CONFIG.enableGuestAccounts) {
      return { success: false, error: 'Guest accounts are disabled' };
    }

    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const guestName = `Guest${Math.floor(Math.random() * 10000)}`;

      const user: AuthUser = {
        id: guestId,
        email: `${guestId}@guest.local`,
        displayName: guestName,
        isGuest: true,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      const token = this.generateToken(user);

      return {
        success: true,
        user,
        token,
        message: 'Guest account created'
      };

    } catch (error) {
      console.error('Guest account creation error:', error);
      return { success: false, error: 'Failed to create guest account' };
    }
  }

  static async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;
      
      // For non-guest accounts, verify the user still exists in Supabase
      if (!decoded.isGuest) {
        const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);
        if (error || !user) {
          return { success: false, error: 'Invalid refresh token' };
        }
      }

      // Generate new access token
      const newToken = this.generateToken({
        id: decoded.userId,
        email: decoded.email,
        displayName: '', // Will be filled from user data in practice
        isGuest: decoded.isGuest,
        emailVerified: true,
        createdAt: '',
        lastLoginAt: new Date().toISOString()
      });

      return {
        success: true,
        token: newToken,
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      return { success: false, error: 'Invalid refresh token' };
    }
  }

  static async requestPasswordReset(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Password reset email sent'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to send password reset email' };
    }
  }

  private static generateToken(user: AuthUser): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      isGuest: user.isGuest
    };

    return jwt.sign(payload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  private static generateRefreshToken(user: AuthUser): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      isGuest: user.isGuest
    };

    return jwt.sign(payload as object, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }

  private static checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return { allowed: true };

    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;

    // Reset attempts if lockout duration has passed
    if (timeSinceLastAttempt > AUTH_CONFIG.lockoutDuration) {
      this.loginAttempts.delete(email);
      return { allowed: true };
    }

    // Check if max attempts exceeded
    if (attempts.count >= AUTH_CONFIG.maxLoginAttempts) {
      const retryAfter = Math.ceil((AUTH_CONFIG.lockoutDuration - timeSinceLastAttempt) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  private static recordFailedAttempt(email: string): void {
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempts);
  }

  private static clearFailedAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }
}