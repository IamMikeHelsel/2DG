import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('[Cache] Redis URL not configured, running without cache');
      throw new Error('Redis URL not configured');
    }
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
    
    redis.on('connect', () => {
      console.log('[Cache] Redis connected');
    });
    
    redis.on('error', (err) => {
      console.warn('[Cache] Redis error:', err.message);
    });
    
    redis.on('ready', () => {
      console.log('[Cache] Redis ready');
    });
    
    redis.on('reconnecting', () => {
      console.log('[Cache] Redis reconnecting');
    });
    
    redis.on('close', () => {
      console.log('[Cache] Redis connection closed');
    });
  }
  
  return redis;
}

// Session management
export async function setPlayerSession(playerId: string, sessionData: any, ttlSeconds = 3600) {
  try {
    const redis = getRedisClient();
    const key = `session:${playerId}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(sessionData));
    return true;
  } catch (error) {
    console.warn('[Cache] Failed to set player session:', error);
    return false;
  }
}

export async function getPlayerSession(playerId: string) {
  try {
    const redis = getRedisClient();
    const key = `session:${playerId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('[Cache] Failed to get player session:', error);
    return null;
  }
}

export async function deletePlayerSession(playerId: string) {
  try {
    const redis = getRedisClient();
    const key = `session:${playerId}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.warn('[Cache] Failed to delete player session:', error);
    return false;
  }
}

// Room state caching
export async function setRoomState(roomId: string, state: any, ttlSeconds = 300) {
  try {
    const redis = getRedisClient();
    const key = `room:${roomId}:state`;
    await redis.setex(key, ttlSeconds, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('[Cache] Failed to set room state:', error);
    return false;
  }
}

export async function getRoomState(roomId: string) {
  try {
    const redis = getRedisClient();
    const key = `room:${roomId}:state`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('[Cache] Failed to get room state:', error);
    return null;
  }
}

// Player statistics caching
export async function incrementPlayerStat(playerId: string, stat: string, amount = 1) {
  try {
    const redis = getRedisClient();
    const key = `stats:${playerId}:${stat}`;
    const result = await redis.incrby(key, amount);
    await redis.expire(key, 86400); // 24 hours TTL
    return result;
  } catch (error) {
    console.warn('[Cache] Failed to increment player stat:', error);
    return null;
  }
}

export async function getPlayerStats(playerId: string) {
  try {
    const redis = getRedisClient();
    const pattern = `stats:${playerId}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) return {};
    
    const values = await redis.mget(keys);
    const stats: Record<string, number> = {};
    
    keys.forEach((key, index) => {
      const statName = key.split(':')[2];
      stats[statName] = parseInt(values[index] || '0', 10);
    });
    
    return stats;
  } catch (error) {
    console.warn('[Cache] Failed to get player stats:', error);
    return {};
  }
}

// Leaderboard management
export async function updateLeaderboard(leaderboardName: string, playerId: string, score: number) {
  try {
    const redis = getRedisClient();
    const key = `leaderboard:${leaderboardName}`;
    await redis.zadd(key, score, playerId);
    await redis.expire(key, 604800); // 7 days TTL
    return true;
  } catch (error) {
    console.warn('[Cache] Failed to update leaderboard:', error);
    return false;
  }
}

export async function getLeaderboard(leaderboardName: string, limit = 10) {
  try {
    const redis = getRedisClient();
    const key = `leaderboard:${leaderboardName}`;
    const results = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        playerId: results[i],
        score: parseInt(results[i + 1], 10),
        rank: Math.floor(i / 2) + 1
      });
    }
    
    return leaderboard;
  } catch (error) {
    console.warn('[Cache] Failed to get leaderboard:', error);
    return [];
  }
}

// Rate limiting
export async function checkRateLimit(identifier: string, windowSeconds: number, maxRequests: number) {
  try {
    const redis = getRedisClient();
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    return current <= maxRequests;
  } catch (error) {
    console.warn('[Cache] Failed to check rate limit:', error);
    return true; // Allow on error
  }
}

// Graceful shutdown
export async function closeRedisConnection() {
  if (redis) {
    try {
      await redis.quit();
      console.log('[Cache] Redis connection closed gracefully');
    } catch (error) {
      console.warn('[Cache] Error closing Redis connection:', error);
    }
    redis = null;
  }
}