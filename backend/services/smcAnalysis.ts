import { MarketData, TechnicalIndicators } from '../../src/types';

interface SMCLevels {
  swingHigh: number;
  swingLow: number;
  imbalancedLows: number[];
  imbalancedHighs: number[];
  premium: number;
  discount: number;
  buySideLiquidity: number;
  sellSideLiquidity: number;
  orderBlocks: OrderBlock[];
  fairValueGap: FairValueGap[];
}

interface OrderBlock {
  price: number;
  timestamp: Date;
  volume: number;
  type: 'BUY' | 'SELL';
  strength: number;
  takeProfit: number[];
  stopLoss: number;
}

interface FairValueGap {
  gapHigh: number;
  gapLow: number;
  filled: boolean;
  fillPercentage: number;
  createdAt: Date;
}

interface VolumeProfile {
  priceLevels: PriceLevel[];
  valueArea: { high: number; low: number };
  poc: number; // Point of Control
  volumeAtPrice: (price: number) => number;
}

interface PriceLevel {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cumulativeDelta: number;
  trades: number;
}

interface MarketStructure {
  higherHighs: number[];
  higherLows: number[];
  lowerHighs: number[];
  lowerLows: number[];
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  lastSwing: {
    high: number;
    low: number;
    type: 'HIGHER_HIGH' | 'HIGHER_LOW' | 'LOWER_HIGH' | 'LOWER_LOW';
  };
}

interface LiquidityZone {
  entryZone: { high: number; low: number };
  targetZone: { high: number; low: number };
  stopZone: { high: number; low: number };
  probability: number;
  timeframe: string;
}

export class SMCAnalysis {
  private lookbackPeriod = 100;
  private volumeThreshold = 1.5;
  private minSvingPoints = 2;

  /**
   * Analyzes market data for Smart Money Concepts
   * Identifies institutional order flow, liquidity, and market structure
   */
  analyzeMarketData(
    marketData: MarketData[],
    timeframe: string = '1h'
  ): SMCLevels {
    if (marketData.length < this.lookbackPeriod) {
      throw new Error(`Insufficient data. Need at least ${this.lookbackPeriod} candles`);
    }

    const recentData = marketData.slice(-this.lookbackPeriod);

    // 1. Identify Market Structure
    const marketStructure = this.identifyMarketStructure(recentData);

    // 2. Calculate Volume Profile
    const volumeProfile = this.calculateVolumeProfile(recentData);

    // 3. Identify Order Blocks
    const orderBlocks = this.identifyOrderBlocks(recentData, volumeProfile);

    // 4. Find Fair Value Gaps
    const fairValueGaps = this.identifyFairValueGaps(recentData);

    // 5. Calculate SMC Levels
    const smcLevels = this.calculateSMCLevels(
      marketStructure,
      volumeProfile,
      orderBlocks,
      fairValueGaps,
      recentData
    );

    return {
      swingHigh: smcLevels.swingHigh,
      swingLow: smcLevels.swingLow,
      imbalancedLows: smcLevels.imbalancedLows,
      imbalancedHighs: smcLevels.imbalancedHighs,
      premium: smcLevels.premium,
      discount: smcLevels.discount,
      buySideLiquidity: smcLevels.buySideLiquidity,
      sellSideLiquidity: smcLevels.sellSideLiquidity,
      orderBlocks: orderBlocks,
      fairValueGap: fairValueGaps
    };
  }

  /**
   * Identifies market structure points (higher highs, higher lows, etc.)
   */
  private identifyMarketStructure(data: MarketData[]): MarketStructure {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);

    // Find swing points using fractal pattern recognition
    const swingPoints = this.findSwingPoints(highs, lows);

    // Classify market structure
    const higherHighs = this.findHigherHighs(swingPoints.highPoints, highs);
    const higherLows = this.findHigherLows(swingPoints.lowPoints, lows);
    const lowerHighs = this.findLowerHighs(swingPoints.highPoints, highs);
    const lowerLows = this.findLowerLows(swingPoints.lowPoints, lows);

    // Determine trend
    const trend = this.determineTrend(higherHighs, higherLows, closes[closes.length - 1]);

    // Get last significant swing
    const lastSwing = this.getLastSwingPoint(swingPoints, highs, lows);

    return {
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
      trend,
      lastSwing
    };
  }

  /**
   * Calculates volume profile with delta analysis
   */
  private calculateVolumeProfile(data: MarketData[]): VolumeProfile {
    const priceLevels: PriceLevel[] = [];
    const priceRanges = new Map<number, PriceLevel>();

    // Group trades by price levels
    for (const candle of data) {
      const high = Math.round(candle.high * 100) / 100;
      const low = Math.round(candle.low * 100) / 100;

      for (let price = low; price <= high; price += 0.01) {
        const roundedPrice = Math.round(price * 100) / 100;

        if (!priceRanges.has(roundedPrice)) {
          priceRanges.set(roundedPrice, {
            price: roundedPrice,
            volume: 0,
            buyVolume: 0,
            sellVolume: 0,
            delta: 0,
            cumulativeDelta: 0,
            trades: 0
          });
        }

        const level = priceRanges.get(roundedPrice)!;
        level.volume += candle.volume;
        level.trades += 1;

        // Estimate buy/sell delta using candle structure
        if (candle.close > candle.open) {
          level.buyVolume += candle.volume * 0.6;
          level.sellVolume += candle.volume * 0.4;
        } else {
          level.buyVolume += candle.volume * 0.4;
          level.sellVolume += candle.volume * 0.6;
        }
      }
    }

    // Calculate cumulative delta and identify value area
    const levels = Array.from(priceRanges.values()).sort((a, b) => a.price - b.price);
    let cumulativeDelta = 0;
    let totalVolume = 0;

    for (const level of levels) {
      level.delta = level.buyVolume - level.sellVolume;
      cumulativeDelta += level.delta;
      level.cumulativeDelta = cumulativeDelta;
      totalVolume += level.volume;
    }

    // Find Point of Control (POC) - highest volume level
    const poc = levels.reduce((max, level) =>
      level.volume > max.volume ? level : max, levels[0]);

    // Calculate Value Area (70% of volume)
    const valueArea = this.calculateValueArea(levels, totalVolume);

    return {
      priceLevels: levels,
      valueArea,
      poc: poc.price,
      volumeAtPrice: (price: number) => {
        const level = levels.find(l => Math.abs(l.price - price) < 0.01);
        return level ? level.volume : 0;
      }
    };
  }

  /**
   * Identifies order blocks based on price rejection and volume anomalies
   */
  private identifyOrderBlocks(data: MarketData[], volumeProfile: VolumeProfile): OrderBlock[] {
    const orderBlocks: OrderBlock[] = [];
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    const volumeThreshold = avgVolume * this.volumeThreshold;

    for (let i = 3; i < data.length - 3; i++) {
      const candle = data[i];
      const previousCandles = data.slice(i - 3, i);
      const nextCandles = data.slice(i + 1, i + 4);

      // Look for strong directional moves followed by rejection
      const isHighVolume = candle.volume > volumeThreshold;
      const isStrongMove = Math.abs(candle.close - candle.open) >
        (candle.high - candle.low) * 0.6;

      // Check for price rejection in subsequent candles
      const hasRejection = nextCandles.some(nextCandle =>
        (candle.close > candle.open && nextCandle.high < candle.high) ||
        (candle.close < candle.open && nextCandle.low > candle.low)
      );

      if (isHighVolume && isStrongMove && hasRejection) {
        const orderBlockType = candle.close > candle.open ? 'BUY' : 'SELL';
        const strength = this.calculateOrderBlockStrength(
          candle, previousCandles, nextCandles, orderBlockType
        );

        if (strength > 0.6) {
          const { takeProfit, stopLoss } = this.calculateOrderBlockTargets(
            candle, orderBlockType, volumeProfile
          );

          orderBlocks.push({
            price: candle.close,
            timestamp: new Date(candle.timestamp),
            volume: candle.volume,
            type: orderBlockType,
            strength,
            takeProfit,
            stopLoss
          });
        }
      }
    }

    return orderBlocks.filter((ob, index, self) =>
      index === 0 ||
      self.findIndex(other => Math.abs(other.price - ob.price) < 0.01) === index
    );
  }

  /**
   * Identifies Fair Value Gaps in price action
   */
  private identifyFairValueGaps(data: MarketData[]): FairValueGap[] {
    const fvg: FairValueGap[] = [];

    for (let i = 2; i < data.length; i++) {
      const candle1 = data[i - 2];
      const candle2 = data[i - 1];
      const candle3 = data[i];

      // Look for 3-candle pattern with gap
      if (candle2.high < candle1.low && candle3.low > candle2.high) {
        // Bullish FVG
        const gap = candle1.low - candle2.high;
        fvg.push({
          gapHigh: candle2.high,
          gapLow: candle1.low,
          filled: false,
          fillPercentage: 0,
          createdAt: new Date(candle2.timestamp)
        });
      } else if (candle2.low > candle1.high && candle3.high < candle2.low) {
        // Bearish FVG
        const gap = candle2.low - candle1.high;
        fvg.push({
          gapHigh: candle1.high,
          gapLow: candle2.low,
          filled: false,
          fillPercentage: 0,
          createdAt: new Date(candle2.timestamp)
        });
      }
    }

    // Calculate fill status for existing FVGs
    const currentPrice = data[data.length - 1].close;
    for (const gap of fvg) {
      if (gap.gapLow > gap.gapHigh) {
        // Bearish FVG
        if (currentPrice <= gap.gapLow) {
          gap.filled = true;
          gap.fillPercentage = 100;
        } else if (currentPrice < gap.gapHigh) {
          gap.fillPercentage = ((gap.gapHigh - currentPrice) / (gap.gapHigh - gap.gapLow)) * 100;
        }
      } else {
        // Bullish FVG
        if (currentPrice >= gap.gapHigh) {
          gap.filled = true;
          gap.fillPercentage = 100;
        } else if (currentPrice > gap.gapLow) {
          gap.fillPercentage = ((currentPrice - gap.gapLow) / (gap.gapHigh - gap.gapLow)) * 100;
        }
      }
    }

    return fvg.filter(gap => !gap.filled); // Only return unfilled FVGs
  }

  /**
   * Calculates SMC levels based on all analysis
   */
  private calculateSMCLevels(
    structure: MarketStructure,
    volumeProfile: VolumeProfile,
    orderBlocks: OrderBlock[],
    fairValueGaps: FairValueGap[],
    data: MarketData[]
  ): {
    swingHigh: number;
    swingLow: number;
    imbalancedLows: number[];
    imbalancedHighs: number[];
    premium: number;
    discount: number;
    buySideLiquidity: number;
    sellSideLiquidity: number;
  } {
    const recentHighs = structure.higherHighs.slice(-3);
    const recentLows = structure.higherLows.slice(-3);

    // Find most significant swing points
    const swingHigh = recentHighs.length > 0 ? Math.max(...recentHighs) : data[data.length - 1].high;
    const swingLow = recentLows.length > 0 ? Math.min(...recentLows) : data[data.length - 1].low;

    // Identify imbalanced price areas
    const imbalancedHighs = this.findImbalancedPriceLevels(
      data, 'HIGH', volumeProfile
    );
    const imbalancedLows = this.findImbalancedPriceLevels(
      data, 'LOW', volumeProfile
    );

    // Calculate premium and discount from value area
    const { valueArea, poc } = volumeProfile;
    const premium = Math.max(0, swingHigh - valueArea.high);
    const discount = Math.max(0, valueArea.low - swingLow);

    // Calculate liquidity zones
    const { buyLiquidity, sellLiquidity } = this.calculateLiquidityZones(
      data, volumeProfile, swingHigh, swingLow
    );

    return {
      swingHigh,
      swingLow,
      imbalancedLows,
      imbalancedHighs,
      premium,
      discount,
      buySideLiquidity: buyLiquidity,
      sellSideLiquidity: sellLiquidity
    };
  }

  /**
   * Finds swing points using fractal pattern
   */
  private findSwingPoints(highs: number[], lows: number[]): {
    highPoints: number[];
    lowPoints: number[];
  } {
    // Simple fractal identification
    const highPoints: number[] = [];
    const lowPoints: number[] = [];

    for (let i = 2; i < highs.length - 2; i++) {
      const currentHigh = highs[i];
      const currentLow = lows[i];

      // Check for high fractal (peak)
      if (currentHigh > highs[i-1] &&
          currentHigh > highs[i-2] &&
          currentHigh > highs[i+1] &&
          currentHigh > highs[i+2]) {
        highPoints.push(currentHigh);
      }

      // Check for low fractal (valley)
      if (currentLow < lows[i-1] &&
          currentLow < lows[i-2] &&
          currentLow < lows[i+1] &&
          currentLow < lows[i+2]) {
        lowPoints.push(currentLow);
      }
    }

    return { highPoints, lowPoints };
  }

  private findHigherHighs(swingPoints: any[], highs: number[]): number[] {
    const higherHighs: number[] = [];
    let currentMax = -Infinity;

    for (let i = 0; i < highs.length; i++) {
      if (highs[i] > currentMax) {
        currentMax = highs[i];
        higherHighs.push(highs[i]);
      }
    }

    return higherHighs;
  }

  private findHigherLows(swingPoints: any[], lows: number[]): number[] {
    const higherLows: number[] = [];
    let currentMax = Infinity;

    for (let i = 0; i < lows.length; i++) {
      if (lows[i] < currentMax) {
        currentMax = lows[i];
        higherLows.push(lows[i]);
      }
    }

    return higherLows;
  }

  private findLowerHighs(swingPoints: any[], highs: number[]): number[] {
    const lowerHighs: number[] = [];
    let currentMin = Infinity;

    for (let i = highs.length - 1; i >= 0; i--) {
      if (highs[i] < currentMin) {
        currentMin = highs[i];
        lowerHighs.push(highs[i]);
      }
    }

    return lowerHighs;
  }

  private findLowerLows(swingPoints: any[], lows: number[]): number[] {
    const lowerLows: number[] = [];
    let currentMin = Infinity;

    for (let i = lows.length - 1; i >= 0; i--) {
      if (lows[i] < currentMin) {
        currentMin = lows[i];
        lowerLows.push(lows[i]);
      }
    }

    return lowerLows;
  }

  private determineTrend(
    higherHighs: number[],
    higherLows: number[],
    currentPrice: number
  ): 'BULLISH' | 'BEARISH' | 'RANGING' {
    const lastHH = higherHighs[higherHighs.length - 1];
    const lastHL = higherLows[higherLows.length - 1];

    if (currentPrice > lastHH && currentPrice > lastHL) {
      return 'BULLISH';
    } else if (currentPrice < lastHH && currentPrice < lastHL) {
      return 'BEARISH';
    } else {
      return 'RANGING';
    }
  }

  private getLastSwingPoint(swingPoints: any, highs: number[], lows: number[]): {
    high: number;
    low: number;
    type: 'HIGHER_HIGH' | 'HIGHER_LOW' | 'LOWER_HIGH' | 'LOWER_LOW';
  } {
    // Implementation for identifying the last significant swing
    const lastHigh = Math.max(...highs.slice(-10));
    const lastLow = Math.min(...lows.slice(-10));

    return {
      high: lastHigh,
      low: lastLow,
      type: 'HIGHER_HIGH' // Simplified for now
    };
  }

  private calculateValueArea(levels: PriceLevel[], totalVolume: number): {
    high: number;
    low: number;
  } {
    const targetVolume = totalVolume * 0.7; // 70% of total volume
    let accumulatedVolume = 0;
    let valueAreaHigh = levels[0].price;
    let valueAreaLow = levels[0].price;

    // Find the price range that contains 70% of volume
    for (const level of levels) {
      accumulatedVolume += level.volume;
      if (accumulatedVolume >= targetVolume) {
        valueAreaHigh = level.price;
        break;
      }
    }

    // Find the low of the value area
    accumulatedVolume = 0;
    for (let i = levels.length - 1; i >= 0; i--) {
      accumulatedVolume += levels[i].volume;
      if (accumulatedVolume >= targetVolume) {
        valueAreaLow = levels[i].price;
        break;
      }
    }

    return { high: valueAreaHigh, low: valueAreaLow };
  }

  private calculateOrderBlockStrength(
    candle: MarketData,
    previous: MarketData[],
    next: MarketData[],
    type: 'BUY' | 'SELL'
  ): number {
    let strength = 0;

    // Volume strength
    const avgVolume = previous.reduce((sum, d) => sum + d.volume, 0) / previous.length;
    strength += Math.min(1, candle.volume / (avgVolume * 2)) * 0.4;

    // Price rejection strength
    if (type === 'BUY') {
      const maxNextHigh = Math.max(...next.map(d => d.high));
      strength += Math.max(0, (candle.high - maxNextHigh) / candle.high) * 0.3;
    } else {
      const minNextLow = Math.min(...next.map(d => d.low));
      strength += Math.max(0, (minNextLow - candle.low) / candle.low) * 0.3;
    }

    // Body strength
    const bodyRatio = Math.abs(candle.close - candle.open) / (candle.high - candle.low);
    strength += bodyRatio * 0.3;

    return Math.min(1, strength);
  }

  private calculateOrderBlockTargets(
    candle: MarketData,
    type: 'BUY' | 'SELL',
    volumeProfile: VolumeProfile
  ): { takeProfit: number[]; stopLoss: number } {
    const entryPrice = candle.close;
    const range = candle.high - candle.low;

    if (type === 'BUY') {
      return {
        takeProfit: [
          entryPrice + range * 1.5, // 1.5x range
          entryPrice + range * 2.618, // Golden ratio
          entryPrice + range * 3     // 3x range
        ],
        stopLoss: entryPrice - range * 0.5
      };
    } else {
      return {
        takeProfit: [
          entryPrice - range * 1.5,
          entryPrice - range * 2.618,
          entryPrice - range * 3
        ],
        stopLoss: entryPrice + range * 0.5
      };
    }
  }

  private findImbalancedPriceLevels(
    data: MarketData[],
    type: 'HIGH' | 'LOW',
    volumeProfile: VolumeProfile
  ): number[] {
    const imbalanced: number[] = [];
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    const volumeThreshold = avgVolume * this.volumeThreshold;

    for (const level of volumeProfile.priceLevels) {
      const isHighVolume = level.volume > volumeThreshold;
      const isStrongDelta = Math.abs(level.delta) > avgVolume * 0.3;

      if (isHighVolume && isStrongDelta) {
        if (type === 'HIGH' && level.delta > 0) {
          imbalanced.push(level.price);
        } else if (type === 'LOW' && level.delta < 0) {
          imbalanced.push(level.price);
        }
      }
    }

    return imbalanced;
  }

  private calculateLiquidityZones(
    data: MarketData[],
    volumeProfile: VolumeProfile,
    swingHigh: number,
    swingLow: number
  ): { buyLiquidity: number; sellLiquidity: number } {
    const { valueArea } = volumeProfile;
    const midPrice = (swingHigh + swingLow) / 2;

    // Calculate liquidity in different zones
    let buyLiquidity = 0;
    let sellLiquidity = 0;

    for (const level of volumeProfile.priceLevels) {
      if (level.price < valueArea.low) {
        // Below value area - potential buy liquidity
        buyLiquidity += level.buyVolume;
      } else if (level.price > valueArea.high) {
        // Above value area - potential sell liquidity
        sellLiquidity += level.sellVolume;
      }
    }

    return {
      buyLiquidity: buyLiquidity,
      sellLiquidity: sellLiquidity
    };
  }

  /**
   * Generates trading signals based on SMC analysis
   */
  generateSMCSignals(
    smcLevels: SMCLevels,
    currentPrice: number,
    timeframe: string = '1h'
  ): {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number[];
    rationale: string[];
    liquidityZones: LiquidityZone[];
  } {
    const { swingHigh, swingLow, premium, discount, orderBlocks, fairValueGap } = smcLevels;
    const rationale: string[] = [];
    let confidence = 0;
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // Check order blocks
    for (const ob of orderBlocks) {
      if (Math.abs(currentPrice - ob.price) < 0.01) {
        signal = ob.type;
        confidence = ob.strength * 0.4;
        rationale.push(`Strong ${ob.type} order block at ${ob.price.toFixed(4)}`);
        break;
      }
    }

    // Check Fair Value Gaps
    for (const fvg of fairValueGap) {
      const isInGap = currentPrice >= fvg.gapLow && currentPrice <= fvg.gapHigh;
      if (isInGap) {
        if (fvg.gapLow > fvg.gapHigh) {
          signal = 'SELL';
          confidence = Math.max(confidence, (100 - fvg.fillPercentage) * 0.3);
          rationale.push(`Price in bearish FVG (${fvg.fillPercentage.toFixed(1)}% filled)`);
        } else {
          signal = 'BUY';
          confidence = Math.max(confidence, (100 - fvg.fillPercentage) * 0.3);
          rationale.push(`Price in bullish FVG (${fvg.fillPercentage.toFixed(1)}% filled)`);
        }
      }
    }

    // Check premium/discount zones
    if (discount > 0) {
      const discountRatio = discount / swingLow;
      if (discountRatio > 0.01) {
        signal = signal === 'HOLD' ? 'BUY' : signal;
        confidence = Math.max(confidence, Math.min(discountRatio * 100, 30));
        rationale.push(`Trading at ${discountRatio.toFixed(1)}% discount to fair value`);
      }
    } else if (premium > 0) {
      const premiumRatio = premium / swingHigh;
      if (premiumRatio > 0.01) {
        signal = signal === 'HOLD' ? 'SELL' : signal;
        confidence = Math.max(confidence, Math.min(premiumRatio * 100, 30));
        rationale.push(`Trading at ${premiumRatio.toFixed(1)}% premium to fair value`);
      }
    }

    // Generate liquidity zones
    const liquidityZones = this.generateLiquidityZones(smcLevels, timeframe);

    return {
      signal,
      confidence: Math.min(95, confidence + 20), // Cap at 95%
      entryPrice: currentPrice,
      stopLoss: this.calculateDynamicStopLoss(currentPrice, signal, smcLevels),
      takeProfit: this.calculateDynamicTakeProfit(currentPrice, signal, smcLevels),
      rationale,
      liquidityZones
    };
  }

  private generateLiquidityZones(
    smcLevels: SMCLevels,
    timeframe: string
  ): LiquidityZone[] {
    const zones: LiquidityZone[] = [];
    const { swingHigh, swingLow, buySideLiquidity, sellSideLiquidity } = smcLevels;

    // Buy zone (below value area with stop above)
    if (buySideLiquidity > sellSideLiquidity * 1.2) {
      zones.push({
        entryZone: {
          high: swingLow,
          low: swingLow * 0.98
        },
        targetZone: {
          high: swingHigh,
          low: swingLow * 1.02
        },
        stopZone: {
          high: swingLow * 0.96,
          low: swingLow * 0.94
        },
        probability: Math.min(85, 50 + (buySideLiquidity / sellSideLiquidity) * 20),
        timeframe
      });
    }

    // Sell zone (above value area with stop below)
    if (sellSideLiquidity > buySideLiquidity * 1.2) {
      zones.push({
        entryZone: {
          high: swingHigh * 1.02,
          low: swingHigh
        },
        targetZone: {
          high: swingHigh * 0.98,
          low: swingLow
        },
        stopZone: {
          high: swingHigh * 1.04,
          low: swingHigh * 1.06
        },
        probability: Math.min(85, 50 + (sellSideLiquidity / buySideLiquidity) * 20),
        timeframe
      });
    }

    return zones;
  }

  private calculateDynamicStopLoss(
    currentPrice: number,
    signal: 'BUY' | 'SELL' | 'HOLD',
    smcLevels: SMCLevels
  ): number {
    const { swingHigh, swingLow } = smcLevels;
    const atr = Math.abs(swingHigh - swingLow) * 0.14; // 14% of range

    if (signal === 'BUY') {
      return Math.max(currentPrice - atr * 1.5, swingLow * 0.98);
    } else if (signal === 'SELL') {
      return Math.min(currentPrice + atr * 1.5, swingHigh * 1.02);
    }
    return currentPrice * 0.98; // Default 2% stop
  }

  private calculateDynamicTakeProfit(
    currentPrice: number,
    signal: 'BUY' | 'SELL' | 'HOLD',
    smcLevels: SMCLevels
  ): number[] {
    const { swingHigh, swingLow } = smcLevels;
    const range = swingHigh - swingLow;

    if (signal === 'BUY') {
      return [
        currentPrice + range * 1.5,  // 1.5x range
        currentPrice + range * 2.618, // Golden ratio
        swingHigh * 0.98,          // Below resistance
        swingLow + range * 2         // Above support
      ];
    } else if (signal === 'SELL') {
      return [
        currentPrice - range * 1.5,  // 1.5x range
        currentPrice - range * 2.618, // Golden ratio
        swingLow * 1.02,           // Above support
        swingHigh - range * 2         // Below resistance
      ];
    }

    return [currentPrice * 1.01, currentPrice * 1.02, currentPrice * 1.03]; // Default 1-3% TP
  }
}