import { supabase } from './connection';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
}

export class AuthService {
  private static instance: AuthService;
  private isEnabled: boolean = false;
  private jwtSecret: string;

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public initialize(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(`[Auth] Service initialized - Enabled: ${this.isEnabled}`);
  }

  // Create or authenticate user (simplified for demo)
  async authenticateUser(options: { username?: string; email?: string; password?: string }): Promise<AuthUser | null> {
    if (!this.isEnabled) {
      // Return a temporary guest user when auth is disabled
      const guestId = this.generateGuestId(options.username || options.email || 'guest');
      return {
        id: guestId,
        username: options.username || `Guest_${guestId.slice(-6)}`,
      };
    }

    try {
      // For demo purposes, we'll use a simple approach
      // In production, you'd use Supabase's built-in auth
      if (!options.username) {
        return null;
      }

      // Check if user exists in auth.users (this would normally be handled by Supabase Auth)
      const { data: existingUser, error: fetchError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', options.email || `${options.username}@example.com`)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Auth] Error fetching user:', fetchError);
        return this.createGuestUser(options.username);
      }

      if (existingUser) {
        return {
          id: existingUser.id,
          email: existingUser.email,
          username: options.username,
        };
      }

      // For demo, create a simple user entry
      // In production, use Supabase Auth signup
      const userId = this.generateUserId();
      
      return {
        id: userId,
        username: options.username,
        email: options.email,
      };

    } catch (error) {
      console.error('[Auth] Authentication error:', error);
      return this.createGuestUser(options.username || 'guest');
    }
  }

  // Generate session token
  generateSessionToken(user: AuthUser): string {
    return jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      },
      this.jwtSecret
    );
  }

  // Verify session token
  verifySessionToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        id: decoded.userId,
        username: decoded.username,
      };
    } catch (error) {
      console.warn('[Auth] Invalid session token:', error);
      return null;
    }
  }

  // Extract user from session (for Colyseus client options)
  extractUserFromOptions(options: any): AuthUser | null {
    // Check for session token
    if (options.sessionToken) {
      return this.verifySessionToken(options.sessionToken);
    }

    // Check for direct username (fallback for demo)
    if (options.username) {
      // We need to await this, but extractUserFromOptions should be synchronous
      // So we'll create a synchronous guest user instead
      return {
        id: this.generateGuestId(options.username),
        username: options.username,
      };
    }

    // Create guest user
    return {
      id: this.generateGuestId('anonymous'),
      username: 'Anonymous',
    };
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateGuestId(identifier: string): string {
    return `guest_${identifier}_${Date.now().toString(36)}`;
  }

  private createGuestUser(username: string): AuthUser {
    return {
      id: this.generateGuestId(username),
      username: username,
    };
  }

  isReady(): boolean {
    return this.isEnabled;
  }
}

export const authService = AuthService.getInstance();