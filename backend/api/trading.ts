import express from 'express';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { CustomError } from '../middleware/errorHandler';
import { MarketData, TradingPair, TechnicalIndicators } from '../../src/types';
import { TradingViewService } from '../services/tradingViewService';
import { BinanceService } from '../services/binanceService';

const router = express.Router();
const tradingViewService = new TradingViewService();
const binanceService = new BinanceService();

// Get all available trading pairs
router.get('/pairs', strictRateLimiter, async (req, res) => {
  try {
    const { category = 'crypto' } = req.query;

    let pairs: TradingPair[];

    switch (category) {
      case 'crypto':
        pairs = await tradingViewService.getCryptoPairs();
        break;
      case 'forex':
        pairs = await tradingViewService.getForexPairs();
        break;
      case 'commodities':
        pairs = await tradingViewService.getCommodityPairs();
        break;
      default:
        pairs = await tradingViewService.getAllPairs();
    }

    res.json({
      success: true,
      data: {
        pairs,
        category,
        total: pairs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trading pairs'
    });
  }
});

// Get real-time price data for a symbol
router.get('/price/:symbol', strictRateLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange = 'binance' } = req.query;

    if (!symbol) {
      throw new CustomError('Symbol is required', 400);
    }

    let priceData;

    switch (exchange) {
      case 'binance':
        priceData = await binanceService.getCurrentPrice(symbol);
        break;
      case 'tradingview':
        priceData = await tradingViewService.getCurrentPrice(symbol);
        break;
      default:
        throw new CustomError(`Unsupported exchange: ${exchange as string}`, 400);
    }

    res.json({
      success: true,
      data: {
        symbol,
        exchange,
        ...priceData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch price data'
    });
  }
});

// Get historical market data
router.get('/history/:symbol', strictRateLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    const {
      timeframe = '1h',
      limit = '100',
      startDate,
      endDate
    } = req.query;

    if (!symbol) {
      throw new CustomError('Symbol is required', 400);
    }

    const options = {
      timeframe: timeframe as string,
      limit: parseInt(limit as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    let marketData: MarketData[];

    // Try to get data from TradingView first, fallback to Binance
    try {
      marketData = await tradingViewService.getHistoricalData(symbol, options);
    } catch (tvError) {
      console.warn(`TradingView API failed for ${symbol}, falling back to Binance`);
      marketData = await binanceService.getHistoricalData(symbol, options);
    }

    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        data: marketData,
        count: marketData.length,
        startDate: marketData[0]?.timestamp,
        endDate: marketData[marketData.length - 1]?.timestamp,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch historical data'
    });
  }
});

// Get technical indicators for a symbol
router.get('/indicators/:symbol', strictRateLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    const {
      timeframe = '1h',
      indicators = 'rsi,macd,bollinger,sma,ema'
    } = req.query;

    if (!symbol) {
      throw new CustomError('Symbol is required', 400);
    }

    const requestedIndicators = (indicators as string).split(',').map(i => i.trim());
    const marketData = await tradingViewService.getHistoricalData(symbol, {
      timeframe: timeframe as string,
      limit: 200 // Need more data for accurate indicators
    });

    const technicalIndicators = await tradingViewService.calculateTechnicalIndicators(
      marketData,
      requestedIndicators
    );

    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        indicators: requestedIndicators,
        data: technicalIndicators,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate technical indicators'
    });
  }
});

// Get market overview (top movers, volume leaders, etc.)
router.get('/overview', async (req, res) => {
  try {
    const { category = 'crypto', limit = '20' } = req.query;
    const limitNum = parseInt(limit as string);

    const [
      topGainers,
      topLosers,
      volumeLeaders,
      marketCapLeaders
    ] = await Promise.all([
      tradingViewService.getTopGainers(category as string, limitNum),
      tradingViewService.getTopLosers(category as string, limitNum),
      tradingViewService.getVolumeLeaders(category as string, limitNum),
      tradingViewService.getMarketCapLeaders(category as string, limitNum)
    ]);

    res.json({
      success: true,
      data: {
        category,
        topGainers,
        topLosers,
        volumeLeaders,
        marketCapLeaders,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch market overview'
    });
  }
});

// Search for symbols
router.get('/search', async (req, res) => {
  try {
    const { q, category = 'crypto', limit = '10' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw new CustomError('Search query must be at least 2 characters', 400);
    }

    const searchResults = await tradingViewService.searchSymbols(
      q.trim(),
      category as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        query: q.trim(),
        category,
        results: searchResults,
        count: searchResults.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search symbols'
    });
  }
});

// Get market sentiment data
router.get('/sentiment/:symbol', strictRateLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      throw new CustomError('Symbol is required', 400);
    }

    const sentimentData = await tradingViewService.getMarketSentiment(symbol);

    res.json({
      success: true,
      data: {
        symbol,
        ...sentimentData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch market sentiment'
    });
  }
});

// WebSocket endpoint for real-time data subscription
router.post('/subscribe', (req, res) => {
  try {
    const { symbols, timeframes, client_id } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new CustomError('Symbols array is required', 400);
    }

    if (!client_id) {
      throw new CustomError('Client ID is required', 400);
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
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const statusCode = error instanceof CustomError ? error.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription'
    });
  }
});

export default router;