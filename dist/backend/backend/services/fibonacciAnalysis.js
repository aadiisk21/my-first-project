"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FibonacciAnalysis = void 0;
class FibonacciAnalysis {
    constructor() {
        this.primaryRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
        this.extensionRatios = [1.272, 1.618, 2.0, 2.618, 2.618, 3.618];
        this.projectionRatios = [0.382, 0.5, 0.618, 1.0];
        this.tolerancePercent = 0.002; // 0.2% tolerance for level matching
        this.minSwingPoints = 3;
        this.maxLookback = 1000;
    }
    /**
     * Analyzes market data for Fibonacci patterns
     * Identifies retracements, extensions, and harmonic patterns
     */
    analyzeFibonacci(marketData, timeframe = '1h') {
        if (marketData.length < 50) {
            throw new Error(`Insufficient data for Fibonacci analysis. Need at least 50 candles.`);
        }
        const recentData = marketData.slice(-this.maxLookback);
        const swings = this.identifySwingPoints(recentData);
        // 1. Calculate Fibonacci levels from swing points
        const levels = this.calculateFibonacciLevels(swings, timeframe);
        // 2. Create Fibonacci grid analysis
        const grid = this.createFibonacciGrid(levels, recentData, timeframe);
        // 3. Identify confluence zones
        const confluenceZones = this.identifyConfluenceZones(levels, grid);
        // 4. Analyze Fibonacci waves (Elliott Wave patterns)
        const waves = this.analyzeFibonacciWaves(swings, recentData);
        // 5. Find Fibonacci clusters
        const clusters = this.identifyFibonacciClusters(levels);
        return {
            levels,
            grid,
            confluenceZones,
            waves,
            clusters
        };
    }
    /**
     * Identifies swing points for Fibonacci analysis
     */
    identifySwingPoints(data) {
        const swings = [];
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        // Find significant highs (higher highs)
        for (let i = 2; i < highs.length - 2; i++) {
            const currentHigh = highs[i];
            const leftHigh = Math.max(...highs.slice(0, i));
            const rightHigh = Math.max(...highs.slice(i + 2));
            if (currentHigh > leftHigh && currentHigh > rightHigh) {
                // Potential swing high
                let isValid = true;
                // Check if it's a significant high (not broken for at least 5 candles)
                for (let j = i + 1; j < Math.min(i + 10, highs.length - 1); j++) {
                    if (highs[j] > currentHigh) {
                        isValid = false;
                        break;
                    }
                }
                if (isValid) {
                    swings.push({
                        price: currentHigh,
                        type: 'HIGH',
                        index: i,
                        timestamp: data[i].timestamp,
                        strength: this.calculateSwingStrength(data, i, 'HIGH'),
                        isValid
                    });
                }
            }
        }
        // Find significant lows (higher lows)
        for (let i = 2; i < lows.length - 2; i++) {
            const currentLow = lows[i];
            const leftLow = Math.min(...lows.slice(0, i));
            const rightLow = Math.min(...lows.slice(i + 2));
            if (currentLow < leftLow && currentLow < rightLow) {
                // Potential swing low
                let isValid = true;
                // Check if it's a significant low (not broken for at least 5 candles)
                for (let j = i + 1; j < Math.min(i + 10, lows.length - 1); j++) {
                    if (lows[j] < currentLow) {
                        isValid = false;
                        break;
                    }
                }
                if (isValid) {
                    swings.push({
                        price: currentLow,
                        type: 'LOW',
                        index: i,
                        timestamp: data[i].timestamp,
                        strength: this.calculateSwingStrength(data, i, 'LOW'),
                        isValid
                    });
                }
            }
        }
        return swings;
    }
    /**
     * Calculates Fibonacci retracement and extension levels
     */
    calculateFibonacciLevels(swings, timeframe) {
        const levels = [];
        const now = new Date();
        // Analyze each swing pair
        for (let i = 0; i < swings.length - 1; i++) {
            for (let j = i + 1; j < swings.length; j++) {
                const currentSwing = swings[i];
                const nextSwing = swings[j];
                if (currentSwing.type === 'HIGH' && nextSwing.type === 'LOW') {
                    // Retracement (high to low)
                    const retracementLevels = this.calculateRetracementLevels(currentSwing, nextSwing, now);
                    levels.push(...retracementLevels);
                }
                else if (currentSwing.type === 'LOW' && nextSwing.type === 'HIGH') {
                    // Extension (low to high)
                    const extensionLevels = this.calculateExtensionLevels(currentSwing, nextSwing, now);
                    levels.push(...extensionLevels);
                    // Also calculate projections from the extension
                    const projections = this.calculateProjections(currentSwing, nextSwing, extensionLevels);
                    levels.push(...projections);
                }
            }
        }
        // Add time zone levels (89.4, 127.2, 161.8)
        if (swings.length >= 2) {
            const timeZones = this.calculateTimeZones(swings, now);
            levels.push(...timeZones);
        }
        return levels.sort((a, b) => b.confluence - a.confluence);
    }
    /**
     * Calculates Fibonacci retracement levels
     */
    calculateRetracementLevels(startSwing, endSwing, timestamp) {
        const levels = [];
        const startPrice = startSwing.price;
        const endPrice = endSwing.price;
        const moveSize = Math.abs(endPrice - startPrice);
        this.primaryRatios.forEach(ratio => {
            const levelPrice = startPrice > endPrice
                ? endPrice + (moveSize * ratio)
                : startPrice - (moveSize * ratio);
            levels.push({
                price: levelPrice,
                levelType: 'RETRACEMENT',
                ratio,
                strength: this.calculateLevelStrength(ratio, moveSize),
                confluence: 0,
                timeframe: '1h',
                startPrice,
                endPrice,
                isValid: true,
                touches: [],
                projectedTargets: [],
                stopLoss: 0,
                riskReward: 0
            });
        });
        return levels;
    }
    /**
     * Calculates Fibonacci extension levels
     */
    calculateExtensionLevels(startSwing, endSwing, timestamp) {
        const levels = [];
        const startPrice = startSwing.price;
        const endPrice = endSwing.price;
        const moveSize = Math.abs(endPrice - startPrice);
        this.extensionRatios.forEach(ratio => {
            const levelPrice = startPrice > endPrice
                ? startPrice + (moveSize * ratio)
                : startPrice - (moveSize * ratio);
            levels.push({
                price: levelPrice,
                levelType: 'EXTENSION',
                ratio,
                strength: this.calculateLevelStrength(ratio, moveSize * 1.618), // Extensions often use 1.618
                confluence: 0,
                timeframe: '1h',
                startPrice,
                endPrice,
                isValid: true,
                touches: [],
                projectedTargets: [],
                stopLoss: 0,
                riskReward: 0
            });
        });
        return levels;
    }
    /**
     * Calculates Fibonacci projection levels
     */
    calculateProjections(startSwing, endSwing, extensionLevels) {
        const projections = [];
        const moveSize = Math.abs(endSwing.price - startSwing.price);
        extensionLevels.forEach(level => {
            // Project from extension level
            const projectionMove = moveSize * (level.ratio - 1);
            this.projectionRatios.forEach(projRatio => {
                const projectionPrice = level.price > startSwing.price
                    ? level.price + projectionMove * projRatio
                    : level.price - projectionMove * projRatio;
                projections.push({
                    price: projectionPrice,
                    levelType: 'PROJECTION',
                    ratio: projRatio,
                    strength: this.calculateLevelStrength(projRatio, Math.abs(projectionMove)),
                    confluence: 0,
                    timeframe: '1h',
                    startPrice: level.price,
                    endPrice: projectionPrice,
                    isValid: false, // Projections are theoretical
                    touches: [],
                    projectedTargets: [projectionPrice],
                    stopLoss: 0,
                    riskReward: 0
                });
            });
        });
        return projections;
    }
    /**
     * Calculates Fibonacci time zones
     */
    calculateTimeZones(swings, timestamp) {
        const timeZones = [];
        const timeDiffs = [];
        // Calculate time differences between swings
        for (let i = 1; i < swings.length; i++) {
            const timeDiff = swings[i].timestamp.getTime() - swings[i - 1].timestamp.getTime();
            timeDiffs.push(timeDiff);
        }
        // Average time difference
        const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
        // Find time zones based on ratios
        const zoneRatios = [0.382, 0.5, 0.618, 1.0, 1.618, 2.618, 4.236];
        zoneRatios.forEach(ratio => {
            const zoneTime = avgTimeDiff * ratio;
            const futureTimestamp = new Date(timestamp.getTime() + zoneTime);
            // Project price movement during this time
            // Simplified - would use volatility and momentum in production
            const projectedPrice = swings[swings.length - 1].price * (1 + ratio * 0.1);
            timeZones.push({
                price: projectedPrice,
                levelType: 'TIME_ZONE',
                ratio,
                strength: this.calculateLevelStrength(ratio, 1),
                confluence: 0,
                timeframe: '1d', // Time zones work better on daily charts
                startPrice: swings[swings.length - 1].price,
                endPrice: projectedPrice,
                isValid: false,
                touches: [],
                projectedTargets: [],
                stopLoss: 0,
                riskReward: 0
            });
        });
        return timeZones;
    }
    /**
     * Creates Fibonacci grid analysis
     */
    createFibonacciGrid(levels, data, timeframe) {
        const grid = [];
        const currentPrice = data[data.length - 1].close;
        // Organize levels by Fibonacci sequence
        const levelMap = new Map();
        levels.forEach(level => {
            // Round price to nearest 0.01 for grid organization
            const roundedPrice = Math.round(level.price * 100) / 100;
            if (!levelMap.has(roundedPrice)) {
                levelMap.set(roundedPrice, []);
            }
        });
        // Fill grid with all Fibonacci ratios
        levelMap.forEach((priceLevels, price) => {
            this.primaryRatios.forEach(ratio => {
                const matchingLevel = levels.find(l => Math.abs(l.price - price) < this.tolerancePercent);
                if (matchingLevel && matchingLevel.ratio === ratio) {
                    priceLevels.push({
                        price: matchingLevel.price,
                        level: ratio,
                        type: matchingLevel.levelType,
                        strength: matchingLevel.strength,
                        isActive: this.isLevelActive(matchingLevel, data, currentPrice),
                        confluence: this.calculateGridConfluence(priceLevels, currentPrice),
                        reliability: this.calculateReliability(priceLevels, data)
                    });
                }
            });
        });
        // Convert map to array
        levelMap.forEach((priceLevels) => {
            priceLevels.forEach(level => grid.push(level));
        });
        // Calculate grid strength and trend
        const activeLevels = grid.filter(l => l.isActive);
        const gridStrength = this.calculateGridStrength(activeLevels);
        const trend = this.calculateGridTrend(activeLevels, currentPrice);
        return {
            levels: grid,
            timeframe,
            strength: gridStrength,
            trend
        };
    }
    calculateGridStrength(levels) {
        if (!levels || levels.length === 0)
            return 0;
        const total = levels.reduce((s, l) => s + (l.strength || 0), 0);
        return total / levels.length;
    }
    calculateGridTrend(levels, currentPrice) {
        if (!levels || levels.length === 0)
            return 'RANGING';
        const avgPrice = levels.reduce((s, l) => s + l.price, 0) / levels.length;
        if (currentPrice > avgPrice * 1.01)
            return 'BULLISH';
        if (currentPrice < avgPrice * 0.99)
            return 'BEARISH';
        return 'RANGING';
    }
    /**
     * Identifies confluence zones where multiple Fibonacci levels cluster
     */
    identifyConfluenceZones(levels, grid) {
        const confluenceZones = [];
        const priceGroups = new Map();
        // Group levels by price (within tolerance)
        levels.forEach(level => {
            var _a;
            const roundedPrice = Math.round(level.price * 100) / 100;
            if (!priceGroups.has(roundedPrice)) {
                priceGroups.set(roundedPrice, []);
            }
            (_a = priceGroups.get(roundedPrice)) === null || _a === void 0 ? void 0 : _a.push(level);
        });
        // Analyze each group for confluence
        priceGroups.forEach((groupLevels, price) => {
            if (groupLevels.length >= 2) {
                // Calculate confluence score
                const confluenceScore = this.calculateConfluenceScore(groupLevels);
                // Find the most significant level in the group
                const primaryLevel = groupLevels.reduce((max, level) => level.strength > max.strength ? level : max);
                // Calculate additional properties
                const types = [...new Set(groupLevels.map(l => l.levelType))];
                const timeframes = [...new Set(groupLevels.map(l => l.timeframe))];
                const avgStrength = groupLevels.reduce((sum, l) => sum + l.strength, 0) / groupLevels.length;
                // Create confluence zone
                const zone = {
                    price: price,
                    levels: groupLevels,
                    confluenceScore,
                    types,
                    timeframes,
                    strength: avgStrength,
                    reliability: this.calculateConfluenceReliability(groupLevels),
                    range: this.calculateConfluenceRange(groupLevels),
                    projectedTargets: this.calculateConfluenceTargets(groupLevels),
                    stopLoss: this.calculateConfluenceStopLoss(groupLevels, primaryLevel)
                };
                confluenceZones.push(zone);
            }
        });
        // Sort by confluence score
        return confluenceZones.sort((a, b) => b.confluenceScore - a.confluenceScore);
    }
    /**
     * Analyzes Fibonacci wave patterns (Elliott Wave Theory)
     */
    analyzeFibonacciWaves(swings, data) {
        const waves = [];
        const currentPrice = data[data.length - 1].close;
        // Identify potential waves (simplified EMA pattern)
        for (let i = 0; i < swings.length - 4; i++) {
            // Check for 5-point pattern (simplified wave)
            const waveSwings = swings.slice(i, i + 5);
            if (waveSwings.length !== 5)
                continue;
            const isValidWave = this.validateWavePattern(waveSwings);
            if (!isValidWave)
                continue;
            const wave = this.createFibonacciWave(waveSwings, data, i);
            waves.push(wave);
        }
        // Analyze current wave status
        if (waves.length > 0) {
            const currentWave = waves[waves.length - 1];
            currentWave.completed = this.isWaveCompleted(currentWave, currentPrice);
            currentWave.validity = this.calculateWaveValidity(currentWave, data, currentPrice);
            currentWave.successRate = this.simulateWavePerformance(currentWave, data);
        }
        return waves;
    }
    /**
     * Identifies Fibonacci clusters where levels converge
     */
    identifyFibonacciClusters(levels) {
        const clusters = [];
        const levelPrices = levels.map(l => l.price);
        // DBSCAN-like clustering (simplified)
        const epsilon = 50; // Price proximity threshold
        const minPoints = 3;
        const visited = new Set();
        const assigned = new Set();
        levelPrices.forEach((price, index) => {
            if (visited.has(price) || assigned.has(price))
                return;
            // Find nearby points
            const nearbyPoints = levelPrices
                .map((p, i) => ({ price: p, index: i }))
                .filter(p => Math.abs(p.price - price) <= epsilon)
                .filter(p => !assigned.has(p.price))
                .slice(0, minPoints);
            if (nearbyPoints.length < minPoints - 1)
                return;
            // Check if this can be a cluster center
            const nearbyLevels = nearbyPoints.map(p => levels[p.index]);
            const clusterCenter = price;
            const clusterRadius = Math.max(...nearbyLevels.map(l => Math.abs(l.price - clusterCenter)));
            // Calculate cluster properties
            const density = nearbyLevels.length;
            const avgStrength = nearbyLevels.reduce((sum, l) => sum + l.strength, 0) / nearbyLevels.length;
            const confluence = this.calculateClusterConfluence(nearbyLevels);
            // Determine significance
            let significance;
            if (density >= 5 && avgStrength > 60 && confluence > 3) {
                significance = 'CRITICAL';
            }
            else if (density >= 3 && avgStrength > 40) {
                significance = 'MAJOR';
            }
            else {
                significance = 'MINOR';
            }
            clusters.push({
                clusterCenter,
                radius: clusterRadius,
                levels: nearbyLevels,
                density,
                strength: avgStrength,
                significance
            });
            // Mark points as assigned
            nearbyPoints.forEach(p => assigned.add(p.price));
        });
        return clusters.sort((a, b) => b.density - a.density);
    }
    // Helper methods
    calculateSwingStrength(data, index, type) {
        const lookback = Math.min(50, index);
        const volumeSlice = data.slice(Math.max(0, index - lookback), index + lookback);
        const avgVolume = volumeSlice.reduce((sum, d) => sum + d.volume, 0) / volumeSlice.length;
        const swingVolume = data[index].volume;
        return Math.min(100, (swingVolume / avgVolume) * 50);
    }
    calculateLevelStrength(ratio, moveSize) {
        // Primary ratios get higher strength
        const ratioStrength = this.primaryRatios.includes(ratio) ? 80 : 60;
        const extensionBonus = ratio > 1 ? 20 : 0;
        const moveSizeBonus = Math.min(50, Math.abs(moveSize) / 500 * 100);
        return Math.min(100, ratioStrength + extensionBonus + moveSizeBonus);
    }
    isLevelActive(level, data, currentPrice) {
        const tolerance = level.price * this.tolerancePercent;
        return Math.abs(currentPrice - level.price) <= tolerance;
    }
    calculateGridConfluence(levels, currentPrice) {
        let confluence = 0;
        const tolerance = currentPrice * this.tolerancePercent;
        levels.forEach(level => {
            if (Math.abs(currentPrice - level.price) <= tolerance) {
                confluence += level.strength;
            }
        });
        return Math.min(100, confluence);
    }
    calculateReliability(levels, data) {
        // Higher reliability for levels with more historical validation
        let totalTouches = 0;
        let validTouches = 0;
        levels.forEach(level => {
            const touches = level.touches || [];
            totalTouches += touches.length;
            validTouches += touches.filter(t => this.isValidTouch(level, data, t.price)).length;
        });
        return totalTouches > 0 ? (validTouches / totalTouches) * 100 : 50;
    }
    calculateConfluenceScore(levels) {
        let score = 0;
        const typeWeight = {
            'RETRACEMENT': 30,
            'EXTENSION': 25,
            'PROJECTION': 15,
            'TIME_ZONE': 20
        };
        const ratioWeight = {
            0.236: 90,
            0.382: 85,
            0.5: 75,
            0.618: 80,
            0.786: 60,
            1.0: 50,
            1.272: 35,
            1.618: 25
        };
        levels.forEach(level => {
            const typeBonus = typeWeight[level.levelType] || 0;
            const ratioKey = String(Math.round(level.ratio * 1000) / 1000);
            const ratioBonus = ratioWeight[ratioKey] || 0;
            score += level.strength + typeBonus + ratioBonus;
        });
        return Math.min(100, score);
    }
    calculateConfluenceReliability(levels) {
        // Higher reliability for confluence with more diverse levels
        const typeCount = new Set(levels.map(l => l.levelType)).size;
        const ratioCount = new Set(levels.map(l => Math.round(l.ratio * 100) / 100)).size;
        const avgStrength = levels.reduce((sum, l) => sum + l.strength, 0) / levels.length;
        return Math.min(100, (typeCount * 20 + ratioCount * 10 + avgStrength * 0.5));
    }
    calculateConfluenceRange(levels) {
        const prices = levels.map(l => l.price);
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        return high - low;
    }
    calculateConfluenceTargets(levels) {
        const primaryLevel = levels.reduce((max, level) => level.strength > max.strength ? level : max);
        // Calculate targets from strongest level
        const moveSize = Math.abs(primaryLevel.endPrice - primaryLevel.startPrice);
        const targets = [
            primaryLevel.startPrice + (moveSize * 1.272), // 1.272 extension
            primaryLevel.startPrice + (moveSize * 1.618), // Golden ratio
            primaryLevel.startPrice + (moveSize * 2.0) // 2x extension
        ];
        return targets;
    }
    calculateConfluenceStopLoss(levels, primaryLevel) {
        // Set stop loss below lowest level or below start
        const lowestLevel = Math.min(...levels.map(l => l.price));
        return Math.min(primaryLevel.price, lowestLevel) * 0.98;
    }
    validateWavePattern(swings) {
        if (swings.length !== 5)
            return false;
        // Check if it follows basic EMA pattern
        const prices = swings.map(s => s.price);
        let isValidSequence = true;
        // Pattern: 5 waves for EMA
        const expectedPattern = [
            prices[0] > prices[1], prices[1] > prices[2], prices[2] < prices[1],
            prices[3] > prices[4], prices[4] < prices[3]
        ];
        // Simplified validation: every expectedPattern entry must be true
        for (let i = 0; i < expectedPattern.length; i++) {
            if (!expectedPattern[i]) {
                isValidSequence = false;
                break;
            }
        }
        return isValidSequence;
    }
    createFibonacciWave(swings, data, startIndex) {
        const waveType = swings[0].type === 'HIGH' ? 'IMPULSE' : 'CORRECTIVE';
        const direction = swings[swings.length - 1].price > swings[0].price ? 'UP' : 'DOWN';
        return {
            waveNumber: Math.floor(startIndex / 3) + 1,
            waveType,
            direction,
            startPrice: swings[0].price,
            endPrice: swings[swings.length - 1].price,
            level: Math.abs(swings[swings.length - 1].price - swings[0].price),
            validity: 5, // All 5 levels are initially valid
            timeframes: ['1h', '4h', '1d'],
            completed: false,
            successRate: 0
        };
    }
    isWaveCompleted(wave, currentPrice) {
        if (wave.direction === 'UP') {
            return currentPrice > wave.endPrice;
        }
        else {
            return currentPrice < wave.endPrice;
        }
    }
    calculateWaveValidity(wave, data, currentPrice) {
        const wavePriceRange = Math.abs(wave.endPrice - wave.startPrice);
        const priceMovement = Math.abs(currentPrice - wave.startPrice);
        // Check if price is still moving in wave direction
        const progressRatio = priceMovement / wavePriceRange;
        if (wave.direction === 'UP' && progressRatio > 0.8) {
            return Math.max(0, 100 - (progressRatio - 0.8) * 100); // Wave likely broken
        }
        else if (wave.direction === 'DOWN' && progressRatio > 0.8) {
            return Math.max(0, 100 - (progressRatio - 0.8) * 100); // Wave likely broken
        }
        else if (progressRatio > 0.5) {
            return Math.max(50, 100 - (progressRatio - 0.5) * 100); // Wave might be ending
        }
        else {
            return Math.min(100, progressRatio * 100); // Wave still valid
        }
    }
    simulateWavePerformance(wave, data) {
        // Simplified wave success calculation
        const futureMove = wave.direction === 'UP' ?
            Math.min(0.5, Math.random()) :
            Math.max(-0.5, Math.random());
        const expectedMove = wave.level * futureMove;
        const actualMove = Math.abs(data[data.length - 1].close - data[0].close);
        return Math.min(100, Math.max(0, 100 - Math.abs(expectedMove - actualMove)) * 50);
    }
    isValidTouch(level, data, touchPrice) {
        // Check if the price reaction validates the level
        const touchIndex = data.findIndex(d => (d.high >= touchPrice && touchPrice >= d.low) ||
            (d.low <= touchPrice && touchPrice <= d.high));
        if (touchIndex === -1)
            return false;
        // Check reaction after touch
        const nextCandles = data.slice(touchIndex + 1, touchIndex + 6);
        // Ideal reaction: price moves away from level after touch
        let hasReaction = false;
        const isSupport = touchPrice < data[touchIndex].close;
        const isResistance = touchPrice > data[touchIndex].close;
        for (const nextCandle of nextCandles) {
            if (isSupport && nextCandle.close > touchPrice) {
                hasReaction = true;
                break;
            }
            else if (isResistance && nextCandle.close < touchPrice) {
                hasReaction = true;
                break;
            }
        }
        return hasReaction;
    }
    calculateClusterConfluence(levels) {
        const typeCount = new Set(levels.map(l => l.levelType)).size;
        const avgStrength = levels.reduce((sum, l) => sum + l.strength, 0) / levels.length;
        const levelSpread = this.calculateLevelSpread(levels);
        return Math.min(100, (typeCount * 25 + avgStrength * 0.3 + (100 - levelSpread) * 0.2));
    }
    calculateLevelSpread(levels) {
        if (levels.length < 2)
            return 0;
        const prices = levels.map(l => l.price);
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        return ((high - low) / low) * 100;
    }
}
exports.FibonacciAnalysis = FibonacciAnalysis;
//# sourceMappingURL=fibonacciAnalysis.js.map