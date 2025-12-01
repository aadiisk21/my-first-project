"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICTAnalysis = void 0;
class ICTAnalysis {
    constructor() {
        this.lookbackPeriod = 500;
        this.fibRatios = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618];
        this.chochSensitivity = 0.001; // 0.1% for price
        this.bosConfirmation = 3; // Need 3 candles to confirm BOS
        this.liquidityThreshold = 1.5; // Volume threshold for liquidity
    }
    /**
     * Analyzes market data for Inner Circle Trader patterns
     * Identifies smart money tools and market manipulation patterns
     */
    analyzeICT(marketData, timeframe = '1h') {
        if (marketData.length < this.lookbackPeriod) {
            throw new Error(`Insufficient data for ICT analysis. Need at least ${this.lookbackPeriod} candles`);
        }
        const recentData = marketData.slice(-this.lookbackPeriod);
        // 1. Identify market manipulation phases
        const marketPhase = this.identifyMarketPhase(recentData);
        // 2. Find ChoCH (Change of Character) patterns
        const chochLevels = this.identifyChochPatterns(recentData);
        // 3. Identify BOS (Break of Structure) patterns
        const bosLevels = this.identifyBosPatterns(recentData, chochLevels);
        // 4. Find Fibonacci levels
        const fibLevels = this.calculateFibonacciLevels(recentData);
        // 5. Identify liquidity zones
        const liquidityZones = this.identifyLiquidityZones(recentData, chochLevels);
        // 6. Find Order Blocks
        const orderBlocks = this.identifyOrderBlocks(recentData, chochLevels, bosLevels);
        // 7. Find Fair Value Gaps
        const fairValueGaps = this.identifyFairValueGaps(recentData);
        // 8. Find Mitigation Blocks
        const mitigation = this.identifyMitigationBlocks(recentData, orderBlocks);
        // 9. Find Points of Interest (POI)
        const poi = this.identifyPointsOfInterest(chochLevels, bosLevels, fibLevels, liquidityZones, orderBlocks);
        // 10. Combine all ICT patterns
        const patterns = this.combineICTPatterns(chochLevels, bosLevels, fibLevels, liquidityZones, orderBlocks, fairValueGaps, mitigation);
        return {
            patterns,
            marketPhase,
            smartMoneyTools: {
                chochLevels,
                bosLevels,
                fibLevels,
                liquidityZones,
                orderBlocks,
                fairValueGaps,
                mitigation
            },
            poi
        };
    }
    /**
     * Identifies the current market phase (Accumulation, Distribution, etc.)
     */
    identifyMarketPhase(data) {
        const closes = data.map(d => d.close);
        const volumes = data.map(d => d.volume);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const recentVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        // Price action analysis
        const priceChange = closes[closes.length - 1] - closes[0];
        const volatility = this.calculateVolatility(closes);
        // Range detection
        const isRanging = this.isRangingMarket(data);
        const isTrendingUp = !isRanging && closes[closes.length - 1] > closes[closes.length - 50];
        const isTrendingDown = !isRanging && closes[closes.length - 1] < closes[closes.length - 50];
        // Volume analysis
        const volumeSpike = recentVolume > avgVolume * 2;
        const volumeDry = recentVolume < avgVolume * 0.5;
        const absorbingRatio = avgVolume > 0 ? recentVolume / avgVolume : 0;
        const absorbingVolume = absorbingRatio > this.liquidityThreshold && isRanging;
        let phase;
        let strength = 0;
        if (isRanging && absorbingVolume) {
            phase = 'ACCUMULATION';
            strength = Math.min(100, (absorbingRatio - 1) * 100);
        }
        else if (isTrendingUp && volumeSpike) {
            phase = 'MARK_UP';
            strength = Math.min(100, (priceChange / closes[0]) * 100);
        }
        else if (isRanging && absorbingVolume && highs[highs.length - 1] < highs[highs.length - 50]) {
            phase = 'DISTRIBUTION';
            strength = Math.min(100, (absorbingRatio - 1) * 100);
        }
        else if (isTrendingDown && volumeSpike) {
            phase = 'MARK_DOWN';
            strength = Math.min(100, Math.abs(priceChange / closes[0]) * 100);
        }
        else if (isRanging && volumeDry) {
            phase = 'MANIPULATION';
            strength = Math.min(100, (avgVolume / recentVolume - 2) * 50);
        }
        else {
            phase = 'REACCUMULATION';
            strength = 50;
        }
        return {
            phase,
            strength,
            duration: data.length,
            startPrice: closes[0],
            endPrice: closes[closes.length - 1],
            volume: {
                entering: volumeSpike ? recentVolume : 0,
                exiting: volumeSpike && isTrendingDown ? recentVolume : 0,
                absorption: absorbingVolume ? recentVolume : 0
            }
        };
    }
    /**
     * Identifies Change of Character (ChoCH) patterns
     */
    identifyChochPatterns(data) {
        const chochLevels = [];
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        // Find significant highs and lows
        const significantHighs = this.findSignificantHighs(highs, lows);
        const significantLows = this.findSignificantLows(highs, lows);
        // Check for ChoCH at highs (bearish change of character)
        for (let i = 1; i < significantHighs.length - 1; i++) {
            const currentHigh = significantHighs[i];
            const previousHigh = significantHighs[i - 1];
            const nextHigh = significantHighs[i + 1];
            // Check if current high is broken significantly
            if (currentHigh < previousHigh * (1 - this.chochSensitivity) &&
                currentHigh < nextHigh * (1 - this.chochSensitivity)) {
                chochLevels.push(currentHigh);
            }
        }
        // Check for ChoCH at lows (bullish change of character)
        for (let i = 1; i < significantLows.length - 1; i++) {
            const currentLow = significantLows[i];
            const previousLow = significantLows[i - 1];
            const nextLow = significantLows[i + 1];
            // Check if current low is broken significantly
            if (currentLow > previousLow * (1 + this.chochSensitivity) &&
                currentLow > nextLow * (1 + this.chochSensitivity)) {
                chochLevels.push(currentLow);
            }
        }
        return chochLevels;
    }
    /**
     * Identifies Break of Structure (BOS) patterns
     */
    identifyBosPatterns(data, chochLevels) {
        const bosLevels = [];
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);
        // Bullish BOS: Higher high after higher low
        for (let i = 3; i < highs.length; i++) {
            const currentHigh = highs[i];
            const previousHigh = highs[i - 3];
            const recentLow = Math.min(...lows.slice(i - 3, i));
            if (currentHigh > previousHigh && recentLow > lows[i - 4]) {
                bosLevels.push(currentHigh);
            }
        }
        // Bearish BOS: Lower low after lower high
        for (let i = 3; i < lows.length; i++) {
            const currentLow = lows[i];
            const previousLow = lows[i - 3];
            const recentHigh = Math.max(...highs.slice(i - 3, i));
            if (currentLow < previousLow && recentHigh < highs[i - 4]) {
                bosLevels.push(currentLow);
            }
        }
        // Filter BOS that align with ChoCH
        return bosLevels.filter(level => chochLevels.some(choch => Math.abs(level - choch) / choch < 0.01));
    }
    /**
     * Calculates Fibonacci retracement and extension levels
     */
    calculateFibonacciLevels(data) {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const fibLevels = [];
        // Find most recent swing high and low
        const swingHigh = Math.max(...highs.slice(-100));
        const swingLow = Math.min(...lows.slice(-100));
        const swingRange = swingHigh - swingLow;
        if (swingRange <= 0)
            return fibLevels;
        // Calculate Fibonacci levels from swing low
        this.fibRatios.forEach(ratio => {
            fibLevels.push(swingLow + (swingRange * ratio));
        });
        // Calculate Fibonacci extensions from swing high
        this.fibRatios.slice(0, -3).forEach(ratio => {
            fibLevels.push(swingHigh - (swingRange * (ratio - 1)));
        });
        return fibLevels.filter(level => level > swingLow * 0.9 && level < swingHigh * 1.1 // Keep only relevant levels
        );
    }
    /**
     * Identifies liquidity zones where stop hunts occur
     */
    identifyLiquidityZones(data, chochLevels) {
        const liquidityZones = [];
        const volumes = data.map(d => d.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const highVolumeThreshold = avgVolume * this.liquidityThreshold;
        // Find potential liquidity areas around key levels
        chochLevels.forEach(level => {
            const nearbyCandles = data.filter(d => Math.abs(d.high - level) / level < 0.01 ||
                Math.abs(d.low - level) / level < 0.01);
            if (nearbyCandles.length > 0) {
                const highVolume = Math.max(...nearbyCandles.map(d => d.volume));
                const isLiquidityZone = highVolume > highVolumeThreshold;
                if (isLiquidityZone) {
                    const type = nearbyCandles.some(d => d.close > d.open) ? 'BUY' : 'SELL';
                    const zone = {
                        price: level,
                        zone: {
                            high: level * 1.005,
                            low: level * 0.995
                        },
                        strength: Math.min(100, (highVolume / avgVolume - 1) * 50),
                        type,
                        drawn: false
                    };
                    liquidityZones.push(zone);
                }
            }
        });
        return liquidityZones;
    }
    /**
     * Identifies Order Blocks - candle that breaks market structure
     */
    identifyOrderBlocks(data, chochLevels, bosLevels) {
        const orderBlocks = [];
        const volumes = data.map(d => d.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        for (let i = 3; i < data.length - 2; i++) {
            const candle = data[i];
            const previousCandles = data.slice(i - 3, i);
            const nextCandles = data.slice(i + 1, i + 3);
            // Check for strong momentum candle
            const bodySize = Math.abs(candle.close - candle.open);
            const range = candle.high - candle.low;
            const bodyRatio = bodySize / range;
            const isStrongMomentum = bodyRatio > 0.6 && candle.volume > avgVolume * 1.5;
            // Check if it breaks structure
            const breaksStructure = this.checkStructureBreak(candle, previousCandles, nextCandles, chochLevels, bosLevels);
            if (isStrongMomentum && breaksStructure) {
                const orderBlock = {
                    price: candle.close,
                    candle,
                    type: candle.close > candle.open ? 'BULLISH' : 'BEARISH',
                    strength: Math.min(100, bodyRatio * 100 + (candle.volume / avgVolume - 1) * 50),
                    mitigation: [],
                    validity: 5 // Standard 5-candle validity
                };
                orderBlocks.push(orderBlock);
            }
        }
        return orderBlocks;
    }
    /**
     * Identifies Fair Value Gaps in price
     */
    identifyFairValueGaps(data) {
        const fairValueGaps = [];
        const volumes = data.map(d => d.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        for (let i = 2; i < data.length; i++) {
            const candle1 = data[i - 2];
            const candle2 = data[i - 1];
            const candle3 = data[i];
            // Check for 3-candle fair value gap
            const candle2Range = candle2.high - candle2.low;
            const isGap = candle3.high < candle2.low && candle3.low > candle2.high;
            if (isGap) {
                const strength = Math.min(100, (candle2.volume / avgVolume - 1) * 50);
                const type = candle3.close > candle2.open ? 'BULLISH' : 'BEARISH';
                fairValueGaps.push({
                    top: candle2.high,
                    bottom: candle2.low,
                    midline: (candle2.high + candle2.low) / 2,
                    filled: false,
                    fillPercentage: 0,
                    type,
                    strength
                });
            }
        }
        return fairValueGaps;
    }
    /**
     * Identifies mitigation blocks that protect order blocks
     */
    identifyMitigationBlocks(data, orderBlocks) {
        const mitigation = [];
        orderBlocks.forEach(ob => {
            // Look for mitigation candles after order block
            const startIndex = data.findIndex(d => d.timestamp === ob.candle.timestamp);
            if (startIndex !== -1) {
                for (let i = startIndex + 1; i < Math.min(startIndex + 10, data.length); i++) {
                    const candle = data[i];
                    const isMitigation = this.checkMitigation(candle, ob);
                    if (isMitigation) {
                        mitigation.push({
                            price: candle.close,
                            type: 'MITIGATION',
                            volume: candle.volume,
                            efficiency: Math.min(100, Math.abs(candle.close - ob.price) / (ob.candle.high - ob.candle.low) * 100)
                        });
                        break;
                    }
                }
            }
        });
        return mitigation;
    }
    /**
     * Combines all ICT patterns into comprehensive analysis
     */
    combineICTPatterns(chochLevels, bosLevels, fibLevels, liquidityZones, orderBlocks, fairValueGaps, mitigation) {
        const patterns = [];
        const currentTime = new Date();
        // ChoCH patterns
        chochLevels.forEach(level => {
            patterns.push({
                patternType: 'CHOCH',
                priceLevel: level,
                strength: 80,
                timeframe: '1h',
                timestamp: currentTime,
                broken: false,
                retest: false,
                completion: 'ONGOING'
            });
        });
        // BOS patterns
        bosLevels.forEach(level => {
            patterns.push({
                patternType: 'BOS',
                priceLevel: level,
                strength: 85,
                timeframe: '1h',
                timestamp: currentTime,
                broken: false,
                retest: false,
                completion: 'ONGOING'
            });
        });
        // Order Block patterns
        orderBlocks.forEach(ob => {
            patterns.push({
                patternType: 'ORDER_BLOCK',
                priceLevel: ob.price,
                strength: ob.strength,
                timeframe: '1h',
                timestamp: ob.candle.timestamp,
                broken: false,
                retest: false,
                completion: 'ONGOING'
            });
        });
        // Fair Value Gap patterns
        fairValueGaps.forEach(fvg => {
            patterns.push({
                patternType: 'FAIR_VALUE_GAP',
                priceLevel: fvg.midline,
                strength: fvg.strength,
                timeframe: '1h',
                timestamp: currentTime,
                broken: false,
                retest: false,
                completion: fvg.filled ? 'COMPLETED' : 'ONGOING'
            });
        });
        return patterns.sort((a, b) => b.strength - a.strength);
    }
    /**
     * Identifies Points of Interest with confluence
     */
    identifyPointsOfInterest(chochLevels, bosLevels, fibLevels, liquidityZones, orderBlocks) {
        const poi = [];
        // Combine all significant levels
        const allLevels = [
            ...chochLevels,
            ...bosLevels,
            ...fibLevels,
            ...liquidityZones.map(lz => lz.price),
            ...orderBlocks.map(ob => ob.price)
        ];
        // Group levels by price proximity
        const levelGroups = this.groupLevelsByProximity(allLevels, 0.5); // 0.5% proximity
        levelGroups.forEach(group => {
            if (group.length >= 2) {
                const avgPrice = group.reduce((sum, level) => sum + level, 0) / group.length;
                const confluence = Math.min(100, group.length * 20);
                const reasons = [];
                if (group.some(level => chochLevels.includes(level)))
                    reasons.push('ChoCH');
                if (group.some(level => bosLevels.includes(level)))
                    reasons.push('BOS');
                if (group.some(level => fibLevels.includes(level)))
                    reasons.push('Fibonacci');
                if (group.some(level => liquidityZones.some(lz => Math.abs(lz.price - level) / level < 0.001)))
                    reasons.push('Liquidity');
                if (group.some(level => orderBlocks.some(ob => Math.abs(ob.price - level) / level < 0.001)))
                    reasons.push('Order Block');
                poi.push({
                    pointOfInterest: avgPrice,
                    confluence,
                    reason: reasons,
                    timeframeBias: this.getTimeframeBias(reasons),
                    strength: confluence,
                    type: this.determinePOIType(reasons)
                });
            }
        });
        return poi.sort((a, b) => b.confluence - a.confluence);
    }
    // Helper methods
    calculateVolatility(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }
    isRangingMarket(data) {
        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const lookback = Math.min(50, data.length);
        const recentCloses = closes.slice(-lookback);
        const highest = Math.max(...recentCloses);
        const lowest = Math.min(...recentCloses);
        const range = (highest - lowest) / lowest;
        return range < 0.05; // 5% range threshold
    }
    findSignificantHighs(highs, lows) {
        const significantHighs = [];
        for (let i = 2; i < highs.length - 2; i++) {
            const currentHigh = highs[i];
            const leftHigh = Math.max(...highs.slice(Math.max(0, i - 5), i));
            const rightHigh = Math.max(...highs.slice(i + 1, Math.min(i + 6, highs.length)));
            if (currentHigh > leftHigh && currentHigh > rightHigh) {
                significantHighs.push(currentHigh);
            }
        }
        return significantHighs;
    }
    findSignificantLows(highs, lows) {
        const significantLows = [];
        for (let i = 2; i < lows.length - 2; i++) {
            const currentLow = lows[i];
            const leftLow = Math.min(...lows.slice(Math.max(0, i - 5), i));
            const rightLow = Math.min(...lows.slice(i + 1, Math.min(i + 6, lows.length)));
            if (currentLow < leftLow && currentLow < rightLow) {
                significantLows.push(currentLow);
            }
        }
        return significantLows;
    }
    checkStructureBreak(candle, previousCandles, nextCandles, chochLevels, bosLevels) {
        const isBullishBreak = candle.close > candle.open &&
            candle.high > Math.max(...previousCandles.map(d => d.high)) &&
            chochLevels.some(level => candle.close > level);
        const isBearishBreak = candle.close < candle.open &&
            candle.low < Math.min(...previousCandles.map(d => d.low)) &&
            chochLevels.some(level => candle.close < level);
        return isBullishBreak || isBearishBreak;
    }
    checkMitigation(candle, orderBlock) {
        if (orderBlock.type === 'BULLISH') {
            return candle.close < candle.open &&
                candle.low < orderBlock.candle.low * 0.998; // Slightly below OB
        }
        else {
            return candle.close > candle.open &&
                candle.high > orderBlock.candle.high * 1.002; // Slightly above OB
        }
    }
    groupLevelsByProximity(levels, thresholdPercent) {
        if (levels.length === 0)
            return [];
        const sortedLevels = [...levels].sort((a, b) => a - b);
        const groups = [];
        let currentGroup = [sortedLevels[0]];
        for (let i = 1; i < sortedLevels.length; i++) {
            const currentLevel = sortedLevels[i];
            const lastInGroup = currentGroup[currentGroup.length - 1];
            const difference = Math.abs(currentLevel - lastInGroup) / lastInGroup;
            if (difference <= thresholdPercent) {
                currentGroup.push(currentLevel);
            }
            else {
                groups.push(currentGroup);
                currentGroup = [currentLevel];
            }
        }
        groups.push(currentGroup);
        return groups;
    }
    getTimeframeBias(reasons) {
        if (reasons.includes('BOS') || reasons.includes('CHOCH')) {
            return 'TREND_CONTINUATION';
        }
        else if (reasons.includes('LIQUIDITY')) {
            return 'REVERSAL_ZONE';
        }
        else if (reasons.includes('Fibonacci')) {
            return 'CONFLUENCE_ZONE';
        }
        return 'NEUTRAL';
    }
    determinePOIType(reasons) {
        if (reasons.includes('CHOCH') || reasons.includes('BOS')) {
            return 'TREND';
        }
        else if (reasons.includes('LIQUIDITY')) {
            return 'LIQUIDITY';
        }
        else if (reasons.includes('ORDER_BLOCK')) {
            return 'BREAKER';
        }
        return 'SWING';
    }
}
exports.ICTAnalysis = ICTAnalysis;
//# sourceMappingURL=ictAnalysis.js.map