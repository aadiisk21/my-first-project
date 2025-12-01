import axios from 'axios';
import { MarketData, TradingPair, TechnicalIndicators } from '../../src/types';

export class BinanceService {
  private baseUrl = 'https://api.binance.com';
  private wsUrl = 'wss://stream.binance.com:9443';

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
        { symbol: 'UNIUSDT', baseAsset: 'UNI', quoteAsset: 'USDT' },
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
            volume: priceData.volume,
            lastUpdate: new Date(),
          };
        } catch (error) {
          console.warn(`Failed to fetch price for ${crypto.symbol}`, error);
          return {
            symbol: crypto.symbol,
            baseAsset: crypto.baseAsset,
            quoteAsset: crypto.quoteAsset,
            currentPrice: 0,
            priceChange: 0,
            priceChangePercent: 0,
            volume: 0,
            lastUpdate: new Date(),
          };
        }
      });

      return await Promise.all(pricePromises);
    } catch (error) {
      throw new Error(`Failed to fetch crypto pairs: ${error}`);
    }
  }

  // Get all available pairs from Binance
  async getAllPairs(): Promise<TradingPair[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/exchangeInfo`);
      const symbols = response.data.symbols
        .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
        .slice(0, 50) // Limit to first 50 for performance
        .map((s: any) => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
        }));

      // Fetch prices for all symbols
      const pricePromises = symbols.map(async (sym: any) => {
        try {
          const priceData = await this.getCurrentPrice(sym.symbol);
          return {
            symbol: sym.symbol,
            baseAsset: sym.baseAsset,
            quoteAsset: sym.quoteAsset,
            currentPrice: priceData.price,
            priceChange: priceData.change,
            priceChangePercent: priceData.changePercent,
            volume: priceData.volume,
            lastUpdate: new Date(),
          };
        } catch (error) {
          console.warn(`Failed to fetch price for ${sym.symbol}`, error);
          return {
            symbol: sym.symbol,
            baseAsset: sym.baseAsset,
            quoteAsset: sym.quoteAsset,
            currentPrice: 0,
            priceChange: 0,
            priceChangePercent: 0,
            volume: 0,
            lastUpdate: new Date(),
          };
        }
      });

      return await Promise.all(pricePromises);
    } catch (error) {
      console.error('Failed to fetch all pairs:', error);
      return this.getCryptoPairs(); // Fallback to crypto pairs
    }
  }

  // Placeholder for forex pairs (Binance doesn't offer forex)
  async getForexPairs(): Promise<TradingPair[]> {
    console.warn(
      'Binance does not support Forex trading. Returning crypto pairs instead.'
    );
    return this.getCryptoPairs();
  }

  // Placeholder for commodity pairs (Binance doesn't offer commodities)
  async getCommodityPairs(): Promise<TradingPair[]> {
    console.warn(
      'Binance does not support commodity trading. Returning crypto pairs instead.'
    );
    return this.getCryptoPairs();
  }

  async getCurrentPrice(symbol: string): Promise<{
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      const [ticker, _24hrTicker] = await Promise.all([
        axios.get(`${this.baseUrl}/api/v3/ticker/price`, {
          params: { symbol: cleanSymbol },
        }),
        axios.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
          params: { symbol: cleanSymbol },
        }),
      ]);

      return {
        price: parseFloat(ticker.data.price),
        change: parseFloat(_24hrTicker.data.priceChange),
        changePercent: parseFloat(_24hrTicker.data.priceChangePercent),
        volume: parseFloat(_24hrTicker.data.volume),
      };
    } catch (error) {
      throw new Error(`Failed to fetch price for ${symbol}: ${error}`);
    }
  }

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
      const { timeframe, limit } = options;
      const interval = this.mapTimeframe(timeframe);
      const cleanSymbol = symbol.replace('/', '');

      const params: any = {
        symbol: cleanSymbol,
        interval,
        limit: Math.min(limit, 1000), // Binance max is 1000
      };

      if (options.startDate) {
        params.startTime = options.startDate.getTime();
      }

      if (options.endDate) {
        params.endTime = options.endDate.getTime();
      }

      const response = await axios.get(`${this.baseUrl}/api/v3/klines`, {
        params,
      });

      return response.data.map((kline: any[]) => ({
        symbol,
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch historical data for ${symbol}: ${error}`
      );
    }
  }

  // Calculate technical indicators
  async calculateTechnicalIndicators(
    marketData: MarketData[],
    requestedIndicators: string[] = [
      'rsi',
      'macd',
      'bollinger',
      'sma',
      'ema',
      'stochastic',
    ]
  ): Promise<TechnicalIndicators> {
    const closes = marketData.map((d) => d.close);
    const highs = marketData.map((d) => d.high);
    const lows = marketData.map((d) => d.low);

    const indicators: TechnicalIndicators = {
      rsi: [],
      macd: { macd: [], signal: [], histogram: [] },
      bollingerBands: { upper: [], middle: [], lower: [] },
      sma: [],
      ema: [],
      stochastic: { k: [], d: [] },
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
    const pairs =
      category === 'crypto'
        ? await this.getCryptoPairs()
        : category === 'forex'
        ? await this.getForexPairs()
        : await this.getCommodityPairs();

    return pairs
      .filter((pair) => pair.priceChangePercent > 0)
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, limit);
  }

  // Get top losers
  async getTopLosers(category: string, limit: number): Promise<TradingPair[]> {
    const pairs =
      category === 'crypto'
        ? await this.getCryptoPairs()
        : category === 'forex'
        ? await this.getForexPairs()
        : await this.getCommodityPairs();

    return pairs
      .filter((pair) => pair.priceChangePercent < 0)
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, limit);
  }

  // Get volume leaders
  async getVolumeLeaders(
    category: string,
    limit: number
  ): Promise<TradingPair[]> {
    const pairs =
      category === 'crypto'
        ? await this.getCryptoPairs()
        : category === 'forex'
        ? await this.getForexPairs()
        : await this.getCommodityPairs();

    return pairs.sort((a, b) => b.volume - a.volume).slice(0, limit);
  }

  // Get market cap leaders
  async getMarketCapLeaders(
    category: string,
    limit: number
  ): Promise<TradingPair[]> {
    return this.getVolumeLeaders(category, limit);
  }

  // Search symbols
  async searchSymbols(
    query: string,
    category: string,
    limit: number
  ): Promise<TradingPair[]> {
    const pairs =
      category === 'crypto'
        ? await this.getCryptoPairs()
        : category === 'forex'
        ? await this.getForexPairs()
        : await this.getCommodityPairs();

    return pairs
      .filter(
        (pair) =>
          pair.symbol.toLowerCase().includes(query.toLowerCase()) ||
          pair.baseAsset.toLowerCase().includes(query.toLowerCase()) ||
          pair.quoteAsset.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);
  }

  // Get market sentiment
  async getMarketSentiment(symbol: string): Promise<{
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number;
    indicators: {
      rsi: string;
      macd: string;
      trend: string;
    };
  }> {
    try {
      const marketData = await this.getHistoricalData(symbol, {
        timeframe: '1h',
        limit: 100,
      });

      const indicators = await this.calculateTechnicalIndicators(marketData, [
        'rsi',
        'macd',
      ]);

      const lastRSI = indicators.rsi[indicators.rsi.length - 1] || 50;
      const lastMACD =
        indicators.macd.macd[indicators.macd.macd.length - 1] || 0;
      const lastSignal =
        indicators.macd.signal[indicators.macd.signal.length - 1] || 0;

      let score = 50; // Neutral
      let rsiFeel = 'NEUTRAL';
      let macdFeel = 'NEUTRAL';

      if (lastRSI > 70) {
        score += 20;
        rsiFeel = 'OVERBOUGHT';
      } else if (lastRSI < 30) {
        score -= 20;
        rsiFeel = 'OVERSOLD';
      } else if (lastRSI > 50) {
        score += 10;
        rsiFeel = 'BULLISH';
      } else if (lastRSI < 50) {
        score -= 10;
        rsiFeel = 'BEARISH';
      }

      if (lastMACD > lastSignal) {
        score += 15;
        macdFeel = 'BULLISH';
      } else if (lastMACD < lastSignal) {
        score -= 15;
        macdFeel = 'BEARISH';
      }

      score = Math.max(0, Math.min(100, score));
      const overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
        score > 60 ? 'BULLISH' : score < 40 ? 'BEARISH' : 'NEUTRAL';

      return {
        overall,
        score,
        indicators: {
          rsi: rsiFeel,
          macd: macdFeel,
          trend: overall,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get market sentiment for ${symbol}: ${error}`);
    }
  }

  // Technical Indicator Calculations
  private calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }

      if (i < period) {
        continue;
      }

      if (i === period) {
        gains /= period;
        losses /= period;
      } else {
        gains =
          (gains * (period - 1) +
            (prices[i] - prices[i - 1] > 0 ? prices[i] - prices[i - 1] : 0)) /
          period;
        losses =
          (losses * (period - 1) +
            (prices[i] - prices[i - 1] < 0 ? prices[i - 1] - prices[i] : 0)) /
          period;
      }

      const rs = gains / (losses || 0.0001);
      rsi.push(100 - 100 / (1 + rs));
    }

    return rsi;
  }

  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        ema.push(prices[i]);
      } else if (i < period) {
        ema.push(prices[i] * multiplier + ema[i - 1] * (1 - multiplier));
      } else {
        const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        ema.push(prices[i] * multiplier + ema[i - 1] * (1 - multiplier));
      }
    }

    return ema;
  }

  private calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ) {
    const ema12 = this.calculateEMA(prices, fastPeriod);
    const ema26 = this.calculateEMA(prices, slowPeriod);

    const macdLine: number[] = [];
    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }

    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram: number[] = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
    };
  }

  private calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ) {
    const sma = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance =
        slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const std = Math.sqrt(variance);

      upper.push(mean + std * stdDev);
      lower.push(mean - std * stdDev);
    }

    return {
      upper,
      middle: sma,
      lower,
    };
  }

  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14
  ) {
    const k: number[] = [];
    const d: number[] = [];

    for (let i = period - 1; i < closes.length; i++) {
      const highSlice = highs.slice(i - period + 1, i + 1);
      const lowSlice = lows.slice(i - period + 1, i + 1);
      const maxHigh = Math.max(...highSlice);
      const minLow = Math.min(...lowSlice);

      const kValue = ((closes[i] - minLow) / (maxHigh - minLow)) * 100;
      k.push(kValue);
    }

    for (let i = 2; i < k.length; i++) {
      const dValue = (k[i] + k[i - 1] + k[i - 2]) / 3;
      d.push(dValue);
    }

    return { k, d };
  }

  private mapTimeframe(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
    };

    return mapping[timeframe] || '1h';
  }
}
