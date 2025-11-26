import axios from 'axios';
import { MarketData, TradingPair, TechnicalIndicators } from '../../src/types';

interface TradingViewConfig {
  baseUrl: string;
  headers: {
    'User-Agent': string;
    'Accept': string;
    'Accept-Language': string;
  };
}

export class TradingViewService {
  private config: TradingViewConfig;

  constructor() {
    this.config = {
      baseUrl: 'https://scanner.tradingview.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    };
  }

  // Get cryptocurrency trading pairs
  async getCryptoPairs(): Promise<TradingPair[]> {
    try {
      const commonCryptos = [
        { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
        { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
        { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
        { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT' },
        { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT' },
        { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT' },
        { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT' },
        { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT' },
        { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT' },
        { symbol: 'UNIUSDT', baseAsset: 'UNI', quoteAsset: 'USDT' }
      ];

      // Get current prices for all pairs
      const pricePromises = commonCryptos.map(async (crypto) => {
        try {
          const priceData = await this.getCurrentPrice(crypto.symbol);
          return {
            symbol: crypto.symbol,
            baseAsset: crypto.baseAsset,
            quoteAsset: crypto.quoteAsset,
            currentPrice: priceData.price,
            priceChange: priceData.change,
            priceChangePercent: priceData.changePercent,
            volume: priceData.volume || 0,
            lastUpdate: new Date()
          } as TradingPair;
        } catch (error) {
          // Fallback to mock data if API fails
          const basePrice = this.getMockPrice(crypto.baseAsset);
          const change = (Math.random() - 0.5) * basePrice * 0.05;
          const changePercent = (change / basePrice) * 100;

          return {
            symbol: crypto.symbol,
            baseAsset: crypto.baseAsset,
            quoteAsset: crypto.quoteAsset,
            currentPrice: basePrice,
            priceChange: change,
            priceChangePercent: changePercent,
            volume: Math.random() * 1000000000,
            lastUpdate: new Date()
          } as TradingPair;
        }
      });

      return await Promise.all(pricePromises);
    } catch (error) {
      console.error('Error fetching crypto pairs:', error);
      throw new Error('Failed to fetch cryptocurrency pairs');
    }
  }

  // Get forex trading pairs
  async getForexPairs(): Promise<TradingPair[]> {
    const forexPairs = [
      { symbol: 'EURUSD', baseAsset: 'EUR', quoteAsset: 'USD' },
      { symbol: 'GBPUSD', baseAsset: 'GBP', quoteAsset: 'USD' },
      { symbol: 'USDJPY', baseAsset: 'USD', quoteAsset: 'JPY' },
      { symbol: 'USDCHF', baseAsset: 'USD', quoteAsset: 'CHF' },
      { symbol: 'AUDUSD', baseAsset: 'AUD', quoteAsset: 'USD' },
      { symbol: 'USDCAD', baseAsset: 'USD', quoteAsset: 'CAD' },
      { symbol: 'NZDUSD', baseAsset: 'NZD', quoteAsset: 'USD' }
    ];

    return forexPairs.map(pair => {
      const basePrice = this.getMockPrice(pair.baseAsset);
      const change = (Math.random() - 0.5) * basePrice * 0.01;
      const changePercent = (change / basePrice) * 100;

      return {
        ...pair,
        currentPrice: basePrice,
        priceChange: change,
        priceChangePercent: changePercent,
        volume: Math.random() * 100000000,
        lastUpdate: new Date()
      } as TradingPair;
    });
  }

  // Get commodity trading pairs
  async getCommodityPairs(): Promise<TradingPair[]> {
    const commodities = [
      { symbol: 'XAUUSD', baseAsset: 'XAU', quoteAsset: 'USD' }, // Gold
      { symbol: 'XAGUSD', baseAsset: 'XAG', quoteAsset: 'USD' }, // Silver
      { symbol: 'WTIUSD', baseAsset: 'WTI', quoteAsset: 'USD' }, // Crude Oil
      { symbol: 'BRENTUSD', baseAsset: 'BRENT', quoteAsset: 'USD' } // Brent Oil
    ];

    return commodities.map(commodity => {
      const basePrice = this.getMockPrice(commodity.baseAsset);
      const change = (Math.random() - 0.5) * basePrice * 0.02;
      const changePercent = (change / basePrice) * 100;

      return {
        ...commodity,
        currentPrice: basePrice,
        priceChange: change,
        priceChangePercent: changePercent,
        volume: Math.random() * 50000000,
        lastUpdate: new Date()
      } as TradingPair;
    });
  }

  // Get all available pairs
  async getAllPairs(): Promise<TradingPair[]> {
    const [crypto, forex, commodities] = await Promise.all([
      this.getCryptoPairs(),
      this.getForexPairs(),
      this.getCommodityPairs()
    ]);

    return [...crypto, ...forex, ...commodities];
  }

  // Get current price for a symbol
  async getCurrentPrice(symbol: string): Promise<{
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }> {
    try {
      // For demo purposes, generate mock price data
      // In production, this would make real API calls to TradingView or exchanges
      const basePrice = this.getMockPrice(symbol.replace('USDT', '').replace('USD', ''));
      const change = (Math.random() - 0.5) * basePrice * 0.05;
      const changePercent = (change / basePrice) * 100;

      return {
        price: basePrice + change,
        change,
        changePercent,
        volume: Math.random() * 1000000000
      };
    } catch (error) {
      // Fallback to mock data
      const basePrice = this.getMockPrice(symbol.replace('USDT', '').replace('USD', ''));
      return {
        price: basePrice,
        change: 0,
        changePercent: 0,
        volume: 0
      };
    }
  }

  // Get historical market data
  async getHistoricalData(
    symbol: string,
    options: {
      timeframe: string;
      limit: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<MarketData[]> {
    try {
      const { timeframe, limit, startDate, endDate } = options;
      const basePrice = this.getMockPrice(symbol.replace('USDT', '').replace('USD', ''));
      const data: MarketData[] = [];

      const now = endDate || new Date();
      const startTime = startDate || new Date(now.getTime() - limit * this.getTimeframeMs(timeframe));

      let currentTime = startTime;
      let previousPrice = basePrice * (0.95 + Math.random() * 0.1); // Start with some variation

      while (currentTime <= now && data.length < limit) {
        const volatility = 0.02; // 2% volatility
        const trend = Math.sin(data.length * 0.1) * 0.01; // Slight trend

        const open = previousPrice;
        const close = open * (1 + (Math.random() - 0.5) * volatility + trend);
        const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
        const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
        const volume = Math.random() * 1000000000;

        data.push({
          symbol,
          timestamp: new Date(currentTime),
          open,
          high,
          low,
          close,
          volume
        });

        previousPrice = close;
        currentTime = new Date(currentTime.getTime() + this.getTimeframeMs(timeframe));
      }

      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  }

  // Calculate technical indicators
  async calculateTechnicalIndicators(
    marketData: MarketData[],
    requestedIndicators: string[]
  ): Promise<TechnicalIndicators> {
    if (marketData.length < 20) {
      throw new Error('Insufficient data for technical indicators');
    }

    const closes = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    const volumes = marketData.map(d => d.volume);

    const indicators: TechnicalIndicators = {
      rsi: [],
      macd: { macd: [], signal: [], histogram: [] },
      bollingerBands: { upper: [], middle: [], lower: [] },
      sma: [],
      ema: [],
      stochastic: { k: [], d: [] }
    };

    // Calculate RSI
    if (requestedIndicators.includes('rsi')) {
      indicators.rsi = this.calculateRSI(closes, 14);
    }

    // Calculate SMA
    if (requestedIndicators.includes('sma')) {
      indicators.sma = this.calculateSMA(closes, 20);
    }

    // Calculate EMA
    if (requestedIndicators.includes('ema')) {
      indicators.ema = this.calculateEMA(closes, 20);
    }

    // Calculate MACD
    if (requestedIndicators.includes('macd')) {
      const macdData = this.calculateMACD(closes);
      indicators.macd = macdData;
    }

    // Calculate Bollinger Bands
    if (requestedIndicators.includes('bollinger')) {
      const bbData = this.calculateBollingerBands(closes, 20, 2);
      indicators.bollingerBands = bbData;
    }

    // Calculate Stochastic
    if (requestedIndicators.includes('stochastic')) {
      const stochData = this.calculateStochastic(highs, lows, closes, 14);
      indicators.stochastic = stochData;
    }

    return indicators;
  }

  // Get top gainers
  async getTopGainers(category: string, limit: number): Promise<TradingPair[]> {
    const pairs = category === 'crypto' ? await this.getCryptoPairs() :
                  category === 'forex' ? await this.getForexPairs() :
                  await this.getCommodityPairs();

    return pairs
      .filter(pair => pair.priceChangePercent > 0)
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, limit);
  }

  // Get top losers
  async getTopLosers(category: string, limit: number): Promise<TradingPair[]> {
    const pairs = category === 'crypto' ? await this.getCryptoPairs() :
                  category === 'forex' ? await this.getForexPairs() :
                  await this.getCommodityPairs();

    return pairs
      .filter(pair => pair.priceChangePercent < 0)
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, limit);
  }

  // Get volume leaders
  async getVolumeLeaders(category: string, limit: number): Promise<TradingPair[]> {
    const pairs = category === 'crypto' ? await this.getCryptoPairs() :
                  category === 'forex' ? await this.getForexPairs() :
                  await this.getCommodityPairs();

    return pairs
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  // Get market cap leaders (simplified)
  async getMarketCapLeaders(category: string, limit: number): Promise<TradingPair[]> {
    // For demo purposes, just return the same as volume leaders
    return this.getVolumeLeaders(category, limit);
  }

  // Search symbols
  async searchSymbols(query: string, category: string, limit: number): Promise<TradingPair[]> {
    const pairs = category === 'crypto' ? await this.getCryptoPairs() :
                  category === 'forex' ? await this.getForexPairs() :
                  await this.getCommodityPairs();

    return pairs
      .filter(pair =>
        pair.symbol.toLowerCase().includes(query.toLowerCase()) ||
        pair.baseAsset.toLowerCase().includes(query.toLowerCase()) ||
        pair.quoteAsset.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
  }

  // Get market sentiment (mock implementation)
  async getMarketSentiment(symbol: string): Promise<{
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number;
    indicators: {
      rsi: number;
      macd: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      moving_averages: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
  }> {
    // Mock sentiment calculation
    const score = Math.random() * 2 - 1; // -1 to 1
    const overall = score > 0.2 ? 'BULLISH' : score < -0.2 ? 'BEARISH' : 'NEUTRAL';

    return {
      overall,
      score,
      indicators: {
        rsi: Math.random() * 100,
        macd: Math.random() > 0.5 ? 'BULLISH' : Math.random() > 0.5 ? 'NEUTRAL' : 'BEARISH',
        moving_averages: Math.random() > 0.5 ? 'BULLISH' : Math.random() > 0.5 ? 'NEUTRAL' : 'BEARISH'
      }
    };
  }

  // Helper methods for technical indicators
  private calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }

    // Pad the beginning with null values
    return Array(period - 1).fill(0).concat(rsi);
  }

  private calculateSMA(prices: number[], period: number = 20): number[] {
    const sma: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }

    return Array(period - 1).fill(0).concat(sma);
  }

  private calculateEMA(prices: number[], period: number = 20): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for the first value
    const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(firstSMA);

    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }

    return Array(period - 1).fill(0).concat(ema);
  }

  private calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.calculateEMA(macdLine.filter(val => val !== 0), 9);
    const histogram = macdLine.map((val, i) => val - (signalLine[i - (macdLine.length - signalLine.length)] || 0));

    return {
      macd: macdLine,
      signal: Array(macdLine.length - signalLine.length).fill(0).concat(signalLine),
      histogram
    };
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);

      upper.push(mean + (standardDeviation * stdDev));
      lower.push(mean - (standardDeviation * stdDev));
    }

    return {
      upper: Array(period - 1).fill(0).concat(upper),
      middle,
      lower: Array(period - 1).fill(0).concat(lower)
    };
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { k: number[]; d: number[] } {
    const k: number[] = [];

    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const currentK = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(currentK);
    }

    const d = this.calculateSMA(k, 3);

    return {
      k: Array(period - 1).fill(0).concat(k),
      d: Array(period + 2).fill(0).concat(d)
    };
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframeMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };

    return timeframeMap[timeframe] || 60 * 60 * 1000; // Default to 1h
  }

  private getMockPrice(symbol: string): number {
    const priceMap: { [key: string]: number } = {
      'BTC': 45000,
      'ETH': 3000,
      'BNB': 300,
      'ADA': 0.5,
      'SOL': 100,
      'XRP': 0.6,
      'DOT': 20,
      'LINK': 15,
      'MATIC': 0.8,
      'UNI': 8,
      'EUR': 1.1,
      'GBP': 1.25,
      'JPY': 0.0067,
      'CHF': 1.05,
      'AUD': 0.65,
      'CAD': 0.75,
      'NZD': 0.6,
      'XAU': 1850,
      'XAG': 22,
      'WTI': 70,
      'BRENT': 75
    };

    return priceMap[symbol.toUpperCase()] || 100;
  }
}