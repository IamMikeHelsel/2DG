export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: number;
  
  // Database
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_KEY?: string;
  
  // Cache
  REDIS_URL?: string;
  
  // Monitoring
  SENTRY_DSN?: string;
  
  // Features
  ENABLE_DATABASE: boolean;
  ENABLE_CACHE: boolean;
  ENABLE_ANALYTICS: boolean;
  ENABLE_RATE_LIMITING: boolean;
  
  // Game settings
  MAX_PLAYERS_PER_ROOM: number;
  TICK_RATE: number;
  PATCH_RATE: number;
  
  // Security
  SESSION_SECRET?: string;
  CORS_ORIGIN: string | string[];
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseCorsOrigin(value: string | undefined): string | string[] {
  if (!value) return '*';
  
  // If it contains commas, split into array
  if (value.includes(',')) {
    return value.split(',').map(origin => origin.trim());
  }
  
  return value;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as EnvironmentConfig['NODE_ENV'];
  
  return {
    NODE_ENV: nodeEnv,
    PORT: parseNumber(process.env.PORT, 2567),
    
    // Database
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    
    // Cache
    REDIS_URL: process.env.REDIS_URL,
    
    // Monitoring
    SENTRY_DSN: process.env.SENTRY_DSN,
    
    // Features (can be disabled for development or if services aren't available)
    ENABLE_DATABASE: parseBoolean(process.env.ENABLE_DATABASE, !!process.env.SUPABASE_URL),
    ENABLE_CACHE: parseBoolean(process.env.ENABLE_CACHE, !!process.env.REDIS_URL),
    ENABLE_ANALYTICS: parseBoolean(process.env.ENABLE_ANALYTICS, nodeEnv === 'production'),
    ENABLE_RATE_LIMITING: parseBoolean(process.env.ENABLE_RATE_LIMITING, nodeEnv === 'production'),
    
    // Game settings
    MAX_PLAYERS_PER_ROOM: parseNumber(process.env.MAX_PLAYERS_PER_ROOM, 80),
    TICK_RATE: parseNumber(process.env.TICK_RATE, 20),
    PATCH_RATE: parseNumber(process.env.PATCH_RATE, 10),
    
    // Security
    SESSION_SECRET: process.env.SESSION_SECRET,
    CORS_ORIGIN: parseCorsOrigin(process.env.CORS_ORIGIN),
  };
}

export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const config = getEnvironmentConfig();
  const errors: string[] = [];
  
  // Check critical environment variables for production
  if (config.NODE_ENV === 'production') {
    if (config.ENABLE_DATABASE && !config.SUPABASE_URL) {
      errors.push('SUPABASE_URL is required when database is enabled in production');
    }
    
    if (config.ENABLE_DATABASE && !config.SUPABASE_ANON_KEY) {
      errors.push('SUPABASE_ANON_KEY is required when database is enabled in production');
    }
    
    if (config.ENABLE_CACHE && !config.REDIS_URL) {
      errors.push('REDIS_URL is required when cache is enabled in production');
    }
    
    if (!config.SESSION_SECRET) {
      errors.push('SESSION_SECRET is required in production');
    }
  }
  
  // Validate PORT
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Validate game settings
  if (config.MAX_PLAYERS_PER_ROOM < 1 || config.MAX_PLAYERS_PER_ROOM > 1000) {
    errors.push('MAX_PLAYERS_PER_ROOM must be between 1 and 1000');
  }
  
  if (config.TICK_RATE < 1 || config.TICK_RATE > 60) {
    errors.push('TICK_RATE must be between 1 and 60');
  }
  
  if (config.PATCH_RATE < 1 || config.PATCH_RATE > 60) {
    errors.push('PATCH_RATE must be between 1 and 60');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function logEnvironmentInfo(): void {
  const config = getEnvironmentConfig();
  const validation = validateEnvironment();
  
  console.log('[Environment] Configuration loaded:');
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  PORT: ${config.PORT}`);
  console.log(`  Database: ${config.ENABLE_DATABASE ? 'enabled' : 'disabled'}`);
  console.log(`  Cache: ${config.ENABLE_CACHE ? 'enabled' : 'disabled'}`);
  console.log(`  Analytics: ${config.ENABLE_ANALYTICS ? 'enabled' : 'disabled'}`);
  console.log(`  Rate Limiting: ${config.ENABLE_RATE_LIMITING ? 'enabled' : 'disabled'}`);
  console.log(`  Max Players per Room: ${config.MAX_PLAYERS_PER_ROOM}`);
  console.log(`  Tick Rate: ${config.TICK_RATE} Hz`);
  console.log(`  Patch Rate: ${config.PATCH_RATE} Hz`);
  
  if (!validation.valid) {
    console.error('[Environment] Configuration errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration for production');
    } else {
      console.warn('[Environment] Continuing with configuration warnings in development mode');
    }
  } else {
    console.log('[Environment] Configuration validated successfully');
  }
}