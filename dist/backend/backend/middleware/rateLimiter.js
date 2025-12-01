"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalRateLimiter = exports.wsRateLimiter = exports.strictRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// General API rate limiting
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests from this IP, please try again later',
            retryAfter: '15 minutes',
            limit: 100,
            windowMs: '15 minutes',
        });
    },
});
// Strict rate limiting for sensitive endpoints
exports.strictRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: 'Too many requests to this endpoint, please try again later',
        retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});
// WebSocket connection rate limiting
exports.wsRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: 'Too many WebSocket connections, please try again later',
    },
    // Use default key generation (by IP). Custom keyGenerators that reference
    // req.ip are rejected by newer express-rate-limit versions unless using
    // the provided ipKeyGenerator helper. For dev, rely on the default.
});
// Trading signal rate limiting (per user)
exports.signalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    // Keep default key generator. If per-user rate limiting is needed later,
    // replace with a compliant keyGenerator using ipKeyGenerator or similar.
    message: {
        success: false,
        error: 'Too many signal requests, please wait before requesting more',
        retryAfter: '1 minute',
    },
});
//# sourceMappingURL=rateLimiter.js.map