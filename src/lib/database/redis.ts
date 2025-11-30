import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

export async function connectRedis(): Promise<RedisClientType> {
  try {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'trading_bot:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    };

    redisClient = createClient({
      socket: {
        host: config.host,
        port: config.port,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 1000);
        },
      },
      password: config.password,
      database: config.database,
    });

    redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    redisClient.on('connect', () => {
      console.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      console.info('Redis client ready');
    });

    redisClient.on('end', () => {
      console.warn('Redis client disconnected');
    });

    await redisClient.connect();
    await redisClient.ping();

    console.info('✅ Redis connected successfully');
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedis(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
}

// Cache utility functions
export class CacheService {
  private client: RedisClientType;

  constructor() {
    this.client = getRedis();
  }

  async set(
    key: string,
    value: unknown,
    expireInSeconds: number = 3600
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, expireInSeconds, serializedValue);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async setWithTTL(
    key: string,
    value: unknown,
    ttlSeconds: number
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, serializedValue);
    } catch (error) {
      console.error(`Cache set with TTL error for key ${key}:`, error);
      throw error;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Market data caching
  async cacheMarketData(
    symbol: string,
    timeframe: string,
    data: unknown[],
    ttlSeconds: number = 300
  ): Promise<void> {
    const key = `market_data:${symbol}:${timeframe}`;
    await this.set(key, data, ttlSeconds);
  }

  async getMarketData(
    symbol: string,
    timeframe: string
  ): Promise<unknown[] | null> {
    const key = `market_data:${symbol}:${timeframe}`;
    return this.get<unknown[]>(key);
  }

  // Signal caching
  async cacheSignals(
    signals: unknown[],
    ttlSeconds: number = 1800
  ): Promise<void> {
    const key = 'signals:active';
    await this.set(key, signals, ttlSeconds);
  }

  async getSignals(): Promise<unknown[] | null> {
    const key = 'signals:active';
    return this.get<unknown[]>(key);
  }

  // User session caching
  async setUserSession(
    userId: string,
    sessionData: unknown,
    ttlSeconds: number = 86400
  ): Promise<void> {
    const key = `session:${userId}`;
    await this.set(key, sessionData, ttlSeconds);
  }

  async getUserSession(userId: string): Promise<unknown | null> {
    const key = `session:${userId}`;
    return this.get(key);
  }

  async deleteUserSession(userId: string): Promise<boolean> {
    const key = `session:${userId}`;
    return this.del(key);
  }

  // API rate limiting
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    await this.client.zRemRangeByScore(key, 0, windowStart);

    const current = await this.client.zCard(key);

    if (current >= maxRequests) {
      const resetTime = (await this.client.zRange(key, 0, 0, { REV: true }))[0];
      return {
        allowed: false,
        remaining: 0,
        resetTime: parseInt(resetTime) + windowSeconds,
      };
    }

    await this.client.zAdd(key, [{ score: now, value: now.toString() }]);
    await this.client.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: maxRequests - current - 1,
      resetTime: now + windowSeconds,
    };
  }

  // WebSocket connection management
  async addWebSocketConnection(
    userId: string,
    socketId: string
  ): Promise<void> {
    const key = `websocket:${userId}`;
    await this.client.sAdd(key, socketId);
    await this.client.expire(key, 3600);
  }

  async removeWebSocketConnection(
    userId: string,
    socketId: string
  ): Promise<void> {
    const key = `websocket:${userId}`;
    await this.client.sRem(key, socketId);
  }

  async getWebSocketConnections(userId: string): Promise<string[]> {
    const key = `websocket:${userId}`;
    return this.client.sMembers(key);
  }
}

export const cacheService = new CacheService();

export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.info('Redis connection closed');
  }
}
