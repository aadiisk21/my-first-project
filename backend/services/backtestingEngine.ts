import { MarketData, TradingSignal, TechnicalIndicators } from '../../src/types';
import { SMCAnalysis } from './mcAnalysis';
import { VolumeProfileAnalysis } from './volumeProfileAnalysis';
import { MarketPsychologyAnalysis } from './marketPsychologyAnalysis';
import { FibonacciAnalysis } from './fibonacciAnalysis';
import { ICTAnalysis } from './ictAnalysis';
import { logger } from '../utils/logger';

// Enhanced interfaces for comprehensive backtesting
interface BacktestConfig {
  slippageModel: {
    commissionPercent: number;
    slippage: number;
    impactCost: number;
    liquidityCost: number;
    latencyMs: number;
  };
  timeframe: string;
  initialCapital: number;
  riskPerTrade: number; // 1% = 0.01 of capital
  maxDrawdown: number; // 5% maximum
  priceImpactSlippage: number; // How much price movement affects fills
  volumeImpactSlippage: number; // How much volume affects fills
  marketHours: number; // Number of trading hours per day
  weeklyTradingDays: number; // Number of trading days per week
  requiredWinRate: number; // Minimum win rate to be profitable (excluding compounding)
  maxOpenPositions: number; // Maximum simultaneous positions
  useLeverage: boolean; // Use leverage (compounds wins/losses)
  compoundFrequency: string; // 'none', 'daily', 'weekly', 'monthly'
  enableMarginTrading: boolean; // Enable margin trading (can lose more than 100% of position)
  retestFrequency: string; // How often to retest models
  sharpeRatio: number; // Kelly criterion growth target
  optimizationTarget: 'profit' | 'sharpe' | 'sortino';
  enableSentimentAnalysis: boolean; // Include news/social sentiment in signals
  maxHistoricalDataPoints: number; // Maximum historical data points for backtesting
  volatilityWindow: number; // ATR window for volatility calculation
  riskFreeRate: number; // Risk-free rate for calculations
  inflationRate: number; // Annual inflation rate for calculations
}

interface Trade {
  entryPrice: number;
  entryTime: Date;
  exitPrice: number;
  exitTime: Date;
  quantity: number;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  stopLoss: number;
  takeProfit: number | null;
  fees: {
    commission: number;
    slippage: number;
    impact: number;
    liquidity: number;
    latency: number;
  };
  commissionPercent: number;
  slippageCost: number;
  netPnL: number;
  riskAdjustedQuantity: number;
  duration: number; // In milliseconds
  timeframe: string;
  pnl: number; // Profit/Loss
  rrr: number; // Risk-adjusted return
  maxDrawdown: number;
  isWin: boolean;
  isPartialWin: boolean;
  isPush: boolean;
  reason?: string;
  marketConditions: string[];
}

interface BacktestStrategy {
  name: string;
  description: string;
  parameters: {
    [key: string]: any;
  };
  rules: {
    entry: {
      [key: string]: any;
    };
    exit: {
      [key: string]: any;
    };
    riskManagement: {
      [key: string]: any;
    };
  };
  enableLeverage?: boolean;
  enableMargin?: boolean;
  maxPositionSize?: number;
}

interface BacktestResult {
  strategy: BacktestStrategy;
  config: BacktestConfig;
  marketData: MarketData[];
  closedTrades: Trade[];
  openTrades: Trade[];
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  calmarRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  annualizedReturn: number;
  volatility: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  treynorRatio: number;
  var95: number; // Value at Risk at 95% confidence
  cvar95: number; // Conditional Value at Risk at 95% confidence
  kellyCriterion: number;
  totalFees: number;
  totalSlippage: number;
  averageTradeDuration: number;
  bestTrade: Trade;
  worstTrade: Trade;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  monthlyReturns: { month: string; return: number; volatility: number }[];
  equityCurve: { date: Date; equity: number; drawdown: number }[];
  performanceMetrics: {
    [key: string]: number;
  };
  riskMetrics: {
    [key: string]: number;
  };
}

interface ComparativeBacktestResult {
  strategies: StrategyResult[];
  summary: {
    bestSharpeRatio: string;
    bestTotalReturn: string;
    bestWinRate: string;
    lowestDrawdown: string;
    mostConsistent: string;
  };
  recommendations: string[];
  correlationMatrix: { [key: string]: { [key: string]: number } };
  optimalPortfolio: OptimalPortfolio;
}

interface StrategyResult {
  strategyName: string;
  strategy: BacktestStrategy;
  periods: PeriodResult[];
  overallRanking: number;
  riskAdjustedPerformance: number;
  consistency: number;
  marketRegimePerformance: { regime: string; performance: number }[];
}

interface PeriodResult {
  period: string;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWinLoss: number;
  totalTrades: number;
  expectancy: number;
  calmarRatio: number;
  sortinoRatio: number;
  annualizedReturn: number;
}

interface OptimalPortfolio {
  strategyWeights: {
    strategy: string;
    weight: number;
    expectedReturn: number;
    riskContribution: number;
  }[];
  portfolioMetrics: {
    expectedReturn: number;
    expectedVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    var95: number;
  };
  efficientFrontier: {
    portfolios: { return: number; volatility: number; sharpe: number }[];
    optimalPoint: { return: number; volatility: number; sharpe: number };
  };
  riskContributions: {
    strategy: string;
    contribution: number;
    percentage: number;
  }[];
}

interface SimulationResult {
  totalSimulations: number;
  meanReturn: number;
  stdReturn: number;
  percentile5: number;
  percentile95: number;
  successRate: number;
  meanSharpeRatio: number;
  worstDrawdown: number;
  bestSimulation: BacktestResult;
  worstSimulation: BacktestResult;
}

interface InstitutionalMetrics {
  smartMoneyExposure: number;
  institutionalOrderFlow: number;
  liquidityDepthScore: number;
  marketManipulationScore: number;
  insiderActivityIndex: number;
  regulatoryComplianceScore: number;
  esgScore: number;
  macroEconomicExposure: number;
}

export class BacktestingEngine {
  private config: BacktestConfig;
  private marketData: MarketData[];
  private smcAnalysis: SMCAnalysis;
  private volumeProfileAnalysis: VolumeProfileAnalysis;
  private psychologyAnalysis: MarketPsychologyAnalysis;
  private fibonacciAnalysis: FibonacciAnalysis;
  private ictAnalysis: ICTAnalysis;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.marketData = [];
    this.smcAnalysis = new SMCAnalysis();
    this.volumeProfileAnalysis = new VolumeProfileAnalysis();
    this.psychologyAnalysis = new MarketPsychologyAnalysis();
    this.fibonacciAnalysis = new FibonacciAnalysis();
    this.ictAnalysis = new ICTAnalysis();
  }

  async loadMarketData(symbol: string, timeframe: string, startDate: Date, endDate: Date): Promise<void> {
    // This would typically fetch from database or API
    logger.info(`Loading market data for ${symbol} ${timeframe} from ${startDate} to ${endDate}`);

    // For now, we'll assume this is populated
    this.marketData = []; // Would be populated with actual data
  }

  // Enhanced fee and slippage calculation for institutional-grade simulation
  private calculateInstitutionalSlippage(
    tradeSize: number,
    marketPrice: number,
    volumeProfile: any,
    orderBookDepth: number = 10
  ): { totalCost: number; slippage: number; impact: number; liquidity: number; latency: number } {
    const config = this.config.slippageModel;

    // Volume-based slippage (institutional model)
    const avgVolume = volumeProfile?.averageVolume || 1000000; // Default 1M base volume
    const volumeRatio = Math.min(tradeSize / avgVolume, 1);

    // Square root slippage model (market impact theory)
    const baseSlippage = config.slippage * Math.sqrt(volumeRatio) * 0.01;

    // Price impact calculation
    const priceImpact = config.priceImpactSlippage * Math.pow(tradeSize / 100000, 0.5) * 0.0001;

    // Liquidity cost simulation
    const liquidityCost = config.liquidityCost * (1 + volumeRatio * 2) * 0.001;

    // Latency cost (time-based execution risk)
    const latencyWindow = config.latencyMs / 1000; // Convert to seconds
    const volatilityFactor = this.getCurrentVolatility(marketPrice) || 0.02;
    const latencyCost = tradeSize * volatilityFactor * Math.sqrt(latencyWindow) * 0.1;

    // Commission with volume discounts (institutional pricing)
    const commissionRate = this.getInstitutionalCommissionRate(tradeSize);
    const commission = tradeSize * commissionRate;

    return {
      totalCost: baseSlippage + priceImpact + liquidityCost + latencyCost + commission,
      slippage: baseSlippage,
      impact: priceImpact,
      liquidity: liquidityCost,
      latency: latencyCost
    };
  }

  private getInstitutionalCommissionRate(tradeSize: number): number {
    const config = this.config.slippageModel;

    // Volume-based commission tiers (institutional pricing)
    if (tradeSize > 10000000) return config.commissionPercent * 0.2; // High volume discount
    if (tradeSize > 1000000) return config.commissionPercent * 0.4;
    if (tradeSize > 100000) return config.commissionPercent * 0.6;
    return config.commissionPercent;
  }

  private getCurrentVolatility(marketPrice: number): number | null {
    // Get recent volatility for latency cost calculation
    const recentPrices = this.marketData.slice(-20).map(d => d.close);
    if (recentPrices.length < 2) return null;

    const returns = [];
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  async runBacktest(
    strategy: BacktestStrategy,
    options: {
      startDate?: Date;
      endDate?: Date;
      enableLeverage?: boolean;
      initialCapital?: number;
    } = {}
  ): Promise<BacktestResult> {
    const startDate = options.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate || new Date();
    const enableLeverage = options.enableLeverage || this.config.useLeverage;
    const initialCapital = options.initialCapital || this.config.initialCapital;

    logger.info(`Starting backtest for strategy: ${strategy.name}`);

    await this.loadMarketData('BTC/USDT', this.config.timeframe, startDate, endDate);

    const trades: Trade[] = [];
    const openTrades: Trade[] = [];
    const equityCurve: { date: Date; equity: number; drawdown: number }[] = [];

    let currentCapital = initialCapital;
    let maxEquity = initialCapital;
    let currentDrawdown = 0;
    let maxDrawdown = 0;

    // Simulate trading
    for (let i = 0; i < this.marketData.length; i++) {
      const currentBar = this.marketData[i];
      const previousBars = this.marketData.slice(0, i);

      if (previousBars.length < 50) continue; // Need minimum history

      // Generate signals using all analysis methods
      const signals = await this.generateComprehensiveSignals(currentBar, previousBars, strategy);

      // Process exits first
      await this.processExits(openTrades, currentBar, signals, i);

      // Process new entries
      if (openTrades.length < this.config.maxOpenPositions) {
        const newTrades = await this.processEntries(signals, currentBar, currentCapital, i);
        openTrades.push(...newTrades);
      }

      // Update equity curve
      const openEquity = openTrades.reduce((sum, trade) => {
        const currentPnL = this.calculateUnrealizedPnL(trade, currentBar.close);
        return sum + currentPnL;
      }, 0);

      const totalEquity = currentCapital + openEquity;
      const drawdown = maxEquity > 0 ? (maxEquity - totalEquity) / maxEquity : 0;

      equityCurve.push({
        date: currentBar.timestamp,
        equity: totalEquity,
        drawdown: drawdown
      });

      if (totalEquity > maxEquity) {
        maxEquity = totalEquity;
      }

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // Check for margin calls if enabled
      if (enableLeverage && this.config.enableMarginTrading) {
        await this.checkMarginCalls(openTrades, currentCapital, totalEquity);
      }
    }

    // Close any remaining open trades
    for (const trade of openTrades) {
      trades.push(await this.closeTrade(trade, this.marketData[this.marketData.length - 1].close, 'End of backtest'));
    }

    // Calculate comprehensive metrics
    const result = await this.calculateBacktestMetrics(trades, equityCurve, initialCapital, strategy);

    logger.info(`Backtest completed for ${strategy.name}: ${result.totalReturnPercent.toFixed(2)}% return, ${result.sharpeRatio.toFixed(2)} Sharpe ratio`);

    return result;
  }

  private async generateComprehensiveSignals(
    currentBar: MarketData,
    previousBars: MarketData[],
    strategy: BacktestStrategy
  ): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    try {
      // SMC Analysis
      const smcResult = await this.smcAnalysis.analyzeMarketData(previousBars);
      if (smcResult.signals) {
        signals.push(...smcResult.signals.map(s => ({
          ...s,
          source: 'SMC',
          confidence: s.confidence * 0.9
        })));
      }

      // ICT Analysis
      const ictResult = await this.ictAnalysis.identifyMarketStructure(previousBars);
      if (ictResult.signals) {
        signals.push(...ictResult.signals.map(s => ({
          ...s,
          source: 'ICT',
          confidence: s.confidence * 0.85
        })));
      }

      // Volume Profile Analysis
      const volumeResult = await this.volumeProfileAnalysis.analyzeVolumeProfile(previousBars);
      if (volumeResult.signals) {
        signals.push(...volumeResult.signals.map(s => ({
          ...s,
          source: 'Volume',
          confidence: s.confidence * 0.8
        })));
      }

      // Market Psychology Analysis
      const psychologyResult = await this.psychologyAnalysis.calculateFearGreedIndex(previousBars);
      if (psychologyResult.signals) {
        signals.push(...psychologyResult.signals.map(s => ({
          ...s,
          source: 'Psychology',
          confidence: s.confidence * 0.7
        })));
      }

      // Fibonacci Analysis
      const fibResult = await this.fibonacciAnalysis.calculateFibonacciLevels(previousBars);
      if (fibResult.signals) {
        signals.push(...fibResult.signals.map(s => ({
          ...s,
          source: 'Fibonacci',
          confidence: s.confidence * 0.75
        })));
      }

      // Filter signals based on strategy parameters
      return this.filterSignalsByStrategy(signals, strategy);

    } catch (error) {
      logger.error('Error generating comprehensive signals:', error);
      return [];
    }
  }

  private filterSignalsByStrategy(signals: TradingSignal[], strategy: BacktestStrategy): TradingSignal[] {
    return signals.filter(signal => {
      // Apply strategy-specific filters
      if (signal.confidence < (strategy.parameters.minConfidence || 0.7)) return false;
      if (signal.strength < (strategy.parameters.minStrength || 0.6)) return false;

      // Risk management filters
      const riskSettings = strategy.rules.riskManagement;
      if (signal.riskRewardRatio < (riskSettings.minRiskRewardRatio || 1.0)) return false;

      return true;
    });
  }

  private async processEntries(
    signals: TradingSignal[],
    currentBar: MarketData,
    currentCapital: number,
    barIndex: number
  ): Promise<Trade[]> {
    const newTrades: Trade[] = [];

    for (const signal of signals) {
      if (signal.type === 'BUY' || signal.type === 'SELL') {
        const positionSize = this.calculatePositionSize(currentCapital, signal, currentBar.close);

        if (positionSize > 0) {
          const fees = this.calculateInstitutionalSlippage(positionSize, currentBar.close, null);

          const trade: Trade = {
            entryPrice: currentBar.close,
            entryTime: currentBar.timestamp,
            exitPrice: 0,
            exitTime: new Date(),
            quantity: positionSize,
            type: signal.type,
            confidence: signal.confidence,
            stopLoss: signal.stopLoss || currentBar.close * 0.98,
            takeProfit: signal.takeProfit || currentBar.close * 1.02,
            fees: fees,
            commissionPercent: this.config.slippageModel.commissionPercent,
            slippageCost: fees.totalCost,
            netPnL: 0,
            riskAdjustedQuantity: positionSize,
            duration: 0,
            timeframe: this.config.timeframe,
            pnl: 0,
            rrr: 0,
            maxDrawdown: 0,
            isWin: false,
            isPartialWin: false,
            isPush: false,
            marketConditions: this.analyzeMarketConditions(barIndex)
          };

          newTrades.push(trade);
        }
      }
    }

    return newTrades;
  }

  private calculatePositionSize(currentCapital: number, signal: TradingSignal, price: number): number {
    const riskAmount = currentCapital * this.config.riskPerTrade;
    const stopLossDistance = Math.abs(price - (signal.stopLoss || price * 0.98));
    const riskPerShare = stopLossDistance;

    let positionSize = riskAmount / riskPerShare;

    // Apply Kelly criterion if enabled
    if (signal.winRate && signal.averageWin && signal.averageLoss) {
      const winProbability = signal.winRate;
      const averageWin = signal.averageWin;
      const averageLoss = Math.abs(signal.averageLoss);
      const kellyFraction = (winProbability * averageWin - (1 - winProbability) * averageLoss) / averageWin;

      // Conservative Kelly (25% of full Kelly)
      positionSize = Math.min(positionSize, currentCapital * Math.max(0, kellyFraction * 0.25));
    }

    // Apply maximum position size
    const maxPositionValue = currentCapital * 0.2; // 20% max per position
    positionSize = Math.min(positionSize, maxPositionValue / price);

    return Math.floor(positionSize * 100) / 100; // Round to 2 decimal places
  }

  private analyzeMarketConditions(barIndex: number): string[] {
    const conditions: string[] = [];
    const currentBar = this.marketData[barIndex];
    const previousBars = this.marketData.slice(Math.max(0, barIndex - 20), barIndex);

    if (previousBars.length < 10) return conditions;

    // Calculate basic market conditions
    const recentPrices = previousBars.map(b => b.close);
    const priceChange = (currentBar.close - previousBars[0].close) / previousBars[0].close;
    const volatility = this.calculateVolatility(recentPrices);

    if (priceChange > 0.02) conditions.push('strong_uptrend');
    else if (priceChange > 0.005) conditions.push('uptrend');
    else if (priceChange < -0.02) conditions.push('strong_downtrend');
    else if (priceChange < -0.005) conditions.push('downtrend');
    else conditions.push('sideways');

    if (volatility > 0.03) conditions.push('high_volatility');
    else if (volatility > 0.015) conditions.push('moderate_volatility');
    else conditions.push('low_volatility');

    // Volume analysis
    const avgVolume = previousBars.reduce((sum, b) => sum + b.volume, 0) / previousBars.length;
    if (currentBar.volume > avgVolume * 1.5) conditions.push('high_volume');
    else if (currentBar.volume < avgVolume * 0.7) conditions.push('low_volume');

    return conditions;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private async processExits(
    openTrades: Trade[],
    currentBar: MarketData,
    signals: TradingSignal[],
    barIndex: number
  ): Promise<void> {
    for (let i = openTrades.length - 1; i >= 0; i--) {
      const trade = openTrades[i];
      const currentPrice = currentBar.close;

      let shouldExit = false;
      let exitReason = '';

      // Stop loss hit
      if (trade.type === 'BUY' && currentPrice <= trade.stopLoss) {
        shouldExit = true;
        exitReason = 'Stop Loss';
      } else if (trade.type === 'SELL' && currentPrice >= trade.stopLoss) {
        shouldExit = true;
        exitReason = 'Stop Loss';
      }

      // Take profit hit
      if (trade.takeProfit) {
        if (trade.type === 'BUY' && currentPrice >= trade.takeProfit) {
          shouldExit = true;
          exitReason = 'Take Profit';
        } else if (trade.type === 'SELL' && currentPrice <= trade.takeProfit) {
          shouldExit = true;
          exitReason = 'Take Profit';
        }
      }

      // Signal-based exit
      const exitSignal = signals.find(s =>
        s.type === (trade.type === 'BUY' ? 'SELL' : 'BUY') && s.confidence > 0.8
      );
      if (exitSignal) {
        shouldExit = true;
        exitReason = 'Signal Exit';
      }

      // Time-based exit (holding too long)
      const holdingDuration = Date.now() - trade.entryTime.getTime();
      const maxHoldingTime = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (holdingDuration > maxHoldingTime) {
        shouldExit = true;
        exitReason = 'Time Exit';
      }

      if (shouldExit) {
        const closedTrade = await this.closeTrade(trade, currentPrice, exitReason);
        openTrades.splice(i, 1);
        // Note: closed trades should be stored in the main trades array
      }
    }
  }

  private async closeTrade(trade: Trade, exitPrice: number, reason: string): Promise<Trade> {
    trade.exitPrice = exitPrice;
    trade.exitTime = new Date();
    trade.duration = trade.exitTime.getTime() - trade.entryTime.getTime();
    trade.reason = reason;

    // Calculate P&L
    if (trade.type === 'BUY') {
      trade.pnl = (exitPrice - trade.entryPrice) * trade.quantity - trade.fees.totalCost;
    } else {
      trade.pnl = (trade.entryPrice - exitPrice) * trade.quantity - trade.fees.totalCost;
    }

    trade.netPnL = trade.pnl;

    // Calculate risk-reward ratio
    const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity;
    trade.rrr = riskAmount > 0 ? Math.abs(trade.pnl) / riskAmount : 0;

    // Determine trade outcome
    trade.isWin = trade.pnl > 0;
    trade.isPush = Math.abs(trade.pnl) < trade.fees.totalCost;
    trade.isPartialWin = trade.pnl > 0 && trade.rrr < 1.0;

    return trade;
  }

  private calculateUnrealizedPnL(trade: Trade, currentPrice: number): number {
    let unrealizedPnL = 0;

    if (trade.type === 'BUY') {
      unrealizedPnL = (currentPrice - trade.entryPrice) * trade.quantity;
    } else {
      unrealizedPnL = (trade.entryPrice - currentPrice) * trade.quantity;
    }

    return unrealizedPnL - trade.fees.totalCost;
  }

  private async checkMarginCalls(openTrades: Trade[], currentCapital: number, totalEquity: number): Promise<void> {
    const marginRequirement = this.config.marginRequirement || 0.5; // 50% margin requirement
    const requiredEquity = currentCapital * marginRequirement;

    if (totalEquity < requiredEquity) {
      logger.warn('Margin call triggered - liquidating positions');
      // In a real implementation, this would liquidate positions
      // For now, we'll just log the warning
    }
  }

  private async calculateBacktestMetrics(
    trades: Trade[],
    equityCurve: { date: Date; equity: number; drawdown: number }[],
    initialCapital: number,
    strategy: BacktestStrategy
  ): Promise<BacktestResult> {
    const totalReturn = equityCurve[equityCurve.length - 1]?.equity || initialCapital - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;

    const winningTrades = trades.filter(t => t.isWin && !t.isPush);
    const losingTrades = trades.filter(t => !t.isWin && !t.isPush);
    const pushes = trades.filter(t => t.isPush);

    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const averageWin = winningTrades.length > 0 ?
      winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ?
      losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;

    const totalWinAmount = winningTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const totalLossAmount = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;

    const expectancy = trades.length > 0 ?
      totalReturn / trades.length : 0;

    // Calculate advanced metrics
    const returns = equityCurve.map((point, i) => {
      if (i === 0) return 0;
      return (point.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity;
    }).filter(r => r !== 0);

    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = volatility > 0 ?
      (returns.reduce((sum, r) => sum + r, 0) / returns.length - this.config.riskFreeRate / 252) / volatility : 0;

    const maxDrawdown = Math.max(...equityCurve.map(point => point.drawdown));
    const calmarRatio = maxDrawdown > 0 ?
      (totalReturn / initialCapital) / maxDrawdown : 0;

    // Calculate monthly returns
    const monthlyReturns = this.calculateMonthlyReturns(equityCurve);

    // Risk metrics
    const var95 = this.calculateVaR(returns, 0.05);
    const cvar95 = this.calculateCVaR(returns, 0.05);

    return {
      strategy,
      config: this.config,
      marketData: this.marketData,
      closedTrades: trades,
      openTrades: [],
      totalReturn,
      totalReturnPercent,
      sharpeRatio,
      sortinoRatio: this.calculateSortinoRatio(returns),
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown * 100,
      calmarRatio,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      expectancy,
      annualizedReturn: this.calculateAnnualizedReturn(totalReturn, initialCapital, equityCurve.length),
      volatility,
      beta: 0, // Would need benchmark data
      alpha: 0, // Would need benchmark data
      informationRatio: 0, // Would need benchmark data
      treynorRatio: 0, // Would need beta
      var95,
      cvar95,
      kellyCriterion: this.calculateKellyCriterion(winningTrades, losingTrades),
      totalFees: trades.reduce((sum, t) => sum + t.fees.commission, 0),
      totalSlippage: trades.reduce((sum, t) => sum + t.fees.slippage, 0),
      averageTradeDuration: trades.length > 0 ?
        trades.reduce((sum, t) => sum + t.duration, 0) / trades.length : 0,
      bestTrade: trades.reduce((best, current) =>
        current.pnl > best.pnl ? current : best, trades[0] || {} as Trade),
      worstTrade: trades.reduce((worst, current) =>
        current.pnl < worst.pnl ? current : worst, trades[0] || {} as Trade),
      consecutiveWins: this.calculateMaxConsecutiveWins(trades),
      consecutiveLosses: this.calculateMaxConsecutiveLosses(trades),
      maxConsecutiveWins: this.calculateMaxConsecutiveWins(trades),
      maxConsecutiveLosses: this.calculateMaxConsecutiveLosses(trades),
      monthlyReturns,
      equityCurve,
      performanceMetrics: {
        totalReturnPercent,
        winRate,
        profitFactor,
        expectancy,
        sharpeRatio,
        calmarRatio
      },
      riskMetrics: {
        maxDrawdownPercent: maxDrawdown * 100,
        volatility,
        var95,
        cvar95
      }
    };
  }

  private calculateMonthlyReturns(equityCurve: { date: Date; equity: number; drawdown: number }[]): { month: string; return: number; volatility: number }[] {
    const monthlyData: { [key: string]: number[] } = {};

    for (const point of equityCurve) {
      const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(point.equity);
    }

    const monthlyReturns: { month: string; return: number; volatility: number }[] = [];

    for (const [month, values] of Object.entries(monthlyData)) {
      if (values.length > 1) {
        const monthReturn = (values[values.length - 1] - values[0]) / values[0];
        const dailyReturns = [];
        for (let i = 1; i < values.length; i++) {
          dailyReturns.push((values[i] - values[i-1]) / values[i-1]);
        }
        const volatility = this.calculateVolatility(dailyReturns) * Math.sqrt(21); // Monthly volatility

        monthlyReturns.push({
          month,
          return: monthReturn,
          volatility
        });
      }
    }

    return monthlyReturns;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);

    if (negativeReturns.length === 0) return Infinity;

    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);

    return downsideDeviation > 0 ? meanReturn / downsideDeviation : 0;
  }

  private calculateAnnualizedReturn(totalReturn: number, initialCapital: number, days: number): number {
    const years = days / 365;
    return years > 0 ? Math.pow((initialCapital + totalReturn) / initialCapital, 1 / years) - 1 : 0;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    return sortedReturns[index] || 0;
  }

  private calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    const tailReturns = sortedReturns.slice(0, index);

    return tailReturns.length > 0 ?
      tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
  }

  private calculateKellyCriterion(wins: Trade[], losses: Trade[]): number {
    if (wins.length === 0 || losses.length === 0) return 0;

    const winProbability = wins.length / (wins.length + losses.length);
    const averageWin = wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
    const averageLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length);

    return winProbability - ((1 - winProbability) * (averageLoss / averageWin));
  }

  private calculateMaxConsecutiveWins(trades: Trade[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (trade.isWin) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  private calculateMaxConsecutiveLosses(trades: Trade[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const trade of trades) {
      if (!trade.isWin && !trade.isPush) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  // Enhanced backtesting with multiple strategies comparison
  async runStrategyComparison(
    strategies: BacktestStrategy[],
    lookbackPeriods: number[] = [30, 90, 180, 365]
  ): Promise<ComparativeBacktestResult> {
    const results: StrategyResult[] = [];

    for (const strategy of strategies) {
      // Test strategy across multiple time periods
      const periodResults: PeriodResult[] = [];

      for (const days of lookbackPeriods) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const result = await this.runBacktest(strategy, {
          startDate,
          endDate: new Date(),
          enableLeverage: strategy.enableLeverage || false,
          initialCapital: this.config.initialCapital
        });

        const periodResult: PeriodResult = {
          period: `${days}D`,
          totalReturn: this.calculateTotalReturn(result),
          sharpeRatio: this.calculateSharpeRatio(result),
          maxDrawdown: this.calculateMaxDrawdown(result),
          winRate: this.calculateWinRate(result),
          profitFactor: this.calculateProfitFactor(result),
          avgWinLoss: this.calculateAvgWinLoss(result),
          totalTrades: result.closedTrades.length,
          expectancy: this.calculateExpectancy(result),
          calmarRatio: this.calculateCalmarRatio(result),
          sortinoRatio: this.calculateSortinoRatioResult(result),
          annualizedReturn: this.calculateAnnualizedReturnResult(result, days)
        };

        periodResults.push(periodResult);
      }

      // Aggregate strategy performance
      const strategyResult: StrategyResult = {
        strategyName: strategy.name,
        strategy: strategy,
        periods: periodResults,
        overallRanking: 0, // Will be calculated after all strategies
        riskAdjustedPerformance: this.calculateRiskAdjustedPerformance(periodResults),
        consistency: this.calculateConsistency(periodResults),
        marketRegimePerformance: await this.analyzeMarketRegimePerformance(strategy)
      };

      results.push(strategyResult);
    }

    // Rank strategies by composite score
    results.forEach(result => {
      result.overallRanking = this.calculateStrategyRanking(result);
    });

    // Sort by ranking
    results.sort((a, b) => a.overallRanking - b.overallRanking);

    return {
      strategies: results,
      summary: this.generateComparisonSummary(results),
      recommendations: this.generateStrategyRecommendations(results),
      correlationMatrix: this.calculateStrategyCorrelationMatrix(strategies),
      optimalPortfolio: this.calculateOptimalPortfolio(results)
    };
  }

  // Portfolio optimization using Modern Portfolio Theory
  private calculateOptimalPortfolio(strategies: StrategyResult[]): OptimalPortfolio {
    const returns = strategies.map(s =>
      s.periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / s.periods.length
    );
    const volatilities = strategies.map(s =>
      s.periods.reduce((sum, p) => sum + this.calculateVolatilityFromReturns(p.totalReturn), 0) / s.periods.length
    );

    // Calculate correlation matrix
    const correlationMatrix = this.calculateStrategyCorrelationMatrix(
      strategies.map(s => s.strategy)
    );

    // Mean-Variance Optimization
    const numStrategies = strategies.length;
    const weights = new Array(numStrategies).fill(1 / numStrategies); // Start with equal weights

    // Simple optimization (gradient descent would be better for production)
    for (let iteration = 0; iteration < 100; iteration++) {
      const portfolioReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
      const portfolioVolatility = this.calculatePortfolioVolatility(weights, correlationMatrix, volatilities);

      // Adjust weights to maximize Sharpe ratio
      for (let i = 0; i < numStrategies; i++) {
        const marginalUtility = (returns[i] - portfolioReturn) / portfolioVolatility;
        weights[i] += 0.01 * marginalUtility;
      }

      // Normalize weights to sum to 1
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      for (let i = 0; i < numStrategies; i++) {
        weights[i] /= totalWeight;
      }
    }

    const optimizedReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
    const optimizedVolatility = this.calculatePortfolioVolatility(weights, correlationMatrix, volatilities);
    const optimizedSharpe = optimizedVolatility > 0 ? optimizedReturn / optimizedVolatility : 0;

    return {
      strategyWeights: strategies.map((s, i) => ({
        strategy: s.strategyName,
        weight: weights[i],
        expectedReturn: returns[i],
        riskContribution: weights[i] * volatilities[i]
      })),
      portfolioMetrics: {
        expectedReturn: optimizedReturn,
        expectedVolatility: optimizedVolatility,
        sharpeRatio: optimizedSharpe,
        maxDrawdown: this.calculatePortfolioMaxDrawdown(weights, strategies),
        var95: this.calculateValueAtRisk(optimizedReturn, optimizedVolatility, 0.05)
      },
      efficientFrontier: this.calculateEfficientFrontier(strategies),
      riskContributions: weights.map((w, i) => ({
        strategy: strategies[i].strategyName,
        contribution: w * volatilities[i],
        percentage: optimizedVolatility > 0 ? (w * volatilities[i]) / optimizedVolatility : 0
      }))
    };
  }

  private calculatePortfolioVolatility(weights: number[], correlationMatrix: any, volatilities: number[]): number {
    let portfolioVariance = 0;

    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        const correlation = correlationMatrix[i]?.[j] || (i === j ? 1 : 0);
        portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
      }
    }

    return Math.sqrt(portfolioVariance);
  }

  private calculatePortfolioMaxDrawdown(weights: number[], strategies: StrategyResult[]): number {
    // This would typically use equity curves of each strategy
    // For now, we'll use a weighted average of individual drawdowns
    return strategies.reduce((sum, s, i) => {
      const maxDrawdown = Math.max(...s.periods.map(p => p.maxDrawdown));
      return sum + weights[i] * maxDrawdown;
    }, 0);
  }

  private calculateEfficientFrontier(strategies: StrategyResult[]): {
    portfolios: { return: number; volatility: number; sharpe: number }[];
    optimalPoint: { return: number; volatility: number; sharpe: number };
  } {
    const portfolios: { return: number; volatility: number; sharpe: number }[] = [];
    const numPortfolios = 100;

    for (let i = 0; i < numPortfolios; i++) {
      // Generate random weights
      const weights = this.generateRandomWeights(strategies.length);
      const expectedReturn = weights.reduce((sum, w, j) =>
        sum + w * (strategies[j].periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / strategies[j].periods.length), 0);

      // Simplified volatility calculation
      const volatility = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0)) * 0.15; // Assume 15% avg volatility
      const sharpe = volatility > 0 ? expectedReturn / volatility : 0;

      portfolios.push({ return: expectedReturn, volatility, sharpe });
    }

    // Find optimal portfolio (maximum Sharpe ratio)
    const optimalPoint = portfolios.reduce((best, current) =>
      current.sharpe > best.sharpe ? current : best, portfolios[0]);

    return { portfolios, optimalPoint };
  }

  private generateRandomWeights(n: number): number[] {
    const weights: number[] = [];
    let sum = 0;

    for (let i = 0; i < n; i++) {
      weights.push(Math.random());
      sum += weights[i];
    }

    // Normalize to sum to 1
    return weights.map(w => w / sum);
  }

  private calculateStrategyCorrelationMatrix(strategies: BacktestStrategy[]): { [key: string]: { [key: string]: number } } {
    // This would typically calculate correlation based on historical returns
    // For now, return identity matrix (no correlation)
    const matrix: { [key: string]: { [key: string]: number } } = {};

    strategies.forEach((s1, i) => {
      matrix[s1.name] = {};
      strategies.forEach((s2, j) => {
        matrix[s1.name][s2.name] = i === j ? 1 : 0;
      });
    });

    return matrix;
  }

  // Monte Carlo simulation for strategy robustness
  async runMonteCarloSimulation(
    strategy: BacktestStrategy,
    numSimulations: number = 1000,
    variationPercentage: number = 0.2
  ): Promise<SimulationResult> {
    const simulations: BacktestResult[] = [];

    for (let i = 0; i < numSimulations; i++) {
      // Create varied strategy parameters
      const variedStrategy: BacktestStrategy = {
        ...strategy,
        name: `${strategy.name}_sim_${i}`,
        // Add random variations to parameters
        parameters: {
          ...strategy.parameters,
          slippage: (strategy.parameters.slippage || 0.001) * (1 + (Math.random() - 0.5) * variationPercentage),
          commission: (strategy.parameters.commission || 0.001) * (1 + (Math.random() - 0.5) * variationPercentage)
        }
      };

      try {
        const result = await this.runBacktest(variedStrategy, {
          enableLeverage: strategy.enableLeverage || false,
          initialCapital: this.config.initialCapital
        });
        simulations.push(result);
      } catch (error) {
        // Skip failed simulations
        continue;
      }
    }

    return this.analyzeSimulationResults(simulations);
  }

  private analyzeSimulationResults(simulations: BacktestResult[]): SimulationResult {
    const returns = simulations.map(s => s.totalReturnPercent);
    const sharpeRatios = simulations.map(s => s.sharpeRatio);
    const maxDrawdowns = simulations.map(s => s.maxDrawdownPercent);

    return {
      totalSimulations: simulations.length,
      meanReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
      stdReturn: Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - (returns.reduce((a, b) => a + b, 0) / returns.length), 2), 0) / returns.length),
      percentile5: returns.sort((a, b) => a - b)[Math.floor(returns.length * 0.05)],
      percentile95: returns.sort((a, b) => a - b)[Math.floor(returns.length * 0.95)],
      successRate: returns.filter(r => r > 0).length / returns.length,
      meanSharpeRatio: sharpeRatios.reduce((a, b) => a + b, 0) / sharpeRatios.length,
      worstDrawdown: Math.max(...maxDrawdowns),
      bestSimulation: simulations.reduce((best, current) =>
        current.totalReturnPercent > best.totalReturnPercent ? current : best, simulations[0]),
      worstSimulation: simulations.reduce((worst, current) =>
        current.totalReturnPercent < worst.totalReturnPercent ? current : worst, simulations[0])
    };
  }

  // Helper methods for calculation
  private calculateTotalReturn(result: BacktestResult): number {
    return result.totalReturnPercent;
  }

  private calculateSharpeRatio(result: BacktestResult): number {
    return result.sharpeRatio;
  }

  private calculateMaxDrawdown(result: BacktestResult): number {
    return result.maxDrawdownPercent;
  }

  private calculateWinRate(result: BacktestResult): number {
    return result.winRate;
  }

  private calculateProfitFactor(result: BacktestResult): number {
    return result.profitFactor;
  }

  private calculateAvgWinLoss(result: BacktestResult): number {
    return result.averageWin / Math.abs(result.averageLoss || 1);
  }

  private calculateExpectancy(result: BacktestResult): number {
    return result.expectancy;
  }

  private calculateCalmarRatio(result: BacktestResult): number {
    return result.calmarRatio;
  }

  private calculateSortinoRatioResult(result: BacktestResult): number {
    return result.sortinoRatio;
  }

  private calculateAnnualizedReturnResult(result: BacktestResult, days: number): number {
    return result.annualizedReturn;
  }

  private calculateRiskAdjustedPerformance(periodResults: PeriodResult[]): number {
    const totalSharpe = periodResults.reduce((sum, p) => sum + p.sharpeRatio, 0);
    const avgReturn = periodResults.reduce((sum, p) => sum + p.annualizedReturn, 0) / periodResults.length;
    const maxDD = Math.max(...periodResults.map(p => p.maxDrawdown));

    return (totalSharpe + avgReturn) / (1 + maxDD);
  }

  private calculateConsistency(periodResults: PeriodResult[]): number {
    const returns = periodResults.map(p => p.annualizedReturn);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    // Higher score for lower variance (more consistent)
    return 1 / (1 + variance);
  }

  private async analyzeMarketRegimePerformance(strategy: BacktestStrategy): Promise<{ regime: string; performance: number }[]> {
    // This would analyze performance across different market regimes
    // For now, return sample data
    return [
      { regime: 'bull_market', performance: 0.25 },
      { regime: 'bear_market', performance: -0.05 },
      { regime: 'sideways', performance: 0.08 },
      { regime: 'high_volatility', performance: 0.12 },
      { regime: 'low_volatility', performance: 0.15 }
    ];
  }

  private calculateStrategyRanking(result: StrategyResult): number {
    // Composite score based on multiple metrics
    const performanceScore = result.riskAdjustedPerformance;
    const consistencyScore = result.consistency;
    const regimeScore = result.marketRegimePerformance.reduce((sum, r) => sum + r.performance, 0) / result.marketRegimePerformance.length;

    // Lower score is better (for ranking)
    return -(performanceScore * 0.5 + consistencyScore * 0.3 + regimeScore * 0.2);
  }

  private generateComparisonSummary(results: StrategyResult[]): {
    bestSharpeRatio: string;
    bestTotalReturn: string;
    bestWinRate: string;
    lowestDrawdown: string;
    mostConsistent: string;
  } {
    const bestSharpeStrategy = results.reduce((best, current) =>
      current.riskAdjustedPerformance > best.riskAdjustedPerformance ? current : best, results[0]);

    const bestReturnStrategy = results.reduce((best, current) =>
      current.periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / current.periods.length >
      best.periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / best.periods.length ? current : best, results[0]);

    const bestWinRateStrategy = results.reduce((best, current) =>
      current.periods.reduce((sum, p) => sum + p.winRate, 0) / current.periods.length >
      best.periods.reduce((sum, p) => sum + p.winRate, 0) / best.periods.length ? current : best, results[0]);

    const lowestDrawdownStrategy = results.reduce((best, current) =>
      Math.max(...current.periods.map(p => p.maxDrawdown)) < Math.max(...best.periods.map(p => p.maxDrawdown)) ? current : best, results[0]);

    const mostConsistentStrategy = results.reduce((best, current) =>
      current.consistency > best.consistency ? current : best, results[0]);

    return {
      bestSharpeRatio: bestSharpeStrategy.strategyName,
      bestTotalReturn: bestReturnStrategy.strategyName,
      bestWinRate: bestWinRateStrategy.strategyName,
      lowestDrawdown: lowestDrawdownStrategy.strategyName,
      mostConsistent: mostConsistentStrategy.strategyName
    };
  }

  private generateStrategyRecommendations(results: StrategyResult[]): string[] {
    const recommendations: string[] = [];

    // Analyze top performers
    const topStrategies = results.slice(0, 3);
    const worstStrategy = results[results.length - 1];

    if (topStrategies.length > 0) {
      recommendations.push(`Consider allocating 40-60% to ${topStrategies[0].strategyName} based on superior risk-adjusted returns`);
    }

    if (topStrategies.length > 1) {
      recommendations.push(`Diversify with ${topStrategies[1].strategyName} for additional stability across market conditions`);
    }

    if (topStrategies.length > 2) {
      recommendations.push(`Use ${topStrategies[2].strategyName} as a tertiary strategy for specific market regimes`);
    }

    // Risk warnings
    if (worstStrategy && worstStrategy.consistency < 0.5) {
      recommendations.push(`Exercise caution with ${worstStrategy.strategyName} due to inconsistent performance`);
    }

    return recommendations;
  }

  private calculateVolatilityFromReturns(totalReturn: number): number {
    // This would typically calculate volatility from return series
    // For now, return a simplified estimate
    return Math.abs(totalReturn) * 0.15; // Assume 15% of return magnitude
  }

  private calculateValueAtRisk(expectedReturn: number, volatility: number, confidence: number): number {
    const zScore = this.getZScore(confidence);
    return expectedReturn - zScore * volatility;
  }

  private getZScore(confidence: number): number {
    // Approximate inverse normal CDF for common confidence levels
    if (confidence === 0.05) return -1.645;  // 5% VaR
    if (confidence === 0.01) return -2.326;  // 1% VaR
    return -1.645; // Default to 5%
  }
}

export default BacktestingEngine;