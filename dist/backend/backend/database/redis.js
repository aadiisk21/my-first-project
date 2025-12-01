"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
exports.connectRedis = connectRedis;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
let redisClient;
async function connectRedis() {
    try {
        const config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            database: parseInt(process.env.REDIS_DB || '0'),
            keyPrefix: process.env.REDIS_KEY_PREFIX || 'trading_bot:',
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        };
        redisClient = (0, redis_1.createClient)({
            socket: {
                host: config.host,
                port: config.port,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger_1.logger.error('Redis reconnection failed after 10 attempts');
                        return new Error('Redis reconnection failed');
                    }
                    return Math.min(retries * 50, 1000);
                },
            },
            password: config.password,
            database: config.database,
        });
        redisClient.on('error', (error) => {
            logger_1.logger.error('Redis client error:', error);
        });
        redisClient.on('connect', () => {
            logger_1.logger.info('Redis client connected');
        });
        redisClient.on('ready', () => {
            logger_1.logger.info('Redis client ready');
        });
        redisClient.on('end', () => {
            logger_1.logger.warn('Redis client disconnected');
        });
        await redisClient.connect();
        await redisClient.ping();
        logger_1.logger.info('✅ Redis connected successfully');
        return redisClient;
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to connect to Redis:', error);
        throw error;
    }
}
function getRedis() {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis not connected. Call connectRedis() first.');
    }
    return redisClient;
}
// Cache utility functions
class CacheService {
    constructor() {
        // Avoid calling getRedis() during module import (it may not be connected yet).
        this.client = undefined;
    }
    getClient() {
        var _a;
        return (_a = this.client) !== null && _a !== void 0 ? _a : getRedis();
    }
    async set(key, value, expireInSeconds = 3600) {
        try {
            const serializedValue = JSON.stringify(value);
            await this.getClient().setEx(key, expireInSeconds, serializedValue);
        }
        catch (error) {
            logger_1.logger.error(`Cache set error for key ${key}:`, error);
            throw error;
        }
    }
    async get(key) {
        try {
            const value = await this.getClient().get(key);
            if (value === null)
                return null;
            return JSON.parse(value);
        }
        catch (error) {
            logger_1.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async del(key) {
        try {
            const result = await this.getClient().del(key);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error(`Cache delete error for key ${key}:`, error);
            throw error;
        }
    }
    async exists(key) {
        try {
            const result = await this.getClient().exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    async setWithTTL(key, value, ttlSeconds) {
        try {
            const serializedValue = JSON.stringify(value);
            await this.getClient().setEx(key, ttlSeconds, serializedValue);
        }
        catch (error) {
            logger_1.logger.error(`Cache set with TTL error for key ${key}:`, error);
            throw error;
        }
    }
    async increment(key, amount = 1) {
        try {
            return await this.getClient().incrBy(key, amount);
        }
        catch (error) {
            logger_1.logger.error(`Cache increment error for key ${key}:`, error);
            throw error;
        }
    }
    async expire(key, ttlSeconds) {
        try {
            const result = await this.getClient().expire(key, ttlSeconds);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Cache expire error for key ${key}:`, error);
            return false;
        }
    }
    async getTTL(key) {
        try {
            return await this.getClient().ttl(key);
        }
        catch (error) {
            logger_1.logger.error(`Cache TTL error for key ${key}:`, error);
            return -1;
        }
    }
    // Market data caching
    async cacheMarketData(symbol, timeframe, data, ttlSeconds = 300) {
        const key = `market_data:${symbol}:${timeframe}`;
        await this.set(key, data, ttlSeconds);
    }
    async getMarketData(symbol, timeframe) {
        const key = `market_data:${symbol}:${timeframe}`;
        return this.get(key);
    }
    // Signal caching
    async cacheSignals(signals, ttlSeconds = 1800) {
        const key = 'signals:active';
        await this.set(key, signals, ttlSeconds);
    }
    async getSignals() {
        const key = 'signals:active';
        return this.get(key);
    }
    // User session caching
    async setUserSession(userId, sessionData, ttlSeconds = 86400) {
        const key = `session:${userId}`;
        await this.set(key, sessionData, ttlSeconds);
    }
    async getUserSession(userId) {
        const key = `session:${userId}`;
        return this.get(key);
    }
    async deleteUserSession(userId) {
        const key = `session:${userId}`;
        return this.del(key);
    }
    // API rate limiting
    async checkRateLimit(identifier, maxRequests, windowSeconds) {
        const key = `rate_limit:${identifier}`;
        const now = Math.floor(Date.now() / 1000);
        const windowStart = now - windowSeconds;
        await this.getClient().zRemRangeByScore(key, 0, windowStart);
        const current = await this.getClient().zCard(key);
        if (current >= maxRequests) {
            const resetTime = (await this.getClient().zRange(key, 0, 0, { REV: true }))[0];
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
    async addWebSocketConnection(userId, socketId) {
        const key = `websocket:${userId}`;
        await this.getClient().sAdd(key, socketId);
        await this.getClient().expire(key, 3600);
    }
    async removeWebSocketConnection(userId, socketId) {
        const key = `websocket:${userId}`;
        await this.getClient().sRem(key, socketId);
    }
    async getWebSocketConnections(userId) {
        const key = `websocket:${userId}`;
        return this.getClient().sMembers(key);
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
async function closeRedis() {
    if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        logger_1.logger.info('Redis connection closed');
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
//# sourceMappingURL=redis.js.map