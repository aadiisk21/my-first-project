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
  standardHeaders: true,
  legacyHeaders: false,
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
  max: 5,
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
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many WebSocket connections, please try again later'
  },
  // Use default key generation (by IP). Custom keyGenerators that reference
  // req.ip are rejected by newer express-rate-limit versions unless using
  // the provided ipKeyGenerator helper. For dev, rely on the default.
});

// Trading signal rate limiting (per user)
export const signalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  // Keep default key generator. If per-user rate limiting is needed later,
  // replace with a compliant keyGenerator using ipKeyGenerator or similar.
  message: {
    success: false,
    error: 'Too many signal requests, please wait before requesting more',
    retryAfter: '1 minute'
  }
});
