import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import tradingRoutes from './api/trading.ts';
import signalRoutes from './api/signals.ts';
import userRoutes from './api/users.ts';
import { setupWebSocketHandlers } from './websocket/handler.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { rateLimiter } from './middleware/rateLimiter.ts';
import { connectDatabase } from './database/connection.ts';
import { connectRedis } from './database/redis.ts';

dotenv.config();

const app = express();
const server = createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

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
app.use('/api/trading', tradingRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/users', userRoutes);

// WebSocket connection handling
setupWebSocketHandlers(io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
// 404 handler (no path so it always matches when reached)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

const PORT = process.env.PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Connect to database (non-fatal in development)
    try {
      await connectDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbErr) {
      const dbError = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.warn(
        '⚠️ Database connection failed — continuing in degraded mode:',
        dbError
      );
    }

    // Connect to Redis (non-fatal in development)
    try {
      await connectRedis();
      console.log('✅ Redis connected successfully');
    } catch (redisErr) {
      const redisError =
        redisErr instanceof Error ? redisErr.message : String(redisErr);
      console.warn(
        '⚠️ Redis connection failed — continuing in degraded mode:',
        redisError
      );
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(
        `🌍 CORS enabled for: ${
          process.env.FRONTEND_URL || 'http://localhost:3000'
        }`
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function gracefulShutdown(signal: string) {
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
startServer();

export { app, io };
