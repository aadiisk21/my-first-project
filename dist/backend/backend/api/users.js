"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
const connection_1 = require("../database/connection");
const redis_1 = require("../database/redis");
const router = express_1.default.Router();
// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;
        if (!username || !email || !password) {
            throw new errorHandler_1.CustomError('Username, email, and password are required', 400);
        }
        // Check if user already exists
        const existingUser = await (0, connection_1.executeQuery)('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUser.length > 0) {
            throw new errorHandler_1.CustomError('User with this email or username already exists', 409);
        }
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        // Create user
        const result = await (0, connection_1.executeQuery)(`INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, username, email, first_name, last_name, created_at`, [username, email, hashedPassword, firstName, lastName]);
        const user = result[0];
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Cache user session
        await redis_1.cacheService.setUserSession(user.id, {
            userId: user.id,
            username: user.username,
            email: user.email,
            token,
        });
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    createdAt: user.created_at,
                },
                token,
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to register user',
        });
    }
});
// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new errorHandler_1.CustomError('Email and password are required', 400);
        }
        // Find user
        const result = await (0, connection_1.executeQuery)('SELECT id, username, email, password_hash, first_name, last_name, created_at FROM users WHERE email = $1', [email]);
        if (result.length === 0) {
            throw new errorHandler_1.CustomError('Invalid email or password', 401);
        }
        const user = result[0];
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new errorHandler_1.CustomError('Invalid email or password', 401);
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Cache user session
        await redis_1.cacheService.setUserSession(user.id, {
            userId: user.id,
            username: user.username,
            email: user.email,
            token,
        });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    createdAt: user.created_at,
                },
                token,
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to login',
        });
    }
});
// User logout
router.post('/logout', async (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            throw new errorHandler_1.CustomError('No token provided', 401);
        }
        // Verify and decode token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Remove from cache
        await redis_1.cacheService.deleteUserSession(decoded.userId);
        res.json({
            success: true,
            data: {
                message: 'Logged out successfully',
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to logout',
        });
    }
});
// Get user profile
router.get('/profile', async (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            throw new errorHandler_1.CustomError('No token provided', 401);
        }
        // Verify and decode token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Get user from cache or database
        let cachedUser = await redis_1.cacheService.getUserSession(decoded.userId);
        if (!cachedUser) {
            const result = await (0, connection_1.executeQuery)('SELECT id, username, email, first_name, last_name, created_at, updated_at FROM users WHERE id = $1', [decoded.userId]);
            if (result.length === 0) {
                throw new errorHandler_1.CustomError('User not found', 404);
            }
            const user = result[0];
            cachedUser = {
                userId: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            };
        }
        res.json({
            success: true,
            data: {
                user: cachedUser,
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get user profile',
        });
    }
});
// Get user portfolio (mock implementation)
router.get('/portfolio', async (req, res) => {
    try {
        // For now return a simple mock portfolio. In future, retrieve from DB
        const assets = [
            {
                symbol: 'BTC',
                amount: 0.5,
                currentPrice: 51200,
                value: 25600,
                change24h: 1200,
                changePercent24h: 2.4,
                entryPrice: 48000,
                unrealizedPnL: 1600,
                unrealizedPnLPercent: 6.7,
            },
            {
                symbol: 'ETH',
                amount: 5,
                currentPrice: 2850,
                value: 14250,
                change24h: 200,
                changePercent24h: 1.4,
                entryPrice: 2700,
                unrealizedPnL: 750,
                unrealizedPnLPercent: 5.6,
            },
        ];
        res.json({
            success: true,
            data: {
                assets,
                count: assets.length,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        res
            .status(500)
            .json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch portfolio',
        });
    }
});
// Update user preferences
router.put('/preferences', async (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        const { theme, timezone, currency, language, defaultTimeframe, chartSettings, alertSettings, } = req.body;
        if (!token) {
            throw new errorHandler_1.CustomError('No token provided', 401);
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        await (0, connection_1.executeQuery)(`INSERT INTO user_preferences (user_id, theme, timezone, currency, language, default_timeframe, chart_settings, alert_settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         theme = EXCLUDED.theme,
         timezone = EXCLUDED.timezone,
         currency = EXCLUDED.currency,
         language = EXCLUDED.language,
         default_timeframe = EXCLUDED.default_timeframe,
         chart_settings = EXCLUDED.chart_settings,
         alert_settings = EXCLUDED.alert_settings,
         updated_at = NOW()`, [
            decoded.userId,
            theme,
            timezone,
            currency,
            language,
            defaultTimeframe,
            JSON.stringify(chartSettings),
            JSON.stringify(alertSettings),
        ]);
        // Update cached session
        const cachedUser = await redis_1.cacheService.getUserSession(decoded.userId);
        if (cachedUser) {
            const typedCachedUser = cachedUser;
            typedCachedUser.preferences = {
                theme,
                timezone,
                currency,
                language,
                defaultTimeframe,
                chartSettings,
                alertSettings,
            };
            await redis_1.cacheService.setUserSession(decoded.userId, typedCachedUser);
        }
        res.json({
            success: true,
            data: {
                message: 'Preferences updated successfully',
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update preferences',
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map