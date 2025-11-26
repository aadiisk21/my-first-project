import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiting
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later',
      retryAfter: '15 minutes',
      limit: 100,
      windowMs: '15 minutes'
    });
  }
});

// Strict rate limiting for sensitive endpoints
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests to this endpoint, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// WebSocket connection rate limiting
export const wsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 WebSocket connections per minute
  message: {
    success: false,
    error: 'Too many WebSocket connections, please try again later'
  },
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  }
});

// Trading signal rate limiting (per user)
export const signalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each user to 10 signal requests per minute
  keyGenerator: (req: Request) => {
    return req.headers['x-user-id'] as string || req.ip;
  },
  message: {
    success: false,
    error: 'Too many signal requests, please wait before requesting more',
    retryAfter: '1 minute'
  }
});