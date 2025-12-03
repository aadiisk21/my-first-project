"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const trading_js_1 = __importDefault(require("./api/trading.js"));
const signals_js_1 = __importDefault(require("./api/signals.js"));
const users_js_1 = __importDefault(require("./api/users.js"));
const handler_js_1 = require("./websocket/handler.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const connection_js_1 = require("./database/connection.js");
const redis_js_1 = require("./database/redis.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
// Socket.IO setup with CORS
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
exports.io = io;
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'wss:', 'https:'],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
app.use(rateLimiter_js_1.rateLimiter);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});
// API routes
app.use('/api/trading', trading_js_1.default);
app.use('/api/signals', signals_js_1.default);
app.use('/api/users', users_js_1.default);
// WebSocket connection handling
(0, handler_js_1.setupWebSocketHandlers)(io);
// Error handling middleware
app.use(errorHandler_js_1.errorHandler);
// 404 handler
// 404 handler (no path so it always matches when reached)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
    });
});
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
async function startServer() {
    try {
        // Connect to database (non-fatal in development)
        try {
            await (0, connection_js_1.connectDatabase)();
            console.log('✅ Database connected successfully');
        }
        catch (dbErr) {
            const dbError = dbErr instanceof Error ? dbErr.message : String(dbErr);
            console.warn('⚠️ Database connection failed — continuing in degraded mode:', dbError);
        }
        // Connect to Redis (non-fatal in development)
        try {
            await (0, redis_js_1.connectRedis)();
            console.log('✅ Redis connected successfully');
        }
        catch (redisErr) {
            const redisError = redisErr instanceof Error ? redisErr.message : String(redisErr);
            console.warn('⚠️ Redis connection failed — continuing in degraded mode:', redisError);
        }
        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
            console.log(`📡 WebSocket server ready for connections`);
            console.log(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
        console.log('✅ HTTP server closed');
        // Close database connections
        // (Add database cleanup here)
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    });
    // Force close after 30 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});
// Start the server
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=server.js.map