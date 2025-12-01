"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestingEngine = void 0;
const smcAnalysis_1 = require("./smcAnalysis");
const volumeProfileAnalysis_1 = require("./volumeProfileAnalysis");
const marketPsychologyAnalysis_1 = require("./marketPsychologyAnalysis");
const fibonacciAnalysis_1 = require("./fibonacciAnalysis");
const ictAnalysis_1 = require("./ictAnalysis");
const logger_1 = require("../utils/logger");
class BacktestingEngine {
    constructor(config) {
        this.config = config;
        this.marketData = [];
        this.smcAnalysis = new smcAnalysis_1.SMCAnalysis();
        this.volumeProfileAnalysis = new volumeProfileAnalysis_1.VolumeProfileAnalysis();
        this.psychologyAnalysis = new marketPsychologyAnalysis_1.MarketPsychologyAnalysis();
        this.fibonacciAnalysis = new fibonacciAnalysis_1.FibonacciAnalysis();
        this.ictAnalysis = new ictAnalysis_1.ICTAnalysis();
    }
    async loadMarketData(symbol, timeframe, startDate, endDate) {
        // This would typically fetch from database or API
        logger_1.logger.info(`Loading market data for ${symbol} ${timeframe} from ${startDate} to ${endDate}`);
        // For now, we'll assume this is populated
        this.marketData = []; // Would be populated with actual data
    }
    // Enhanced fee and slippage calculation for institutional-grade simulation
    calculateInstitutionalSlippage(tradeSize, marketPrice, volumeProfile, orderBookDepth = 10) {
        const config = this.config.slippageModel;
        // Volume-based slippage (institutional model)
        const avgVolume = (volumeProfile === null || volumeProfile === void 0 ? void 0 : volumeProfile.averageVolume) || 1000000; // Default 1M base volume
        const volumeRatio = Math.min(tradeSize / avgVolume, 1);
        // Square root slippage model (market impact theory)
        const baseSlippage = config.slippage * Math.sqrt(volumeRatio) * 0.01;
        // Price impact calculation
        // priceImpactSlippage sits on top-level backtest config
        const priceImpact = (this.config.priceImpactSlippage || 0) * Math.pow(tradeSize / 100000, 0.5) * 0.0001;
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
            commission,
            slippage: baseSlippage,
            impact: priceImpact,
            liquidity: liquidityCost,
            latency: latencyCost
        };
    }
    getInstitutionalCommissionRate(tradeSize) {
        const config = this.config.slippageModel;
        // Volume-based commission tiers (institutional pricing)
        if (tradeSize > 10000000)
            return config.commissionPercent * 0.2; // High volume discount
        if (tradeSize > 1000000)
            return config.commissionPercent * 0.4;
        if (tradeSize > 100000)
            return config.commissionPercent * 0.6;
        return config.commissionPercent;
    }
    getCurrentVolatility(marketPrice) {
        // Get recent volatility for latency cost calculation
        const recentPrices = this.marketData.slice(-20).map(d => d.close);
        if (recentPrices.length < 2)
            return null;
        const returns = [];
        for (let i = 1; i < recentPrices.length; i++) {
            returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
        }
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    }
    async runBacktest(strategy, options = {}) {
        const startDate = options.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const endDate = options.endDate || new Date();
        const enableLeverage = options.enableLeverage || this.config.useLeverage;
        const initialCapital = options.initialCapital || this.config.initialCapital;
        logger_1.logger.info(`Starting backtest for strategy: ${strategy.name}`);
        await this.loadMarketData('BTC/USDT', this.config.timeframe, startDate, endDate);
        const trades = [];
        const openTrades = [];
        const equityCurve = [];
        let currentCapital = initialCapital;
        let maxEquity = initialCapital;
        let currentDrawdown = 0;
        let maxDrawdown = 0;
        // Simulate trading
        for (let i = 0; i < this.marketData.length; i++) {
            const currentBar = this.marketData[i];
            const previousBars = this.marketData.slice(0, i);
            if (previousBars.length < 50)
                continue; // Need minimum history
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
        logger_1.logger.info(`Backtest completed for ${strategy.name}: ${result.totalReturnPercent.toFixed(2)}% return, ${result.sharpeRatio.toFixed(2)} Sharpe ratio`);
        return result;
    }
    async generateComprehensiveSignals(currentBar, previousBars, strategy) {
        var _a, _b, _c, _d, _f, _g, _h, _j;
        const signals = [];
        try {
            // SMC Analysis - analyze & convert to an internal BacktestSignal
            try {
                const smcLevels = this.smcAnalysis.analyzeMarketData(previousBars, this.config.timeframe);
                const smcSignal = this.smcAnalysis.generateSMCSignals(smcLevels, currentBar.close, this.config.timeframe);
                if (smcSignal && smcSignal.signal && smcSignal.signal !== 'HOLD') {
                    signals.push({
                        type: smcSignal.signal,
                        confidence: Math.min(1, (smcSignal.confidence || 0) / 100),
                        stopLoss: smcSignal.stopLoss,
                        takeProfit: smcSignal.takeProfit,
                        strength: (smcSignal.confidence || 0) / 100,
                        source: 'SMC',
                        entryPrice: smcSignal.entryPrice,
                        timeframe: this.config.timeframe,
                        meta: { rationale: smcSignal.rationale, liquidityZones: smcSignal.liquidityZones }
                    });
                }
            }
            catch (_e) {
                // analysis failed or insufficient data — ignore
            }
            // ICT Analysis - use analyzeICT and convert informative pieces into signals
            try {
                const ictResult = this.ictAnalysis.analyzeICT(previousBars, this.config.timeframe);
                // produce signals from order blocks and POIs
                if ((_b = (_a = ictResult.smartMoneyTools) === null || _a === void 0 ? void 0 : _a.orderBlocks) === null || _b === void 0 ? void 0 : _b.length) {
                    for (const ob of ictResult.smartMoneyTools.orderBlocks) {
                        const type = ob.type === 'BULLISH' ? 'BUY' : ob.type === 'BEARISH' ? 'SELL' : 'HOLD';
                        if (type !== 'HOLD') {
                            signals.push({
                                type,
                                confidence: Math.min(1, (ob.strength || 0) / 100),
                                stopLoss: (_d = (_c = ob.candle) === null || _c === void 0 ? void 0 : _c.low) !== null && _d !== void 0 ? _d : undefined,
                                takeProfit: (_g = (_f = ob.candle) === null || _f === void 0 ? void 0 : _f.high) !== null && _g !== void 0 ? _g : undefined,
                                strength: (ob.strength || 0) / 100,
                                source: 'ICT',
                                entryPrice: ob.price,
                                timeframe: this.config.timeframe,
                                meta: { validity: ob.validity }
                            });
                        }
                    }
                }
            }
            catch (_e) {
                // ignore
            }
            // Volume Profile Analysis - map structure into signals
            try {
                const volumeResult = this.volumeProfileAnalysis.analyzeVolumeProfile(previousBars, [this.config.timeframe]);
                const price = currentBar.close;
                // If structure indicates imbalance, generate basic signals
                if (((_h = volumeResult.marketStructure) === null || _h === void 0 ? void 0 : _h.structure) === 'IMBALANCED_BUY') {
                    signals.push({ type: 'BUY', confidence: 0.65, source: 'Volume', entryPrice: price });
                }
                else if (((_j = volumeResult.marketStructure) === null || _j === void 0 ? void 0 : _j.structure) === 'IMBALANCED_SELL') {
                    signals.push({ type: 'SELL', confidence: 0.65, source: 'Volume', entryPrice: price });
                }
                else {
                    // value-area based signals (POC/value area)
                    const va = volumeResult.valueArea;
                    if (va && Math.abs(price - va.low) / (va.range || 1) < 0.02) {
                        signals.push({ type: 'BUY', confidence: 0.5, source: 'Volume', entryPrice: price });
                    }
                    else if (va && Math.abs(price - va.high) / (va.range || 1) < 0.02) {
                        signals.push({ type: 'SELL', confidence: 0.5, source: 'Volume', entryPrice: price });
                    }
                }
            }
            catch (_e) {
                // ignore
            }
            // Market Psychology Analysis - call public analysis and wire contrarian signals
            try {
                const psych = this.psychologyAnalysis.analyzeMarketPsychology(previousBars);
                if (psych.contrarianSignals && psych.contrarianSignals.length) {
                    for (const cs of psych.contrarianSignals) {
                        const type = cs.signalType === 'CONTRARIAN_BUY' ? 'BUY' : cs.signalType === 'CONTRARIAN_SELL' ? 'SELL' : 'HOLD';
                        if (type !== 'HOLD') {
                            signals.push({
                                type,
                                confidence: Math.min(1, (cs.probability || 50) / 100),
                                strength: (cs.strength || 50) / 100,
                                source: 'Psychology',
                                timeframe: cs.timeframe,
                                entryPrice: cs.entryPrice,
                                takeProfit: cs.targets
                            });
                        }
                    }
                }
            }
            catch (_e) {
                // ignore
            }
            // Fibonacci Analysis - use public analyzeFibonacci
            try {
                const fibResult = this.fibonacciAnalysis.analyzeFibonacci(previousBars, this.config.timeframe);
                const nearThreshold = 0.01 * currentBar.close; // 1% distance
                for (const lvl of fibResult.levels.slice(0, 10)) {
                    if (Math.abs(currentBar.close - lvl.price) <= nearThreshold) {
                        signals.push({
                            type: currentBar.close > lvl.price ? 'SELL' : 'BUY',
                            confidence: Math.min(1, (lvl.strength || 50) / 100),
                            source: 'Fibonacci',
                            entryPrice: lvl.price,
                            strength: (lvl.strength || 50) / 100
                        });
                    }
                }
            }
            catch (_e) {
                // ignore
            }
            // Filter signals based on strategy parameters
            return this.filterSignalsByStrategy(signals, strategy);
        }
        catch (error) {
            logger_1.logger.error('Error generating comprehensive signals:', error);
            return [];
        }
    }
    filterSignalsByStrategy(signals, strategy) {
        return signals.filter((signal) => {
            var _a, _b;
            // Apply strategy-specific filters
            if (signal.confidence < (strategy.parameters.minConfidence || 0.7))
                return false;
            if (((_a = signal.strength) !== null && _a !== void 0 ? _a : 0) < (strategy.parameters.minStrength || 0.6))
                return false;
            // Risk management filters
            const riskSettings = strategy.rules.riskManagement;
            if (((_b = signal.riskRewardRatio) !== null && _b !== void 0 ? _b : 0) < (riskSettings.minRiskRewardRatio || 1.0))
                return false;
            return true;
        });
    }
    async processEntries(signals, currentBar, currentCapital, barIndex) {
        var _a, _b;
        const newTrades = [];
        for (const signal of signals) {
            if (signal.type === 'BUY' || signal.type === 'SELL') {
                const positionSize = this.calculatePositionSize(currentCapital, signal, currentBar.close);
                if (positionSize > 0) {
                    const fees = this.calculateInstitutionalSlippage(positionSize, currentBar.close, null);
                    const trade = {
                        entryPrice: currentBar.close,
                        entryTime: currentBar.timestamp,
                        exitPrice: 0,
                        exitTime: new Date(),
                        quantity: positionSize,
                        type: signal.type,
                        confidence: signal.confidence,
                        stopLoss: (_a = signal.stopLoss) !== null && _a !== void 0 ? _a : currentBar.close * 0.98,
                        takeProfit: Array.isArray(signal.takeProfit) ? signal.takeProfit[0] : ((_b = signal.takeProfit) !== null && _b !== void 0 ? _b : currentBar.close * 1.02),
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
    calculatePositionSize(currentCapital, signal, price) {
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
    analyzeMarketConditions(barIndex) {
        const conditions = [];
        const currentBar = this.marketData[barIndex];
        const previousBars = this.marketData.slice(Math.max(0, barIndex - 20), barIndex);
        if (previousBars.length < 10)
            return conditions;
        // Calculate basic market conditions
        const recentPrices = previousBars.map(b => b.close);
        const priceChange = (currentBar.close - previousBars[0].close) / previousBars[0].close;
        const volatility = this.calculateVolatility(recentPrices);
        if (priceChange > 0.02)
            conditions.push('strong_uptrend');
        else if (priceChange > 0.005)
            conditions.push('uptrend');
        else if (priceChange < -0.02)
            conditions.push('strong_downtrend');
        else if (priceChange < -0.005)
            conditions.push('downtrend');
        else
            conditions.push('sideways');
        if (volatility > 0.03)
            conditions.push('high_volatility');
        else if (volatility > 0.015)
            conditions.push('moderate_volatility');
        else
            conditions.push('low_volatility');
        // Volume analysis
        const avgVolume = previousBars.reduce((sum, b) => sum + b.volume, 0) / previousBars.length;
        if (currentBar.volume > avgVolume * 1.5)
            conditions.push('high_volume');
        else if (currentBar.volume < avgVolume * 0.7)
            conditions.push('low_volume');
        return conditions;
    }
    calculateVolatility(prices) {
        if (prices.length < 2)
            return 0;
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }
    async processExits(openTrades, currentBar, signals, barIndex) {
        for (let i = openTrades.length - 1; i >= 0; i--) {
            const trade = openTrades[i];
            const currentPrice = currentBar.close;
            let shouldExit = false;
            let exitReason = '';
            // Stop loss hit
            if (trade.type === 'BUY' && currentPrice <= trade.stopLoss) {
                shouldExit = true;
                exitReason = 'Stop Loss';
            }
            else if (trade.type === 'SELL' && currentPrice >= trade.stopLoss) {
                shouldExit = true;
                exitReason = 'Stop Loss';
            }
            // Take profit hit
            if (trade.takeProfit) {
                if (trade.type === 'BUY' && currentPrice >= trade.takeProfit) {
                    shouldExit = true;
                    exitReason = 'Take Profit';
                }
                else if (trade.type === 'SELL' && currentPrice <= trade.takeProfit) {
                    shouldExit = true;
                    exitReason = 'Take Profit';
                }
            }
            // Signal-based exit
            const exitSignal = signals.find(s => s.type === (trade.type === 'BUY' ? 'SELL' : 'BUY') && s.confidence > 0.8);
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
    async closeTrade(trade, exitPrice, reason) {
        trade.exitPrice = exitPrice;
        trade.exitTime = new Date();
        trade.duration = trade.exitTime.getTime() - trade.entryTime.getTime();
        trade.reason = reason;
        // Calculate P&L
        if (trade.type === 'BUY') {
            trade.pnl = (exitPrice - trade.entryPrice) * trade.quantity - trade.fees.totalCost;
        }
        else {
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
    calculateUnrealizedPnL(trade, currentPrice) {
        let unrealizedPnL = 0;
        if (trade.type === 'BUY') {
            unrealizedPnL = (currentPrice - trade.entryPrice) * trade.quantity;
        }
        else {
            unrealizedPnL = (trade.entryPrice - currentPrice) * trade.quantity;
        }
        return unrealizedPnL - trade.fees.totalCost;
    }
    async checkMarginCalls(openTrades, currentCapital, totalEquity) {
        const marginRequirement = this.config.marginRequirement || 0.5; // 50% margin requirement
        const requiredEquity = currentCapital * marginRequirement;
        if (totalEquity < requiredEquity) {
            logger_1.logger.warn('Margin call triggered - liquidating positions');
            // In a real implementation, this would liquidate positions
            // For now, we'll just log the warning
        }
    }
    async calculateBacktestMetrics(trades, equityCurve, initialCapital, strategy) {
        var _a;
        const totalReturn = ((_a = equityCurve[equityCurve.length - 1]) === null || _a === void 0 ? void 0 : _a.equity) || initialCapital - initialCapital;
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
            if (i === 0)
                return 0;
            return (point.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
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
            bestTrade: trades.reduce((best, current) => current.pnl > best.pnl ? current : best, trades[0] || {}),
            worstTrade: trades.reduce((worst, current) => current.pnl < worst.pnl ? current : worst, trades[0] || {}),
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
    calculateMonthlyReturns(equityCurve) {
        const monthlyData = {};
        for (const point of equityCurve) {
            const monthKey = `${point.date.getFullYear()}-${String(point.date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = [];
            }
            monthlyData[monthKey].push(point.equity);
        }
        const monthlyReturns = [];
        for (const [month, values] of Object.entries(monthlyData)) {
            if (values.length > 1) {
                const monthReturn = (values[values.length - 1] - values[0]) / values[0];
                const dailyReturns = [];
                for (let i = 1; i < values.length; i++) {
                    dailyReturns.push((values[i] - values[i - 1]) / values[i - 1]);
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
    calculateSortinoRatio(returns) {
        if (returns.length === 0)
            return 0;
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const negativeReturns = returns.filter(r => r < 0);
        if (negativeReturns.length === 0)
            return Infinity;
        const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / negativeReturns.length;
        const downsideDeviation = Math.sqrt(downsideVariance);
        return downsideDeviation > 0 ? meanReturn / downsideDeviation : 0;
    }
    calculateAnnualizedReturn(totalReturn, initialCapital, days) {
        const years = days / 365;
        return years > 0 ? Math.pow((initialCapital + totalReturn) / initialCapital, 1 / years) - 1 : 0;
    }
    calculateVaR(returns, confidence) {
        if (returns.length === 0)
            return 0;
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor(returns.length * confidence);
        return sortedReturns[index] || 0;
    }
    calculateCVaR(returns, confidence) {
        if (returns.length === 0)
            return 0;
        const sortedReturns = [...returns].sort((a, b) => a - b);
        const index = Math.floor(returns.length * confidence);
        const tailReturns = sortedReturns.slice(0, index);
        return tailReturns.length > 0 ?
            tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
    }
    calculateKellyCriterion(wins, losses) {
        if (wins.length === 0 || losses.length === 0)
            return 0;
        const winProbability = wins.length / (wins.length + losses.length);
        const averageWin = wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
        const averageLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length);
        return winProbability - ((1 - winProbability) * (averageLoss / averageWin));
    }
    calculateMaxConsecutiveWins(trades) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        for (const trade of trades) {
            if (trade.isWin) {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            }
            else {
                currentConsecutive = 0;
            }
        }
        return maxConsecutive;
    }
    calculateMaxConsecutiveLosses(trades) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;
        for (const trade of trades) {
            if (!trade.isWin && !trade.isPush) {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            }
            else {
                currentConsecutive = 0;
            }
        }
        return maxConsecutive;
    }
    // Enhanced backtesting with multiple strategies comparison
    async runStrategyComparison(strategies, lookbackPeriods = [30, 90, 180, 365]) {
        const results = [];
        for (const strategy of strategies) {
            // Test strategy across multiple time periods
            const periodResults = [];
            for (const days of lookbackPeriods) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                const result = await this.runBacktest(strategy, {
                    startDate,
                    endDate: new Date(),
                    enableLeverage: strategy.enableLeverage || false,
                    initialCapital: this.config.initialCapital
                });
                const periodResult = {
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
            const strategyResult = {
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
    calculateOptimalPortfolio(strategies) {
        const returns = strategies.map(s => s.periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / s.periods.length);
        const volatilities = strategies.map(s => s.periods.reduce((sum, p) => sum + this.calculateVolatilityFromReturns(p.totalReturn), 0) / s.periods.length);
        // Calculate correlation matrix
        const correlationMatrix = this.calculateStrategyCorrelationMatrix(strategies.map(s => s.strategy));
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
    calculatePortfolioVolatility(weights, correlationMatrix, volatilities) {
        var _a;
        let portfolioVariance = 0;
        for (let i = 0; i < weights.length; i++) {
            for (let j = 0; j < weights.length; j++) {
                const correlation = ((_a = correlationMatrix[i]) === null || _a === void 0 ? void 0 : _a[j]) || (i === j ? 1 : 0);
                portfolioVariance += weights[i] * weights[j] * volatilities[i] * volatilities[j] * correlation;
            }
        }
        return Math.sqrt(portfolioVariance);
    }
    calculatePortfolioMaxDrawdown(weights, strategies) {
        // This would typically use equity curves of each strategy
        // For now, we'll use a weighted average of individual drawdowns
        return strategies.reduce((sum, s, i) => {
            const maxDrawdown = Math.max(...s.periods.map(p => p.maxDrawdown));
            return sum + weights[i] * maxDrawdown;
        }, 0);
    }
    calculateEfficientFrontier(strategies) {
        const portfolios = [];
        const numPortfolios = 100;
        for (let i = 0; i < numPortfolios; i++) {
            // Generate random weights
            const weights = this.generateRandomWeights(strategies.length);
            const expectedReturn = weights.reduce((sum, w, j) => sum + w * (strategies[j].periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / strategies[j].periods.length), 0);
            // Simplified volatility calculation
            const volatility = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0)) * 0.15; // Assume 15% avg volatility
            const sharpe = volatility > 0 ? expectedReturn / volatility : 0;
            portfolios.push({ return: expectedReturn, volatility, sharpe });
        }
        // Find optimal portfolio (maximum Sharpe ratio)
        const optimalPoint = portfolios.reduce((best, current) => current.sharpe > best.sharpe ? current : best, portfolios[0]);
        return { portfolios, optimalPoint };
    }
    generateRandomWeights(n) {
        const weights = [];
        let sum = 0;
        for (let i = 0; i < n; i++) {
            weights.push(Math.random());
            sum += weights[i];
        }
        // Normalize to sum to 1
        return weights.map(w => w / sum);
    }
    calculateStrategyCorrelationMatrix(strategies) {
        // This would typically calculate correlation based on historical returns
        // For now, return identity matrix (no correlation)
        const matrix = {};
        strategies.forEach((s1, i) => {
            matrix[s1.name] = {};
            strategies.forEach((s2, j) => {
                matrix[s1.name][s2.name] = i === j ? 1 : 0;
            });
        });
        return matrix;
    }
    // Monte Carlo simulation for strategy robustness
    async runMonteCarloSimulation(strategy, numSimulations = 1000, variationPercentage = 0.2) {
        const simulations = [];
        for (let i = 0; i < numSimulations; i++) {
            // Create varied strategy parameters
            const variedStrategy = {
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
            }
            catch (error) {
                // Skip failed simulations
                continue;
            }
        }
        return this.analyzeSimulationResults(simulations);
    }
    analyzeSimulationResults(simulations) {
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
            bestSimulation: simulations.reduce((best, current) => current.totalReturnPercent > best.totalReturnPercent ? current : best, simulations[0]),
            worstSimulation: simulations.reduce((worst, current) => current.totalReturnPercent < worst.totalReturnPercent ? current : worst, simulations[0])
        };
    }
    // Helper methods for calculation
    calculateTotalReturn(result) {
        return result.totalReturnPercent;
    }
    calculateSharpeRatio(result) {
        return result.sharpeRatio;
    }
    calculateMaxDrawdown(result) {
        return result.maxDrawdownPercent;
    }
    calculateWinRate(result) {
        return result.winRate;
    }
    calculateProfitFactor(result) {
        return result.profitFactor;
    }
    calculateAvgWinLoss(result) {
        return result.averageWin / Math.abs(result.averageLoss || 1);
    }
    calculateExpectancy(result) {
        return result.expectancy;
    }
    calculateCalmarRatio(result) {
        return result.calmarRatio;
    }
    calculateSortinoRatioResult(result) {
        return result.sortinoRatio;
    }
    calculateAnnualizedReturnResult(result, days) {
        return result.annualizedReturn;
    }
    calculateRiskAdjustedPerformance(periodResults) {
        const totalSharpe = periodResults.reduce((sum, p) => sum + p.sharpeRatio, 0);
        const avgReturn = periodResults.reduce((sum, p) => sum + p.annualizedReturn, 0) / periodResults.length;
        const maxDD = Math.max(...periodResults.map(p => p.maxDrawdown));
        return (totalSharpe + avgReturn) / (1 + maxDD);
    }
    calculateConsistency(periodResults) {
        const returns = periodResults.map(p => p.annualizedReturn);
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        // Higher score for lower variance (more consistent)
        return 1 / (1 + variance);
    }
    async analyzeMarketRegimePerformance(strategy) {
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
    calculateStrategyRanking(result) {
        // Composite score based on multiple metrics
        const performanceScore = result.riskAdjustedPerformance;
        const consistencyScore = result.consistency;
        const regimeScore = result.marketRegimePerformance.reduce((sum, r) => sum + r.performance, 0) / result.marketRegimePerformance.length;
        // Lower score is better (for ranking)
        return -(performanceScore * 0.5 + consistencyScore * 0.3 + regimeScore * 0.2);
    }
    generateComparisonSummary(results) {
        const bestSharpeStrategy = results.reduce((best, current) => current.riskAdjustedPerformance > best.riskAdjustedPerformance ? current : best, results[0]);
        const bestReturnStrategy = results.reduce((best, current) => current.periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / current.periods.length >
            best.periods.reduce((sum, p) => sum + p.annualizedReturn, 0) / best.periods.length ? current : best, results[0]);
        const bestWinRateStrategy = results.reduce((best, current) => current.periods.reduce((sum, p) => sum + p.winRate, 0) / current.periods.length >
            best.periods.reduce((sum, p) => sum + p.winRate, 0) / best.periods.length ? current : best, results[0]);
        const lowestDrawdownStrategy = results.reduce((best, current) => Math.max(...current.periods.map(p => p.maxDrawdown)) < Math.max(...best.periods.map(p => p.maxDrawdown)) ? current : best, results[0]);
        const mostConsistentStrategy = results.reduce((best, current) => current.consistency > best.consistency ? current : best, results[0]);
        return {
            bestSharpeRatio: bestSharpeStrategy.strategyName,
            bestTotalReturn: bestReturnStrategy.strategyName,
            bestWinRate: bestWinRateStrategy.strategyName,
            lowestDrawdown: lowestDrawdownStrategy.strategyName,
            mostConsistent: mostConsistentStrategy.strategyName
        };
    }
    generateStrategyRecommendations(results) {
        const recommendations = [];
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
    calculateVolatilityFromReturns(totalReturn) {
        // This would typically calculate volatility from return series
        // For now, return a simplified estimate
        return Math.abs(totalReturn) * 0.15; // Assume 15% of return magnitude
    }
    calculateValueAtRisk(expectedReturn, volatility, confidence) {
        const zScore = this.getZScore(confidence);
        return expectedReturn - zScore * volatility;
    }
    getZScore(confidence) {
        // Approximate inverse normal CDF for common confidence levels
        if (confidence === 0.05)
            return -1.645; // 5% VaR
        if (confidence === 0.01)
            return -2.326; // 1% VaR
        return -1.645; // Default to 5%
    }
}
exports.BacktestingEngine = BacktestingEngine;
exports.default = BacktestingEngine;
//# sourceMappingURL=backtestingEngine.js.map