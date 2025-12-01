"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocketHandlers = setupWebSocketHandlers;
exports.broadcastSignal = broadcastSignal;
exports.broadcastPriceUpdate = broadcastPriceUpdate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../middleware/errorHandler");
// Store client subscriptions
const clientSubscriptions = new Map();
function setupWebSocketHandlers(io) {
    // Authentication middleware
    io.use(async (socket, next) => {
        var _a;
        try {
            const token = socket.handshake.auth.token || ((_a = socket.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', ''));
            if (!token) {
                return next(new errorHandler_1.CustomError('Authentication token required', 401));
            }
            // Verify JWT token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            // Initialize client subscription
            clientSubscriptions.set(socket.id, {
                pairs: [],
                timeframes: ['1h'],
                signals: true,
                lastActivity: new Date()
            });
            next();
        }
        catch (error) {
            next(new errorHandler_1.CustomError('Invalid authentication token', 401));
        }
    });
    io.on('connection', (socket) => {
        console.log(`🔗 Client connected: ${socket.id} (User: ${socket.userId})`);
        // Send initial connection acknowledgment
        socket.emit('CONNECTED', {
            message: 'Connected to trading bot WebSocket',
            clientId: socket.id,
            timestamp: new Date().toISOString()
        });
        // Handle client messages
        socket.on('message', async (message) => {
            try {
                await handleMessage(socket, message);
            }
            catch (error) {
                socket.emit('ERROR', {
                    type: 'MESSAGE_ERROR',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Handle specific events
        socket.on('SUBSCRIBE_PAIRS', async (data) => {
            await handleSubscribePairs(socket, data);
        });
        socket.on('UNSUBSCRIBE_PAIRS', async (data) => {
            await handleUnsubscribePairs(socket, data);
        });
        socket.on('GET_SIGNALS', async (data) => {
            await handleGetSignals(socket, data);
        });
        socket.on('GET_MARKET_DATA', async (data) => {
            await handleGetMarketData(socket, data);
        });
        socket.on('SET_PREFERENCES', (preferences) => {
            socket.userPreferences = preferences;
            const subscription = clientSubscriptions.get(socket.id);
            if (subscription) {
                subscription.lastActivity = new Date();
            }
        });
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
            clientSubscriptions.delete(socket.id);
        });
        // Handle connection errors
        socket.on('error', (error) => {
            console.error(`❌ Socket error for ${socket.id}:`, error);
        });
    });
    // Cleanup inactive connections periodically
    setInterval(() => {
        const now = new Date();
        for (const [socketId, subscription] of clientSubscriptions.entries()) {
            const inactiveTime = now.getTime() - subscription.lastActivity.getTime();
            // Remove connections inactive for more than 30 minutes
            if (inactiveTime > 30 * 60 * 1000) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect(true);
                }
                clientSubscriptions.delete(socketId);
            }
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
}
async function handleMessage(socket, message) {
    const subscription = clientSubscriptions.get(socket.id);
    if (subscription) {
        subscription.lastActivity = new Date();
    }
    switch (message.type) {
        case 'SUBSCRIBE_PAIRS':
            await handleSubscribePairs(socket, message.data);
            break;
        case 'UNSUBSCRIBE_PAIRS':
            await handleUnsubscribePairs(socket, message.data);
            break;
        case 'GET_SIGNALS':
            await handleGetSignals(socket, message.data);
            break;
        case 'GET_MARKET_DATA':
            await handleGetMarketData(socket, message.data);
            break;
        default:
            throw new errorHandler_1.CustomError(`Unknown message type: ${message.type}`, 400);
    }
}
async function handleSubscribePairs(socket, data) {
    const { pairs, timeframes = ['1h'] } = data;
    const subscription = clientSubscriptions.get(socket.id);
    if (!subscription) {
        throw new errorHandler_1.CustomError('Client subscription not found', 404);
    }
    // Add new pairs and timeframes
    subscription.pairs = [...new Set([...subscription.pairs, ...pairs])];
    subscription.timeframes = [...new Set([...subscription.timeframes, ...timeframes])];
    socket.emit('SUBSCRIPTION_UPDATED', {
        pairs: subscription.pairs,
        timeframes: subscription.timeframes,
        timestamp: new Date().toISOString()
    });
    // Send current market data for subscribed pairs
    for (const pair of pairs) {
        try {
            const marketData = await getMarketDataForPair(pair, timeframes[0]);
            socket.emit('MARKET_DATA', {
                symbol: pair,
                timeframe: timeframes[0],
                data: marketData,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            socket.emit('ERROR', {
                type: 'MARKET_DATA_ERROR',
                symbol: pair,
                error: error instanceof Error ? error.message : 'Failed to fetch market data'
            });
        }
    }
}
async function handleUnsubscribePairs(socket, data) {
    const { pairs } = data;
    const subscription = clientSubscriptions.get(socket.id);
    if (!subscription) {
        throw new errorHandler_1.CustomError('Client subscription not found', 404);
    }
    subscription.pairs = subscription.pairs.filter(pair => !pairs.includes(pair));
    socket.emit('SUBSCRIPTION_UPDATED', {
        pairs: subscription.pairs,
        timeframes: subscription.timeframes,
        timestamp: new Date().toISOString()
    });
}
async function handleGetSignals(socket, data) {
    const { limit = 50, pair } = data;
    try {
        const signals = await getSignalsForUser(socket.userId, { limit, pair });
        socket.emit('SIGNALS', {
            signals,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        socket.emit('ERROR', {
            type: 'SIGNALS_ERROR',
            error: error instanceof Error ? error.message : 'Failed to fetch signals'
        });
    }
}
async function handleGetMarketData(socket, data) {
    const { symbol, timeframe = '1h' } = data;
    try {
        const marketData = await getMarketDataForPair(symbol, timeframe);
        socket.emit('MARKET_DATA', {
            symbol,
            timeframe,
            data: marketData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        socket.emit('ERROR', {
            type: 'MARKET_DATA_ERROR',
            symbol,
            error: error instanceof Error ? error.message : 'Failed to fetch market data'
        });
    }
}
// Helper functions (these would connect to your data sources)
async function getMarketDataForPair(symbol, timeframe) {
    // This would fetch real data from your trading APIs
    // For now, return mock data
    const mockData = [];
    const basePrice = symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3000 : 100;
    for (let i = 0; i < 100; i++) {
        const variation = (Math.random() - 0.5) * basePrice * 0.02;
        const price = basePrice + variation;
        mockData.push({
            symbol,
            timestamp: new Date(Date.now() - (100 - i) * 60 * 60 * 1000), // Hourly data
            open: price * (1 + (Math.random() - 0.5) * 0.01),
            high: price * (1 + Math.random() * 0.02),
            low: price * (1 - Math.random() * 0.02),
            close: price,
            volume: Math.random() * 1000000
        });
    }
    return mockData;
}
async function getSignalsForUser(userId, options) {
    // This would fetch real signals from your database
    // For now, return mock signals
    const mockSignals = [
        {
            id: '1',
            pair: options.pair || 'BTC/USDT',
            signalType: 'BUY',
            confidence: 85,
            entryPrice: 45000,
            stopLoss: 43000,
            takeProfit: 48000,
            timestamp: new Date(),
            timeframe: '1h',
            indicators: {
                rsi: 35,
                macd: 0.5,
                bollinger: -0.2,
                volume: 1.5
            },
            technicalRationale: 'RSI oversold, MACD bullish crossover, price near lower Bollinger Band',
            riskLevel: 'MEDIUM',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
    ];
    return mockSignals.slice(0, options.limit);
}
// Export functions for broadcasting signals to clients
function broadcastSignal(io, signal) {
    io.emit('NEW_SIGNAL', {
        signal,
        timestamp: new Date().toISOString()
    });
}
function broadcastPriceUpdate(io, symbol, price, change, changePercent) {
    io.emit('PRICE_UPDATE', {
        symbol,
        price,
        change,
        changePercent,
        timestamp: new Date().toISOString()
    });
}
//# sourceMappingURL=handler.js.map