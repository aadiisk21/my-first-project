"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketPsychologyAnalysis = void 0;
class MarketPsychologyAnalysis {
    constructor() {
        this.fearGreedThresholds = {
            extremeFear: 20,
            fear: 40,
            neutral: 60,
            greed: 80,
            extremeGreed: 90
        };
        this.volumeProfileWindow = 20;
        this.sentimentSmoothing = 0.3;
        this.crowdBehaviorThreshold = 0.7;
    }
    /**
     * Analyzes market psychology and crowd behavior
     * Combines Fear & Greed Index, sentiment analysis, and behavioral patterns
     */
    analyzeMarketPsychology(marketData, socialSentiment, externalFactors) {
        if (marketData.length < 100) {
            throw new Error('Insufficient data for psychology analysis. Need at least 100 candles.');
        }
        // 1. Calculate Fear & Greed Index
        const fearGreedIndex = this.calculateFearGreedIndex(marketData, externalFactors);
        // 2. Analyze crowd behavior patterns
        const crowdBehavior = this.analyzeCrowdBehavior(marketData, fearGreedIndex);
        // 3. Calculate market sentiment
        // calculateMarketSentiment expects (data, fgi, socialSentiment)
        const marketSentiment = this.calculateMarketSentiment(marketData, fearGreedIndex, socialSentiment);
        // 4. Generate contrarian signals
        const contrarianSignals = this.generateContrarianSignals(marketData, crowdBehavior, marketSentiment);
        // 5. Analyze psychological efficiency levels
        const psychologicalLevels = this.analyzePsychologicalEfficiency(marketData, crowdBehavior);
        return {
            fearGreedIndex,
            crowdBehavior,
            marketSentiment,
            contrarianSignals,
            psychologicalLevels
        };
    }
    /**
     * Calculates the Fear & Greed Index
     * Based on multiple market indicators and social sentiment
     */
    calculateFearGreedIndex(data, externalFactors) {
        const recentData = data.slice(-30); // Last 30 periods
        const currentPrice = recentData[recentData.length - 1].close;
        const previousPrice = recentData[0].close;
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        const volumes = recentData.map(d => d.volume);
        const highs = recentData.map(d => d.high);
        const lows = recentData.map(d => d.low);
        const closes = recentData.map(d => d.close);
        // Calculate volatility (high - low range)
        const volatility = this.calculateVolatility(highs, lows);
        // Calculate momentum
        const momentum = this.calculateMomentum(closes);
        // Calculate volume moving average
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        const recentVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
        const volumeRatio = recentVolume / avgVolume;
        // Calculate price position in range
        const recentHigh = Math.max(...highs.slice(-10));
        const recentLow = Math.min(...lows.slice(-10));
        const pricePosition = (currentPrice - recentLow) / (recentHigh - recentLow);
        // Calculate buying/selling pressure (using volume deltas)
        const buySellPressure = this.calculateBuySellPressure(recentData);
        // Fear & Greed calculation weights
        const volatilityWeight = volatility * 30; // Higher volatility = more fear
        const momentumWeight = Math.abs(momentum) * 25;
        const volumeWeight = Math.max(0, (volumeRatio - 1)) * 50; // Low volume = fear, High volume = greed
        const pricePositionWeight = pricePosition > 0.8 || pricePosition < 0.2 ? -40 : 0; // Extremes = fear/greed
        const buySellWeight = buySellPressure.sellPressure > 1.5 ? -20 : 20; // Heavy selling = fear, heavy buying = greed
        // Calculate raw index (0-100, lower = more fear, higher = more greed)
        let rawIndex = 50; // Neutral starting point
        rawIndex += volatilityWeight + momentumWeight + volumeWeight + pricePositionWeight + buySellWeight;
        // Apply external factors if provided
        if (externalFactors) {
            rawIndex = this.applyExternalFactors(rawIndex, externalFactors);
        }
        // Determine classification
        let classification;
        if (rawIndex <= this.fearGreedThresholds.extremeFear) {
            classification = 'EXTREME_FEAR';
        }
        else if (rawIndex <= this.fearGreedThresholds.fear) {
            classification = 'FEAR';
        }
        else if (rawIndex >= this.fearGreedThresholds.extremeGreed) {
            classification = 'EXTREME_GREED';
        }
        else if (rawIndex >= this.fearGreedThresholds.greed) {
            classification = 'GREED';
        }
        else {
            classification = 'NEUTRAL';
        }
        return {
            value: Math.max(0, Math.min(100, rawIndex)),
            classification,
            timestamp: new Date(),
            price: currentPrice,
            volume: volumes[volumes.length - 1],
            marketCap: this.estimateMarketCap(data),
            bitcoinDominance: this.calculateBitcoinDominance(data),
            sentiment: {
                social: 0, // Will be populated from socialSentiment
                news: 0,
                trends: 0,
                uncertainty: Math.abs(50 - rawIndex)
            }
        };
    }
    /**
     * Analyzes crowd behavior patterns
     */
    analyzeCrowdBehavior(data, fgi) {
        const recentData = data.slice(-50);
        const volumes = recentData.map(d => d.volume);
        const closes = recentData.map(d => d.close);
        // Analyze volume profile
        const volumeProfile = this.analyzeVolumeProfile(volumes);
        // Detect pattern types
        const priceAction = this.detectPriceAction(recentData);
        const smartMoneyActivity = this.detectSmartMoneyActivity(recentData, fgi);
        // Calculate herd conviction
        const conviction = this.calculateHerdConviction(volumes, closes, fgi);
        return {
            herdBehavior: this.classifyCrowdBehavior(fgi, volumeProfile, priceAction, smartMoneyActivity),
            conviction,
            volumeProfile,
            priceAction,
            smartMoneyActivity
        };
    }
    /**
     * Analyzes overall market sentiment
     */
    calculateMarketSentiment(data, fgi, socialSentiment) {
        const recentData = data.slice(-30);
        const closes = recentData.map(d => d.close);
        const volumes = recentData.map(d => d.volume);
        // Calculate sentiment components from market data
        const priceMomentum = this.calculateMomentum(closes);
        const volatility = this.calculateVolatility(data.slice(-50).map(d => d.high), data.slice(-50).map(d => d.low));
        const volumeTrend = this.analyzeVolumeTrend(volumes);
        const optionsFlow = this.analyzeOptionsFlow(data);
        // Process social sentiment
        const socialSentimentScore = this.processSocialSentiment(socialSentiment);
        // Calculate individual sentiment components
        const fear = Math.max(0, (50 - fgi.value) * 2 + volatility * 30 - optionsFlow.putCallRatio * 25);
        const greed = Math.max(0, (fgi.value - 50) * 2 + optionsFlow.callRatio * 25 - volumeTrend.increasingRatio * 20);
        const uncertainty = volatility * 40 + Math.abs(priceMomentum) * 30;
        const euphoria = Math.max(0, (fgi.value - 70) * 1.5 + optionsFlow.callRatio * 20);
        const panic = Math.max(0, (50 - fgi.value) * 3 + volatility * 50);
        // Combine all sentiment sources
        const priceComponent = (-priceMomentum * 0.3 + optionsFlow.putCallRatio * 0.2 + volatility * 0.1);
        const volumeComponent = (-volumeTrend.skewedScore * 0.2 + volumeTrend.exhaustionScore * 0.3);
        const socialComponent = socialSentimentScore * 0.3;
        const overall = Math.max(-100, Math.min(100, priceComponent + volumeComponent + socialComponent));
        return {
            overall: Math.round(overall),
            components: {
                fear: Math.round(fear),
                greed: Math.round(greed),
                uncertainty: Math.round(uncertainty),
                euphoria: Math.round(euphoria),
                panic: Math.round(panic)
            },
            sources: {
                price: priceComponent,
                volume: volumeComponent,
                volatility,
                momentum: priceMomentum,
                optionsFlow,
                social: socialComponent
            },
            socialSignals: socialSentiment || []
        };
    }
    /**
     * Generates contrarian trading signals
     */
    generateContrarianSignals(data, crowdBehavior, sentiment) {
        const signals = [];
        const currentPrice = data[data.length - 1].close;
        // Generate signals based on extreme fear/greed
        if (sentiment.overall <= 25 || sentiment.overall >= 75) {
            // Extreme fear or greed - contrarian signal
            const signalType = sentiment.overall <= 25 ? 'CONTRARIAN_BUY' : 'CONTRARIAN_SELL';
            const strength = Math.min(100, Math.abs(sentiment.overall - 50) * 2);
            signals.push({
                signalType,
                strength,
                probability: this.calculateContrarianProbability(crowdBehavior, sentiment, signalType),
                timeframe: '4h',
                entryPrice: currentPrice,
                targets: this.calculateContrarianTargets(data, signalType),
                riskLevel: sentiment.overall <= 25 ? 'LOW' : 'HIGH'
            });
        }
        // Generate signals based on herd behavior
        if (crowdBehavior.conviction > this.crowdBehaviorThreshold) {
            // Strong herd conviction - fade signal
            const signalType = crowdBehavior.herdBehavior === 'FOMO_BUYING' ? 'CONTRARIAN_SELL' : 'CONTRARIAN_BUY';
            const strength = Math.min(100, crowdBehavior.conviction * 100);
            signals.push({
                signalType,
                strength,
                probability: this.calculateContrarianProbability(crowdBehavior, sentiment, signalType),
                timeframe: '1d',
                entryPrice: currentPrice,
                targets: this.calculateContrarianTargets(data, signalType),
                riskLevel: 'MEDIUM'
            });
        }
        // Generate signals based on smart money activity
        if (crowdBehavior.smartMoneyActivity === 'LIQUIDITY_GRAB') {
            // Liquidity grab - fade signal
            signals.push({
                signalType: 'CONTRARIAN_SELL',
                strength: 85,
                probability: 70,
                timeframe: '1h',
                entryPrice: currentPrice,
                targets: [currentPrice * 0.99, currentPrice * 0.98, currentPrice * 0.97],
                riskLevel: 'HIGH'
            });
        }
        return signals.sort((a, b) => b.strength - a.strength);
    }
    /**
     * Analyzes psychological efficiency of different trading levels
     */
    analyzePsychologicalEfficiency(data, crowdBehavior) {
        const efficiencyLevels = [];
        const timeframes = ['1h', '4h', '1d'];
        timeframes.forEach(timeframe => {
            const timeframeData = this.getTimeframeData(data, timeframe);
            const efficiency = this.calculatePsychologicalEfficiencyForTimeframe(timeframeData, crowdBehavior, timeframe);
            efficiencyLevels.push(efficiency);
        });
        return efficiencyLevels;
    }
    // Helper methods
    calculateVolatility(highs, lows) {
        const avgHigh = highs.reduce((sum, h) => sum + h, 0) / highs.length;
        const avgLow = lows.reduce((sum, l) => sum + l, 0) / lows.length;
        const variance = highs.reduce((sum, h) => sum + Math.pow(h - avgHigh, 2), 0) / highs.length;
        return Math.sqrt(variance);
    }
    calculateMomentum(closes) {
        const current = closes[closes.length - 1];
        const previous = closes[closes.length - 2];
        return ((current - previous) / previous) * 100;
    }
    calculateBuySellPressure(data) {
        let totalBuyVolume = 0;
        let totalSellVolume = 0;
        for (let i = 1; i < data.length; i++) {
            const candle = data[i];
            const isBullish = candle.close > candle.open;
            if (isBullish) {
                totalBuyVolume += candle.volume;
            }
            else {
                totalSellVolume += candle.volume;
            }
        }
        const totalVolume = totalBuyVolume + totalSellVolume;
        return {
            buyPressure: totalVolume > 0 ? totalBuyVolume / totalVolume : 0.5,
            sellPressure: totalVolume > 0 ? totalSellVolume / totalVolume : 0.5
        };
    }
    analyzeVolumeProfile(volumes) {
        const recentVolumes = volumes.slice(-this.volumeProfileWindow);
        const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
        const currentVolume = recentVolumes[recentVolumes.length - 1];
        const volumeTrend = this.analyzeVolumeTrend(recentVolumes);
        let distribution;
        let buyPressure = 0.5;
        let sellPressure = 0.5;
        if (currentVolume > avgVolume * 1.5) {
            distribution = 'SPIKING';
            sellPressure = currentVolume > avgVolume * 2 ? 0.7 : 0.6;
        }
        else if (currentVolume < avgVolume * 0.5) {
            distribution = 'DRYING';
            buyPressure = 0.6;
        }
        else if (volumeTrend.exhaustionScore > 0.6) {
            distribution = 'EXHAUSTION';
        }
        else if (volumeTrend.frontRunScore > 0.5) {
            distribution = 'FRONT_RUN';
            buyPressure = 0.8;
        }
        else if (volumeTrend.skewedScore > 0.5) {
            distribution = 'SKEWED';
            if (volumeTrend.increasingRatio > 1.2) {
                buyPressure = 0.8;
                sellPressure = 0.2;
            }
            else {
                buyPressure = 0.3;
                sellPressure = 0.7;
            }
        }
        else {
            distribution = 'ACCUMULATION';
        }
        const efficiency = this.calculateVolumeEfficiency(recentVolumes);
        return {
            distribution,
            buyPressure,
            sellPressure,
            volumeTrend,
            efficiency
        };
    }
    analyzeVolumeTrend(volumes) {
        let increasingCount = 0;
        let decreasingCount = 0;
        for (let i = 1; i < volumes.length; i++) {
            if (volumes[i] > volumes[i - 1]) {
                increasingCount++;
            }
            else if (volumes[i] < volumes[i - 1]) {
                decreasingCount++;
            }
        }
        const increasingRatio = increasingCount / (volumes.length - 1);
        const decreasingRatio = decreasingCount / (volumes.length - 1);
        // Detect front run (accelerating volume)
        const frontRunScore = increasingCount > volumes.length * 0.7 ? increasingCount / volumes.length : 0;
        // Detect exhaustion (decelerating after spike)
        let maxVolumeIndex = 0;
        let maxVolume = 0;
        volumes.forEach((vol, index) => {
            if (vol > maxVolume) {
                maxVolume = vol;
                maxVolumeIndex = index;
            }
        });
        let exhaustionScore = 0;
        if (maxVolumeIndex < volumes.length - 1) {
            const afterMaxVolumes = volumes.slice(maxVolumeIndex + 1);
            const avgAfterMax = afterMaxVolumes.reduce((sum, vol) => sum + vol, 0) / afterMaxVolumes.length;
            exhaustionScore = Math.max(0, (maxVolume - avgAfterMax) / maxVolume);
        }
        // Detect skewness
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length;
        const skewedScore = Math.sqrt(variance) / avgVolume;
        return {
            increasingRatio,
            decreasingRatio,
            frontRunScore,
            exhaustionScore,
            skewedScore
        };
    }
    calculateVolumeEfficiency(volumes) {
        // Higher efficiency = more directional movement with volume
        let directionalVolume = 0;
        let totalVolume = 0;
        for (let i = 1; i < volumes.length; i++) {
            if (volumes[i] !== volumes[i - 1]) {
                directionalVolume += volumes[i];
            }
            totalVolume += volumes[i];
        }
        return totalVolume > 0 ? (directionalVolume / totalVolume) * 100 : 50;
    }
    detectPriceAction(data) {
        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const recentClose = closes[closes.length - 1];
        const previousClose = closes[closes.length - 2];
        const priceChange = (recentClose - previousClose) / previousClose;
        const recentHigh = Math.max(...highs.slice(-10));
        const recentLow = Math.min(...lows.slice(-10));
        const rangePosition = (recentClose - recentLow) / (recentHigh - recentLow);
        // Detect specific patterns
        if (Math.abs(priceChange) > 0.05) {
            return 'CAPITULATION'; // Sudden large move
        }
        else if (rangePosition > 0.9 && data[data.length - 1].volume > data[data.length - 2].volume) {
            return 'DISTRIBUTION'; // Top of range with high volume
        }
        else if (rangePosition < 0.1 && data[data.length - 1].volume > data[data.length - 2].volume) {
            return 'ACCUMULATION'; // Bottom of range with high volume
        }
        else if (rangePosition > 0.8 && data[data.length - 1].volume < data[data.length - 2].volume) {
            return 'MANIPULATION'; // High volume without follow-through
        }
        else {
            return 'ACCUMULATION'; // Default assumption
        }
    }
    detectSmartMoneyActivity(data, fgi) {
        const volumes = data.map(d => d.volume);
        const closes = data.map(d => d.close);
        const recentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.slice(-20).reduce((sum, vol) => sum + vol, 0) / 20;
        const volumeSpike = recentVolume > avgVolume * 2;
        // Detect sharp reversals after volume spikes
        let reversals = 0;
        for (let i = 2; i < data.length; i++) {
            const volumeSpike = volumes[i - 2] > avgVolume * 2;
            const priceReversal = (closes[i] > closes[i - 2] && closes[i - 1] < closes[i - 2]) ||
                (closes[i] < closes[i - 2] && closes[i - 1] > closes[i - 2]);
            if (volumeSpike && priceReversal) {
                reversals++;
            }
        }
        // Classify smart money activity
        if (reversals > volumes.length * 0.1 && fgi.classification === 'EXTREME_GREED') {
            return 'LIQUIDITY_GRAB';
        }
        else if (reversals > volumes.length * 0.05 && fgi.classification === 'EXTREME_FEAR') {
            return 'STOP_HUNT';
        }
        else if (volumes[volumes.length - 1] > avgVolume * 3 && closes[closes.length - 1] < closes[closes.length - 2]) {
            return 'DISTRIBUTION';
        }
        else if (volumes[volumes.length - 1] > avgVolume * 2 && closes[closes.length - 1] > closes[closes.length - 2]) {
            return 'ABSORPTION';
        }
        else {
            return 'ABSORPTION'; // Default
        }
    }
    calculateHerdConviction(volumes, closes, fgi) {
        const volumeAgreement = this.calculateVolumeAgreement(volumes);
        const priceMomentum = Math.abs(closes[closes.length - 1] - closes[closes.length - 2]);
        const sentimentStrength = Math.abs(fgi.value - 50) * 2;
        // Higher conviction when volume agrees and sentiment is extreme
        return Math.min(1, (volumeAgreement * 0.3 + sentimentStrength * 0.4 + priceMomentum * 0.3));
    }
    calculateVolumeAgreement(volumes) {
        if (volumes.length < 5)
            return 0.5;
        let agreement = 0;
        for (let i = 1; i < volumes.length; i++) {
            const currentTrend = volumes[i] > volumes[i - 1] ? 1 : -1;
            agreement += currentTrend;
        }
        return Math.abs(agreement) / (volumes.length - 1);
    }
    classifyCrowdBehavior(fgi, volumeProfile, priceAction, smartMoneyActivity) {
        if (smartMoneyActivity === 'LIQUIDITY_GRAB' || smartMoneyActivity === 'STOP_HUNT') {
            return 'PANIC_SELLING';
        }
        else if (fgi.value <= 25 && volumeProfile.distribution === 'DRYING') {
            return 'INDECISION';
        }
        else if (fgi.value >= 75 && volumeProfile.distribution === 'SPIKING') {
            return 'FOMO_BUYING';
        }
        else if (priceAction === 'CAPITULATION') {
            return 'MANIPULATION';
        }
        else if (volumeProfile.distribution === 'ACCUMULATION' || volumeProfile.distribution === 'DISTRIBUTION') {
            return 'RATIONAL_TRADING';
        }
        else {
            return 'COMPLACENCY';
        }
    }
    processSocialSentiment(socialSignals) {
        if (!socialSignals || socialSignals.length === 0)
            return 0;
        const weightedSentiment = socialSignals.reduce((sum, signal) => {
            const weight = signal.influence * 0.0001; // Normalize influence
            return sum + (signal.sentiment * weight);
        }, 0);
        const totalWeight = socialSignals.reduce((sum, signal) => sum + signal.influence * 0.0001, 0);
        return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
    }
    analyzeOptionsFlow(data) {
        const recentData = data.slice(-30);
        const volumes = recentData.map(d => d.volume);
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        let putVolume = 0;
        let callVolume = 0;
        // Simplified options flow detection
        for (let i = 1; i < recentData.length; i++) {
            const candle = recentData[i];
            const priceChange = (candle.close - candle.open) / candle.open;
            if (priceChange > 0) {
                putVolume += candle.volume;
            }
            else {
                callVolume += candle.volume;
            }
        }
        const totalVolume = putVolume + callVolume;
        return {
            putCallRatio: totalVolume > 0 ? putVolume / totalVolume : 0.5,
            callRatio: totalVolume > 0 ? callVolume / totalVolume : 0.5
        };
    }
    calculateContrarianProbability(crowdBehavior, sentiment, signalType) {
        let baseProbability = 60; // Base contrarian probability
        // Adjust for herd behavior
        if (crowdBehavior.conviction > 0.8) {
            baseProbability += 25; // Strong herd = higher contrarian success
        }
        // Adjust for sentiment extremes
        if (sentiment.overall <= 25 || sentiment.overall >= 75) {
            baseProbability += 20; // Extreme sentiment = higher contrarian success
        }
        // Adjust for signal type
        if (signalType === 'CONTRARIAN_BUY' && sentiment.components.fear > 60) {
            baseProbability += 15; // Fear with buy signal = higher success
        }
        else if (signalType === 'CONTRARIAN_SELL' && sentiment.components.greed > 60) {
            baseProbability += 15; // Greed with sell signal = higher success
        }
        return Math.min(95, baseProbability);
    }
    calculateContrarianTargets(data, signalType) {
        const currentPrice = data[data.length - 1].close;
        const recentData = data.slice(-50);
        const atr = this.calculateATR(recentData);
        const targets = [];
        const targetCount = 3;
        for (let i = 1; i <= targetCount; i++) {
            const riskMultiple = signalType === 'CONTRARIAN_BUY' ? 2 : 1.5; // Buy signals: 2x risk, Sell signals: 1.5x risk
            const target = signalType === 'CONTRARIAN_BUY'
                ? currentPrice + (atr * i * riskMultiple)
                : currentPrice - (atr * i * riskMultiple);
            targets.push(target);
        }
        return targets;
    }
    calculatePsychologicalEfficiencyForTimeframe(data, crowdBehavior, timeframe) {
        const winRate = this.simulatePsychologicalTrading(data, crowdBehavior, timeframe);
        const riskAdjusted = this.calculateRiskAdjustedReturn(data, crowdBehavior);
        let level;
        let efficiency = winRate;
        if (crowdBehavior.herdBehavior === 'RATIONAL_TRADING') {
            level = 'RATIONAL_ANALYSIS';
            efficiency = Math.min(95, winRate + 10);
        }
        else if (crowdBehavior.herdBehavior === 'COMPLACENCY') {
            level = 'TREND_FOLLOWING';
            efficiency = Math.max(40, winRate - 5);
        }
        else if (crowdBehavior.herdBehavior === 'FOMO_BUYING' || crowdBehavior.herdBehavior === 'PANIC_SELLING') {
            level = 'EMOTIONAL_TRADING';
            efficiency = Math.max(30, winRate - 15);
        }
        else {
            level = 'CAPITULATION_DISTRIBUTION';
            efficiency = Math.max(20, winRate - 20);
        }
        return {
            level,
            efficiency: Math.round(efficiency),
            winRate: Math.round(winRate),
            riskAdjusted: Math.round(riskAdjusted)
        };
    }
    simulatePsychologicalTrading(data, crowdBehavior, timeframe) {
        // Simplified simulation - in production, this would use historical backtesting
        const trades = [];
        let winCount = 0;
        let totalTrades = 0;
        for (let i = 10; i < data.length - 10; i += 5) {
            const entryPrice = data[i].close;
            const exitPrice = data[i + 5].close;
            let isWin;
            // Derive likely win/loss based on observed herd behavior
            switch (crowdBehavior.herdBehavior) {
                case 'FOMO_BUYING':
                    // Herd buys strongly - contrarian sell trades may win if price later drops
                    isWin = exitPrice < entryPrice;
                    break;
                case 'PANIC_SELLING':
                    // Herd panic-sells - contrarian buy trades may win if price rebounds
                    isWin = exitPrice > entryPrice;
                    break;
                case 'RATIONAL_TRADING':
                case 'COMPLACENCY':
                    // Trend and rational markets generally favor direction-based trades
                    isWin = exitPrice > entryPrice;
                    break;
                case 'INDECISION':
                case 'MANIPULATION':
                default:
                    // Unpredictable environments - assume random outcome
                    isWin = Math.random() > 0.5;
            }
            if (isWin)
                winCount++;
            totalTrades++;
        }
        return totalTrades > 0 ? (winCount / totalTrades) * 100 : 50;
    }
    calculateRiskAdjustedReturn(data, crowdBehavior) {
        const volatility = this.calculateVolatility(data.map(d => d.high), data.map(d => d.low));
        // Lower risk for rational trading, higher for impulsive or manipulated behavior
        const riskAdjustment = crowdBehavior.herdBehavior === 'RATIONAL_TRADING' ? -10 :
            (crowdBehavior.herdBehavior === 'FOMO_BUYING' || crowdBehavior.herdBehavior === 'PANIC_SELLING') ? 10 :
                crowdBehavior.herdBehavior === 'MANIPULATION' ? 15 :
                    crowdBehavior.herdBehavior === 'COMPLACENCY' ? 5 : 0;
        // Adjust for volatility
        const volatilityAdjustment = volatility > 0.05 ? -5 : volatility < 0.02 ? 5 : 0;
        return 50 + riskAdjustment + volatilityAdjustment;
    }
    getTimeframeData(data, timeframe) {
        const intervals = {
            '1h': 1,
            '4h': 4,
            '1d': 24
        };
        const interval = intervals[timeframe] || 1;
        return data.filter((_, index) => index >= data.length - interval * 50);
    }
    calculateATR(data) {
        let totalRange = 0;
        for (let i = 1; i < data.length; i++) {
            const tr = Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i - 1].close));
            totalRange += tr;
        }
        return totalRange / data.length;
    }
    estimateMarketCap(data) {
        // Simplified market cap estimation (would use external data in production)
        const avgPrice = data.reduce((sum, d) => sum + d.close, 0) / data.length;
        const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
        // Mock calculation - in production, use actual market cap data
        return avgPrice * avgVolume * 1000000; // Simplified estimation
    }
    calculateBitcoinDominance(data) {
        // Mock calculation - would use external data in production
        return 45 + Math.random() * 10; // Mock BTC dominance percentage
    }
    applyExternalFactors(baseIndex, external) {
        let adjustedIndex = baseIndex;
        // News sentiment impact
        if (external.newsSentiment) {
            adjustedIndex += external.newsSentiment * 0.1;
        }
        // Market correlation impact
        if (external.marketCorrelation) {
            adjustedIndex += external.marketCorrelation * 0.05;
        }
        // Economic events impact
        if (external.economicEvents) {
            adjustedIndex += external.economicEvents * 0.15;
        }
        return Math.max(0, Math.min(100, adjustedIndex));
    }
}
exports.MarketPsychologyAnalysis = MarketPsychologyAnalysis;
//# sourceMappingURL=marketPsychologyAnalysis.js.map