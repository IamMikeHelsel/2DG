import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

export const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Create Supabase client for auth operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create admin client for service operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const AUTH_CONFIG = {
  enableGuestAccounts: process.env.ENABLE_GUEST_ACCOUNTS !== 'false',
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
  bcryptRounds: 12,
};