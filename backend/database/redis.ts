import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

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
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 1000);
        },
      },
      password: config.password,
      database: config.database,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client disconnected');
    });

    await redisClient.connect();
    await redisClient.ping();

    logger.info('✅ Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
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
    // Avoid calling getRedis() during module import (it may not be connected yet).
    this.client = undefined as unknown as RedisClientType;
  }

  private getClient(): RedisClientType {
    return this.client ?? getRedis();
  }

  async set(
    key: string,
    value: unknown,
    expireInSeconds: number = 3600
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.getClient().setEx(key, expireInSeconds, serializedValue);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.getClient().get(key);
      if (value === null) return null;
      return JSON.parse(value as string) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.getClient().del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.getClient().exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
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
      await this.getClient().setEx(key, ttlSeconds, serializedValue);
    } catch (error) {
      logger.error(`Cache set with TTL error for key ${key}:`, error);
      throw error;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.getClient().incrBy(key, amount);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.getClient().expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.getClient().ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
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

    await this.getClient().zRemRangeByScore(key, 0, windowStart);

    const current = await this.getClient().zCard(key);

    if (current >= maxRequests) {
      const resetTime = (
        await this.getClient().zRange(key, 0, 0, { REV: true })
      )[0];
      return {
        allowed: false,
        remaining: 0,
        resetTime: parseInt(resetTime) + windowSeconds,
      };
    }

    await this.getClient().zAdd(key, [{ score: now, value: now.toString() }]);
    await this.getClient().expire(key, windowSeconds);

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
    await this.getClient().sAdd(key, socketId);
    await this.getClient().expire(key, 3600);
  }

  async removeWebSocketConnection(
    userId: string,
    socketId: string
  ): Promise<void> {
    const key = `websocket:${userId}`;
    await this.getClient().sRem(key, socketId);
  }

  async getWebSocketConnections(userId: string): Promise<string[]> {
    const key = `websocket:${userId}`;
    return this.getClient().sMembers(key);
  }
}

export const cacheService = new CacheService();

export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});
