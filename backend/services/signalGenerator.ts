import { TradingSignal, MarketData, TechnicalIndicators } from '../../src/types';
import { TradingViewService } from './tradingViewService';

interface SignalGenerationOptions {
  symbols: string[];
  timeframes: string[];
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  minConfidence: number;
}

interface SignalStats {
  timeframe: string;
  pair?: string;
  signalType?: 'BUY' | 'SELL' | 'HOLD';
  minConfidence: number;
  totalSignals: number;
  successfulSignals: number;
  successRate: number;
  averageConfidence: number;
  averageReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export class SignalGenerator {
  private tradingViewService: TradingViewService;

  constructor() {
    this.tradingViewService = new TradingViewService();
  }

  async generateSignals(options: SignalGenerationOptions): Promise<TradingSignal[]> {
    const { symbols, timeframes, riskTolerance, minConfidence } = options;
    const signals: TradingSignal[] = [];

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          const signal = await this.generateSignalForSymbol(symbol, timeframe, riskTolerance);

          if (signal.confidence >= minConfidence) {
            signals.push(signal);
          }
        } catch (error) {
          console.error(`Failed to generate signal for ${symbol} ${timeframe}:`, error);
        }
      }
    }

    // Sort by confidence and timestamp
    return signals.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  private async generateSignalForSymbol(
    symbol: string,
    timeframe: string,
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  ): Promise<TradingSignal> {
    // Get market data and technical indicators
    const marketData = await this.tradingViewService.getHistoricalData(symbol, {
      timeframe,
      limit: 200
    });

    const technicalIndicators = await this.tradingViewService.calculateTechnicalIndicators(
      marketData,
      ['rsi', 'macd', 'bollinger', 'sma', 'ema', 'stochastic']
    );

    const currentPrice = marketData[marketData.length - 1].close;
    const signalType = this.analyzeMarketCondition(technicalIndicators, riskTolerance);
    const confidence = this.calculateConfidence(technicalIndicators, signalType, riskTolerance);

    const { stopLoss, takeProfit } = this.calculateRiskLevels(
      currentPrice,
      signalType,
      technicalIndicators,
      riskTolerance
    );

    const technicalRationale = this.generateTechnicalRationale(technicalIndicators, signalType);

    return {
      id: `signal_${Date.now()}_${symbol.replace('/', '')}`,
      pair: symbol,
      signalType,
      confidence,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      timestamp: new Date(),
      timeframe,
      indicators: {
        rsi: technicalIndicators.rsi[technicalIndicators.rsi.length - 1] || 50,
        macd: technicalIndicators.macd.macd[technicalIndicators.macd.macd.length - 1] || 0,
        bollinger: technicalIndicators.bollingerBands.upper[technicalIndicators.bollingerBands.upper.length - 1] || 0,
        volume: marketData[marketData.length - 1].volume
      },
      technicalRationale,
      riskLevel: this.getRiskLevel(confidence, riskTolerance),
      expiresAt: new Date(Date.now() + this.getExpirationTime(timeframe))
    };
  }

  private analyzeMarketCondition(
    indicators: TechnicalIndicators,
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  ): 'BUY' | 'SELL' | 'HOLD' {
    const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50;
    const currentMACD = indicators.macd.macd[indicators.macd.macd.length - 1] || 0;
    const currentMACDSignal = indicators.macd.signal[indicators.macd.signal.length - 1] || 0;
    const currentStoch = indicators.stochastic.k[indicators.stochastic.k.length - 1] || 50;
    const currentSMA = indicators.sma[indicators.sma.length - 1] || 0;
    const currentEMA = indicators.ema[indicators.ema.length - 1] || 0;

    let score = 0;
    let reasons = 0;

    // RSI analysis
    if (currentRSI < 30) {
      score += 2; // Strong buy signal
      reasons++;
    } else if (currentRSI < 40) {
      score += 1; // Buy signal
      reasons++;
    } else if (currentRSI > 70) {
      score -= 2; // Strong sell signal
      reasons++;
    } else if (currentRSI > 60) {
      score -= 1; // Sell signal
      reasons++;
    }

    // MACD analysis
    if (currentMACD > currentMACDSignal && currentMACD > 0) {
      score += 1.5; // Bullish crossover
      reasons++;
    } else if (currentMACD < currentMACDSignal && currentMACD < 0) {
      score -= 1.5; // Bearish crossover
      reasons++;
    }

    // Stochastic analysis
    if (currentStoch < 20) {
      score += 1; // Oversold
      reasons++;
    } else if (currentStoch > 80) {
      score -= 1; // Overbought
      reasons++;
    }

    // Moving average analysis
    if (currentEMA > currentSMA) {
      score += 0.5; // Bullish trend
      reasons++;
    } else if (currentEMA < currentSMA) {
      score -= 0.5; // Bearish trend
      reasons++;
    }

    // Apply risk tolerance adjustments
    const riskMultiplier = {
      CONSERVATIVE: 0.5,
      MODERATE: 1.0,
      AGGRESSIVE: 1.5
    }[riskTolerance];

    score *= riskMultiplier;

    // Determine signal based on adjusted score
    if (score >= 2 && reasons >= 2) {
      return 'BUY';
    } else if (score <= -2 && reasons >= 2) {
      return 'SELL';
    } else {
      return 'HOLD';
    }
  }

  private calculateConfidence(
    indicators: TechnicalIndicators,
    signalType: 'BUY' | 'SELL' | 'HOLD',
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  ): number {
    const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50;
    const currentMACD = indicators.macd.macd[indicators.macd.macd.length - 1] || 0;
    const currentStoch = indicators.stochastic.k[indicators.stochastic.k.length - 1] || 50;
    const currentVolume = indicators.volume[indicators.volume.length - 1] || 0;

    let confidence = 50; // Base confidence

    // RSI contribution
    if (signalType === 'BUY' && currentRSI < 40) {
      confidence += Math.min(20, (40 - currentRSI) / 2);
    } else if (signalType === 'SELL' && currentRSI > 60) {
      confidence += Math.min(20, (currentRSI - 60) / 2);
    }

    // MACD contribution
    const macdStrength = Math.abs(currentMACD);
    confidence += Math.min(15, macdStrength * 100);

    // Stochastic contribution
    if (signalType === 'BUY' && currentStoch < 30) {
      confidence += Math.min(15, (30 - currentStoch) / 2);
    } else if (signalType === 'SELL' && currentStoch > 70) {
      confidence += Math.min(15, (currentStoch - 70) / 2);
    }

    // Volume contribution (higher volume increases confidence)
    const avgVolume = indicators.volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
    if (currentVolume > avgVolume * 1.2) {
      confidence += 10;
    }

    // Risk tolerance adjustment
    const riskAdjustment = {
      CONSERVATIVE: -10,
      MODERATE: 0,
      AGGRESSIVE: 10
    }[riskTolerance];

    confidence += riskAdjustment;

    // Ensure confidence is within bounds
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private calculateRiskLevels(
    currentPrice: number,
    signalType: 'BUY' | 'SELL' | 'HOLD',
    indicators: TechnicalIndicators,
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  ): { stopLoss?: number; takeProfit?: number } {
    if (signalType === 'HOLD') {
      return {};
    }

    const currentATR = this.calculateATR(indicators);
    const riskMultiplier = {
      CONSERVATIVE: 1.5,
      MODERATE: 2.0,
      AGGRESSIVE: 3.0
    }[riskTolerance];

    const riskAmount = currentATR * riskMultiplier;

    if (signalType === 'BUY') {
      return {
        stopLoss: currentPrice - riskAmount,
        takeProfit: currentPrice + (riskAmount * 2) // 2:1 risk-reward ratio
      };
    } else {
      return {
        stopLoss: currentPrice + riskAmount,
        takeProfit: currentPrice - (riskAmount * 2) // 2:1 risk-reward ratio
      };
    }
  }

  private calculateATR(indicators: TechnicalIndicators): number {
    // Simplified ATR calculation using recent price ranges
    if (indicators.bollingerBands.upper.length < 14) {
      return 0; // Default if insufficient data
    }

    const recentUpper = indicators.bollingerBands.upper.slice(-14);
    const recentLower = indicators.bollingerBands.lower.slice(-14);

    let atr = 0;
    for (let i = 1; i < recentUpper.length; i++) {
      const tr = Math.abs(recentUpper[i] - recentLower[i]);
      atr += tr;
    }

    return atr / (recentUpper.length - 1);
  }

  private generateTechnicalRationale(
    indicators: TechnicalIndicators,
    signalType: 'BUY' | 'SELL' | 'HOLD'
  ): string {
    const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50;
    const currentMACD = indicators.macd.macd[indicators.macd.macd.length - 1] || 0;
    const currentMACDSignal = indicators.macd.signal[indicators.macd.signal.length - 1] || 0;
    const currentStoch = indicators.stochastic.k[indicators.stochastic.k.length - 1] || 50;

    const rationales = [];

    if (signalType === 'BUY') {
      if (currentRSI < 30) {
        rationales.push(`RSI oversold at ${currentRSI.toFixed(1)}`);
      } else if (currentRSI < 50) {
        rationales.push(`RSI showing strength at ${currentRSI.toFixed(1)}`);
      }

      if (currentMACD > currentMACDSignal) {
        rationales.push('MACD bullish crossover detected');
      }

      if (currentStoch < 20) {
        rationales.push(`Stochastic oversold at ${currentStoch.toFixed(1)}`);
      }
    } else if (signalType === 'SELL') {
      if (currentRSI > 70) {
        rationales.push(`RSI overbought at ${currentRSI.toFixed(1)}`);
      } else if (currentRSI > 50) {
        rationales.push(`RSI showing weakness at ${currentRSI.toFixed(1)}`);
      }

      if (currentMACD < currentMACDSignal) {
        rationales.push('MACD bearish crossover detected');
      }

      if (currentStoch > 80) {
        rationales.push(`Stochastic overbought at ${currentStoch.toFixed(1)}`);
      }
    } else {
      rationales.push('Mixed signals indicate uncertainty');
      rationales.push(`RSI neutral at ${currentRSI.toFixed(1)}`);
    }

    return rationales.join('; ') || 'Technical analysis inconclusive';
  }

  private getRiskLevel(
    confidence: number,
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (confidence >= 80) {
      return 'LOW';
    } else if (confidence >= 60) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  private getExpirationTime(timeframe: string): number {
    const timeframeMultipliers = {
      '1m': 5 * 60 * 1000,      // 5 minutes
      '5m': 30 * 60 * 1000,     // 30 minutes
      '15m': 60 * 60 * 1000,    // 1 hour
      '30m': 2 * 60 * 60 * 1000, // 2 hours
      '1h': 4 * 60 * 60 * 1000,   // 4 hours
      '4h': 24 * 60 * 60 * 1000,  // 24 hours
      '1d': 3 * 24 * 60 * 60 * 1000 // 3 days
    };

    return timeframeMultipliers[timeframe as keyof typeof timeframeMultipliers] || 4 * 60 * 60 * 1000;
  }

  // Database operations (would integrate with actual database)
  async getSignals(options: {
    page: number;
    limit: number;
    pair?: string;
    signalType?: 'BUY' | 'SELL' | 'HOLD';
    confidenceMin?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ data: TradingSignal[]; total: number }> {
    // Mock implementation - would integrate with database
    const mockSignals: TradingSignal[] = [
      {
        id: '1',
        pair: 'BTC/USDT',
        signalType: 'BUY',
        confidence: 85,
        entryPrice: 45000,
        stopLoss: 42000,
        takeProfit: 48000,
        timestamp: new Date(),
        timeframe: '1h',
        indicators: {
          rsi: 35,
          macd: 0.5,
          bollinger: -0.2,
          volume: 1000000
        },
        technicalRationale: 'RSI oversold, MACD bullish crossover, price near lower Bollinger Band',
        riskLevel: 'MEDIUM',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
      }
    ];

    // Apply filters
    let filteredSignals = mockSignals;

    if (options.pair) {
      filteredSignals = filteredSignals.filter(s => s.pair === options.pair);
    }

    if (options.signalType) {
      filteredSignals = filteredSignals.filter(s => s.signalType === options.signalType);
    }

    if (options.confidenceMin) {
      filteredSignals = filteredSignals.filter(s => s.confidence >= options.confidenceMin!);
    }

    if (options.riskLevel) {
      filteredSignals = filteredSignals.filter(s => s.riskLevel === options.riskLevel);
    }

    // Sort
    filteredSignals.sort((a, b) => {
      const aVal = a[options.sortBy as keyof TradingSignal] as any;
      const bVal = b[options.sortBy as keyof TradingSignal] as any;

      if (options.sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    // Paginate
    const start = (options.page - 1) * options.limit;
    const paginatedSignals = filteredSignals.slice(start, start + options.limit);

    return {
      data: paginatedSignals,
      total: filteredSignals.length
    };
  }

  async getSignalById(id: string): Promise<TradingSignal | null> {
    // Mock implementation
    return null;
  }

  async updateSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | null> {
    // Mock implementation
    return null;
  }

  async deleteSignal(id: string): Promise<boolean> {
    // Mock implementation
    return true;
  }

  async getActiveSignals(options: {
    pair?: string;
    signalType?: 'BUY' | 'SELL' | 'HOLD';
    limit: number;
  }): Promise<TradingSignal[]> {
    // Mock implementation - return signals that haven't expired
    return [];
  }

  async getSignalsForPair(pair: string, options: {
    timeframe: string;
    limit: number;
    signalType?: 'BUY' | 'SELL' | 'HOLD';
  }): Promise<TradingSignal[]> {
    // Mock implementation
    return [];
  }

  async validateSignal(id: string, validation: {
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
    actualEntryPrice?: number;
    actualExitPrice?: number;
    notes?: string;
  }): Promise<TradingSignal> {
    // Mock implementation
    throw new Error('Signal validation not implemented');
  }

  async getSignalStats(options: {
    timeframe: string;
    pair?: string;
    signalType?: 'BUY' | 'SELL' | 'HOLD';
    minConfidence: number;
  }): Promise<SignalStats> {
    // Mock implementation
    return {
      timeframe: options.timeframe,
      totalSignals: 100,
      successfulSignals: 68,
      successRate: 0.68,
      averageConfidence: 75,
      averageReturn: 0.05,
      maxDrawdown: 0.08,
      sharpeRatio: 1.2
    };
  }

  async getAccuracyByConfidence(timeframe: string): Promise<any> {
    // Mock implementation
    return {
      '50-60': 0.55,
      '60-70': 0.65,
      '70-80': 0.75,
      '80-90': 0.85,
      '90-100': 0.92
    };
  }
}