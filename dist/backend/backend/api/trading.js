"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const binanceService_1 = require("../services/binanceService");
const router = express_1.default.Router();
const binanceService = new binanceService_1.BinanceService();
// Get all available trading pairs
router.get('/pairs', rateLimiter_1.strictRateLimiter, async (req, res) => {
    try {
        const { category = 'crypto' } = req.query;
        let pairs;
        switch (category) {
            case 'crypto':
                pairs = await binanceService.getCryptoPairs();
                break;
            case 'forex':
                pairs = await binanceService.getForexPairs();
                break;
            case 'commodities':
                pairs = await binanceService.getCommodityPairs();
                break;
            default:
                pairs = await binanceService.getAllPairs();
        }
        res.json({
            success: true,
            data: {
                pairs,
                category,
                total: pairs.length,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch trading pairs',
        });
    }
});
// Get real-time price data for a symbol
router.get('/price/:symbol', rateLimiter_1.strictRateLimiter, async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            throw new errorHandler_1.CustomError('Symbol is required', 400);
        }
        // Use Binance as primary source
        const priceData = await binanceService.getCurrentPrice(symbol);
        res.json({
            success: true,
            data: {
                symbol,
                exchange: 'binance',
                ...priceData,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch price data',
        });
    }
});
// Get historical market data
router.get('/history/:symbol', rateLimiter_1.strictRateLimiter, async (req, res) => {
    var _a, _b;
    try {
        const { symbol } = req.params;
        const { timeframe = '1h', limit = '100', startDate, endDate } = req.query;
        if (!symbol) {
            throw new errorHandler_1.CustomError('Symbol is required', 400);
        }
        const options = {
            timeframe: timeframe,
            limit: parseInt(limit),
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };
        let marketData;
        // Fetch data from Binance
        marketData = await binanceService.getHistoricalData(symbol, options);
        res.json({
            success: true,
            data: {
                symbol,
                timeframe,
                data: marketData,
                count: marketData.length,
                startDate: (_a = marketData[0]) === null || _a === void 0 ? void 0 : _a.timestamp,
                endDate: (_b = marketData[marketData.length - 1]) === null || _b === void 0 ? void 0 : _b.timestamp,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch historical data',
        });
    }
});
// Get technical indicators for a symbol
router.get('/indicators/:symbol', rateLimiter_1.strictRateLimiter, async (req, res) => {
    try {
        const { symbol } = req.params;
        const { timeframe = '1h', indicators = 'rsi,macd,bollinger,sma,ema' } = req.query;
        if (!symbol) {
            throw new errorHandler_1.CustomError('Symbol is required', 400);
        }
        const requestedIndicators = indicators
            .split(',')
            .map((i) => i.trim());
        const marketData = await binanceService.getHistoricalData(symbol, {
            timeframe: timeframe,
            limit: 200, // Need more data for accurate indicators
        });
        const technicalIndicators = await binanceService.calculateTechnicalIndicators(marketData, requestedIndicators);
        res.json({
            success: true,
            data: {
                symbol,
                timeframe,
                indicators: requestedIndicators,
                data: technicalIndicators,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to calculate technical indicators',
        });
    }
});
// Get market overview (top movers, volume leaders, etc.)
router.get('/overview', async (req, res) => {
    try {
        const { category = 'crypto', limit = '20' } = req.query;
        const limitNum = parseInt(limit);
        const [topGainers, topLosers, volumeLeaders, marketCapLeaders] = await Promise.all([
            binanceService.getTopGainers(category, limitNum),
            binanceService.getTopLosers(category, limitNum),
            binanceService.getVolumeLeaders(category, limitNum),
            binanceService.getMarketCapLeaders(category, limitNum),
        ]);
        res.json({
            success: true,
            data: {
                category,
                topGainers,
                topLosers,
                volumeLeaders,
                marketCapLeaders,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch market overview',
        });
    }
});
// Search for symbols
router.get('/search', async (req, res) => {
    try {
        const { q, category = 'crypto', limit = '10' } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            throw new errorHandler_1.CustomError('Search query must be at least 2 characters', 400);
        }
        const searchResults = await binanceService.searchSymbols(q.trim(), category, parseInt(limit));
        res.json({
            success: true,
            data: {
                query: q.trim(),
                category,
                results: searchResults,
                count: searchResults.length,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search symbols',
        });
    }
});
// Get market sentiment data
router.get('/sentiment/:symbol', rateLimiter_1.strictRateLimiter, async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            throw new errorHandler_1.CustomError('Symbol is required', 400);
        }
        const sentimentData = await binanceService.getMarketSentiment(symbol);
        res.json({
            success: true,
            data: {
                symbol,
                ...sentimentData,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch market sentiment',
        });
    }
});
// WebSocket endpoint for real-time data subscription
router.post('/subscribe', (req, res) => {
    try {
        const { symbols, timeframes, client_id } = req.body;
        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            throw new errorHandler_1.CustomError('Symbols array is required', 400);
        }
        if (!client_id) {
            throw new errorHandler_1.CustomError('Client ID is required', 400);
        }
        // This would integrate with your WebSocket handler
        // For now, return subscription confirmation
        res.json({
            success: true,
            data: {
                subscription_id: `sub_${Date.now()}_${client_id}`,
                symbols,
                timeframes: timeframes || ['1h'],
                status: 'active',
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        const statusCode = error instanceof errorHandler_1.CustomError ? error.statusCode : 500;
        res.status(statusCode).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to create subscription',
        });
    }
});
exports.default = router;
//# sourceMappingURL=trading.js.map