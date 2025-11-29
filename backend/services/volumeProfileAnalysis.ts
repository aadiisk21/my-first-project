import { MarketData, TechnicalIndicators } from '../../src/types';

interface VolumeProfile {
  priceLevels: VolumeLevel[];
  valueArea: ValueArea;
  pointOfControl: number;
  volumeWeightedAverage: number;
  marketStructure: MarketStructure;
  deltaProfile: DeltaProfile;
  compositeProfile: CompositeProfile;
}

interface VolumeLevel {
  price: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cumulativeDelta: number;
  buyTrades: number;
  sellTrades: number;
  volumeProfile: number[]; // Volume distribution across time
  supportResistance: SupportResistance;
}

interface ValueArea {
  high: number;
  low: number;
  range: number;
  volumePercentage: number;
  priceLevels: number[];
  poc: number;
  vwap: number; // Volume Weighted Average Price
}

interface SupportResistance {
  level: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'POC';
  strength: number;
  touches: number[];
  volumeAtLevel: number;
  riskReward: number;
  confluence: number;
}

interface DeltaProfile {
  cumulativeDelta: number[];
  deltaAtPrice: number[];
  buySellRatio: number;
  deltaNeutral: number;
  deltaExtreme: number;
  deltaReversal: DeltaReversal[];
}

interface DeltaReversal {
  price: number;
  timestamp: Date;
  deltaBefore: number;
  deltaAfter: number;
  strength: number;
  type: 'BULLISH' | 'BEARISH';
}

interface MarketStructure {
  structure: 'BALANCED' | 'IMBALANCED_BUY' | 'IMBALANCED_SELL' | 'ACCUMULATING' | 'DISTRIBUTING';
  strength: number;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  rotation: RotationZone[];
}

interface RotationZone {
  range: { high: number; low: number };
  volume: number;
  time: number;
  efficiency: number;
}

interface CompositeProfile {
  multiTimeframe: CompositeTimeframe[];
  vwapProfile: VwapProfile;
  developingValue: DevelopingValue;
  anomaly: VolumeAnomaly[];
  liquidity: LiquidityAnalysis;
}

interface CompositeTimeframe {
  timeframe: string;
  profile: VolumeProfile;
  weight: number;
  confluence: number;
}

interface VwapProfile {
  standard: number;
  anchored: number[];
  volumeWeighted: number[];
  deviation: number[];
  bands: VwapBand[];
}

interface VwapBand {
  upper: number;
  lower: number;
  standardDeviation: number;
  strength: number;
}

interface DevelopingValue {
  valueArea: ValueArea;
  developingPoc: number;
  developingVwap: number;
  buySellImbalance: number;
  absorptionLevel: number;
}

interface VolumeAnomaly {
  timestamp: Date;
  type: 'VOLUME_SPIKE' | 'VOLUME_DRY' | 'UNUSUAL_VOLUME' | 'ABSORPTION';
  severity: number;
  expectedVolume: number;
  actualVolume: number;
  explanation: string;
}

interface LiquidityAnalysis {
  buyLiquidity: number;
  sellLiquidity: number;
  totalLiquidity: number;
  liquidityRatio: number;
  efficientLiquidity: number;
  trappedLiquidity: number;
  liquidityZones: LiquidityZone[];
}

interface LiquidityZone {
  price: number;
  range: { high: number; low: number };
  volume: number;
  efficiency: number;
  type: 'BUY' | 'SELL' | 'NEUTRAL';
}

export class VolumeProfileAnalysis {
  private pricePrecision = 4;
  private volumeProfileLength = 500;
  private valueAreaThreshold = 70; // 70% of volume for value area
  private supportResistanceLookback = 100;
  private anomalyThreshold = 2.5; // Volume spike threshold

  /**
   * Creates comprehensive volume profile analysis
   * Combines traditional volume profile with delta analysis and market structure
   */
  analyzeVolumeProfile(
    marketData: MarketData[],
    timeframes: string[] = ['1h']
  ): VolumeProfile {
    if (marketData.length < this.volumeProfileLength) {
      throw new Error(`Insufficient data for volume profile. Need at least ${this.volumeProfileLength} candles`);
    }

    const baseProfile = this.createVolumeProfile(marketData);

    // Create profiles for multiple timeframes
    const compositeProfiles = timeframes.map(timeframe => ({
      timeframe,
      profile: this.createVolumeProfile(this.resampleData(marketData, timeframe)),
      weight: this.getTimeframeWeight(timeframe),
      confluence: 0 // Will be calculated later
    }));

    // Create composite profile with multi-timeframe analysis
    const compositeProfile = this.createCompositeProfile(baseProfile, compositeProfiles);

    return {
      ...baseProfile,
      compositeProfile
    };
  }

  /**
   * Creates detailed volume profile from market data
   */
  private createVolumeProfile(data: MarketData[]): VolumeProfile {
    // 1. Calculate basic volume levels
    const priceLevels = this.calculatePriceLevels(data);

    // 2. Identify Point of Control (POC)
    const poc = this.identifyPointOfControl(priceLevels);

    // 3. Calculate Value Area
    const valueArea = this.calculateValueArea(priceLevels, poc);

    // 4. Calculate VWAP
    const vwap = this.calculateVWAP(data);

    // 5. Create delta profile
    const deltaProfile = this.createDeltaProfile(data, priceLevels);

    // 6. Analyze market structure
    const marketStructure = this.analyzeMarketStructure(priceLevels, deltaProfile);

    // 7. Identify support and resistance levels
    const supportResistance = this.identifySupportResistance(
      priceLevels,
      data,
      poc,
      valueArea
    );

    // 8. Update price levels with additional analysis
    const enhancedPriceLevels = priceLevels.map(level => ({
      ...level,
      supportResistance: supportResistance.find(sr =>
        Math.abs(sr.level - level.price) < 0.001
      ) || this.createSupportResistance(level)
    }));

    return {
      priceLevels: enhancedPriceLevels,
      valueArea,
      pointOfControl: poc.price,
      volumeWeightedAverage: vwap.volumeWeighted,
      marketStructure,
      deltaProfile,
      compositeProfile: {} as CompositeProfile
    };
  }

  /**
   * Calculates volume at each price level
   */
  private calculatePriceLevels(data: MarketData[]): VolumeLevel[] {
    const priceLevels: Map<number, VolumeLevel> = new Map();

    // Process each candle
    for (const candle of data) {
      const high = Math.round(candle.high * Math.pow(10, this.pricePrecision));
      const low = Math.round(candle.low * Math.pow(10, this.pricePrecision));
      const close = Math.round(candle.close * Math.pow(10, this.pricePrecision));
      const open = Math.round(candle.open * Math.pow(10, this.pricePrecision));
      const volume = candle.volume;

      // Distribute volume across price range
      const priceRange = high - low;
      for (let price = low; price <= high; price++) {
        if (!priceLevels.has(price)) {
          priceLevels.set(price, {
            price: price / Math.pow(10, this.pricePrecision),
            totalVolume: 0,
            buyVolume: 0,
            sellVolume: 0,
            delta: 0,
            cumulativeDelta: 0,
            buyTrades: 0,
            sellTrades: 0,
            volumeProfile: [],
            supportResistance: {} as SupportResistance
          });
        }

        const level = priceLevels.get(price)!;

        // Update volume
        level.totalVolume += volume / (priceRange || 1);

        // Determine delta direction
        if (close > open) {
          // Bullish candle
          level.buyVolume += volume / (priceRange || 1);
          level.buyTrades += 1;
          level.delta += volume / (priceRange || 1);
        } else if (close < open) {
          // Bearish candle
          level.sellVolume += volume / (priceRange || 1);
          level.sellTrades += 1;
          level.delta -= volume / (priceRange || 1);
        }

        // Update volume profile for time analysis
        level.volumeProfile.push(volume);
        if (level.volumeProfile.length > 100) {
          level.volumeProfile.shift();
        }
      }
    }

    // Calculate cumulative delta and final metrics
    let cumulativeDelta = 0;
    const sortedLevels = Array.from(priceLevels.values()).sort((a, b) => a.price - b.price);

    for (const level of sortedLevels) {
      cumulativeDelta += level.delta;
      level.cumulativeDelta = cumulativeDelta;
    }

    return sortedLevels;
  }

  /**
   * Identifies the Point of Control (highest volume level)
   */
  private identifyPointOfControl(priceLevels: VolumeLevel[]): VolumeLevel {
    return priceLevels.reduce((max, level) =>
      level.totalVolume > max.totalVolume ? level : max
    );
  }

  /**
   * Calculates the Value Area (70% of volume)
   */
  private calculateValueArea(priceLevels: VolumeLevel[], poc: VolumeLevel): ValueArea {
    const totalVolume = priceLevels.reduce((sum, level) => sum + level.totalVolume, 0);
    const targetVolume = totalVolume * (this.valueAreaThreshold / 100);

    // Find the price range containing targetVolume
    let cumulativeVolume = 0;
    let valueAreaHigh = poc.price;
    let valueAreaLow = poc.price;
    let valueAreaLevels: number[] = [];

    // Start from POC and expand outward
    let upperIndex = priceLevels.findIndex(level => Math.abs(level.price - poc.price) < 0.0001);
    let lowerIndex = upperIndex;

    while (cumulativeVolume < targetVolume &&
           (upperIndex < priceLevels.length - 1 || lowerIndex > 0)) {

      // Check upper level
      if (upperIndex < priceLevels.length - 1) {
        upperIndex++;
        const upperLevel = priceLevels[upperIndex];
        cumulativeVolume += upperLevel.totalVolume;
        valueAreaHigh = upperLevel.price;
        valueAreaLevels.push(upperLevel.price);
      }

      // Check lower level
      if (lowerIndex > 0 && cumulativeVolume < targetVolume) {
        lowerIndex--;
        const lowerLevel = priceLevels[lowerIndex];
        cumulativeVolume += lowerLevel.totalVolume;
        valueAreaLow = lowerLevel.price;
        valueAreaLevels.push(lowerLevel.price);
      }
    }

    const volumePercentage = (cumulativeVolume / totalVolume) * 100;

    return {
      high: valueAreaHigh,
      low: valueAreaLow,
      range: valueAreaHigh - valueAreaLow,
      volumePercentage,
      priceLevels: valueAreaLevels.sort((a, b) => a - b),
      poc: poc.price,
      vwap: this.calculateVWAPFromLevels(priceLevels)
    };
  }

  /**
   * Calculates Volume Weighted Average Price (VWAP)
   */
  private calculateVWAP(data: MarketData[]): {
    volumeWeighted: number;
    standard: number;
    deviation: number[];
  } {
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;
    const vwapValues: number[] = [];

    for (const candle of data) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = candle.volume;

      cumulativeVolume += volume;
      cumulativeVolumePrice += typicalPrice * volume;

      const vwap = cumulativeVolumePrice / cumulativeVolume;
      vwapValues.push(vwap);
    }

    // Calculate standard deviation
    const mean = vwapValues.reduce((sum, val) => sum + val, 0) / vwapValues.length;
    const variance = vwapValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / vwapValues.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      volumeWeighted: vwapValues[vwapValues.length - 1],
      standard: mean,
      deviation: vwapValues.map(val => val - mean)
    };
  }

  /**
   * Creates delta profile analyzing buying vs selling pressure
   */
  private createDeltaProfile(data: MarketData[], priceLevels: VolumeLevel[]): DeltaProfile {
    const cumulativeDelta: number[] = [];
    const deltaAtPrice: number[] = [];
    let totalBuyVolume = 0;
    let totalSellVolume = 0;

    for (const level of priceLevels) {
      cumulativeDelta.push(level.cumulativeDelta);
      deltaAtPrice.push(level.delta);
      totalBuyVolume += level.buyVolume;
      totalSellVolume += level.sellVolume;
    }

    const buySellRatio = totalBuyVolume / (totalBuyVolume + totalSellVolume);
    const deltaNeutral = cumulativeDelta[Math.floor(cumulativeDelta.length / 2)];
    const deltaExtreme = Math.max(...cumulativeDelta.map(Math.abs));

    // Find delta reversals
    const deltaReversals = this.findDeltaReversals(data, cumulativeDelta);

    return {
      cumulativeDelta,
      deltaAtPrice,
      buySellRatio,
      deltaNeutral,
      deltaExtreme,
      deltaReversal: deltaReversals
    };
  }

  /**
   * Analyzes overall market structure
   */
  private analyzeMarketStructure(
    priceLevels: VolumeLevel[],
    deltaProfile: DeltaProfile
  ): MarketStructure {
    const { buySellRatio } = deltaProfile;
    const deltaNeutral = deltaProfile.deltaNeutral;

    let structure: MarketStructure['structure'];
    let strength = 0;
    let trend: MarketStructure['trend'];

    if (Math.abs(buySellRatio - 0.5) < 0.05) {
      structure = 'BALANCED';
      strength = 80 + Math.abs(deltaNeutral) * 0.2;
      trend = 'SIDEWAYS';
    } else if (buySellRatio > 0.55) {
      structure = 'IMBALANCED_BUY';
      strength = Math.min(100, 50 + (buySellRatio - 0.5) * 200);
      trend = 'UP';
    } else if (buySellRatio < 0.45) {
      structure = 'IMBALANCED_SELL';
      strength = Math.min(100, 50 + (0.5 - buySellRatio) * 200);
      trend = 'DOWN';
    } else if (deltaNeutral > 0) {
      structure = 'ACCUMULATING';
      strength = Math.min(100, deltaNeutral * 2);
      trend = 'UP';
    } else {
      structure = 'DISTRIBUTING';
      strength = Math.min(100, Math.abs(deltaNeutral) * 2);
      trend = 'DOWN';
    }

    return {
      structure,
      strength,
      trend,
      rotation: [] // Will be populated with more complex analysis
    };
  }

  /**
   * Identifies support and resistance levels
   */
  private identifySupportResistance(
    priceLevels: VolumeLevel[],
    data: MarketData[],
    poc: VolumeLevel,
    valueArea: ValueArea
  ): SupportResistance[] {
    const supportResistance: SupportResistance[] = [];

    // Add POC as strongest level
    supportResistance.push({
      level: poc.price,
      type: 'POC',
      strength: 100,
      touches: [0],
      volumeAtLevel: poc.totalVolume,
      riskReward: 0,
      confluence: 100
    });

    // Add Value Area edges
    supportResistance.push({
      level: valueArea.high,
      type: 'RESISTANCE',
      strength: 70,
      touches: [],
      volumeAtLevel: priceLevels
        .filter(l => l.price === valueArea.high)
        .reduce((sum, l) => sum + l.totalVolume, 0),
      riskReward: 2.0,
      confluence: 60
    });

    supportResistance.push({
      level: valueArea.low,
      type: 'SUPPORT',
      strength: 70,
      touches: [],
      volumeAtLevel: priceLevels
        .filter(l => l.price === valueArea.low)
        .reduce((sum, l) => sum + l.totalVolume, 0),
      riskReward: 2.0,
      confluence: 60
    });

    // Find significant volume levels
    const avgVolume = priceLevels.reduce((sum, l) => sum + l.totalVolume, 0) / priceLevels.length;
    const volumeThreshold = avgVolume * 1.5;

    priceLevels.forEach(level => {
      if (level.totalVolume > volumeThreshold) {
        const isSupport = level.buyVolume > level.sellVolume * 1.2;
        const isResistance = level.sellVolume > level.buyVolume * 1.2;

        if (isSupport || isResistance) {
          supportResistance.push({
            level: level.price,
            type: isSupport ? 'SUPPORT' : 'RESISTANCE',
            strength: Math.min(90, (level.totalVolume / avgVolume - 1) * 50),
            touches: this.findTouches(data, level.price),
            volumeAtLevel: level.totalVolume,
            riskReward: this.calculateRiskReward(data, level.price, isSupport),
            confluence: this.calculateConfluence(level, poc, valueArea)
          });
        }
      }
    });

    return supportResistance.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Finds delta reversals in the market
   */
  private findDeltaReversals(data: MarketData[], cumulativeDelta: number[]): DeltaReversal[] {
    const reversals: DeltaReversal[] = [];
    const threshold = Math.max(...cumulativeDelta.map(Math.abs)) * 0.1;

    for (let i = 1; i < cumulativeDelta.length - 1; i++) {
      const current = cumulativeDelta[i];
      const previous = cumulativeDelta[i - 1];
      const next = cumulativeDelta[i + 1];

      // Check for reversal
      if (Math.sign(current) !== Math.sign(next) && Math.abs(current) > threshold) {
        const candle = data[i];
        const strength = Math.abs(current) / threshold;

        reversals.push({
          price: candle.close,
          timestamp: new Date(candle.timestamp),
          deltaBefore: previous,
          deltaAfter: next,
          strength: Math.min(100, strength * 50),
          type: current > 0 ? 'BEARISH' : 'BULLISH'
        });
      }
    }

    return reversals;
  }

  /**
   * Finds touches of price at specific levels
   */
  private findTouches(data: MarketData[], level: number, tolerance: number = 0.001): number[] {
    const touches: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const high = candle.high;
      const low = candle.low;
      const close = candle.close;

      // Check if price level was touched
      if (Math.abs(high - level) < tolerance ||
          Math.abs(low - level) < tolerance ||
          Math.abs(close - level) < tolerance) {
        touches.push(i);
      }
    }

    return touches;
  }

  /**
   * Calculates risk/reward ratio for support/resistance levels
   */
  private calculateRiskReward(
    data: MarketData[],
    level: number,
    isSupport: boolean
  ): number {
    const recentData = data.slice(-50);
    const atr = this.calculateATR(recentData);

    // Simple risk/reward based on ATR
    const risk = atr * 2;
    const reward = atr * 3;

    return isSupport ? reward / risk : risk / reward;
  }

  /**
   * Calculates confluence score for support/resistance levels
   */
  private calculateConfluence(
    level: VolumeLevel,
    poc: VolumeLevel,
    valueArea: ValueArea
  ): number {
    let confluence = 0;

    // Volume confluence
    if (level.totalVolume > poc.totalVolume * 0.8) confluence += 30;

    // Delta confluence
    if (Math.abs(level.delta) > level.totalVolume * 0.1) confluence += 25;

    // Value area confluence
    const isNearValueArea = Math.abs(level.price - valueArea.low) < (valueArea.range * 0.1) ||
                           Math.abs(level.price - valueArea.high) < (valueArea.range * 0.1);
    if (isNearValueArea) confluence += 20;

    // Buy/sell imbalance confluence
    const imbalance = Math.abs(level.buyVolume - level.sellVolume) / (level.buyVolume + level.sellVolume);
    if (imbalance > 0.7) confluence += 15;

    // Touch confluence
    if (level.buyTrades + level.sellTrades > 50) confluence += 10;

    return Math.min(100, confluence);
  }

  /**
   * Creates composite profile from multiple timeframes
   */
  private createCompositeProfile(
    baseProfile: VolumeProfile,
    timeframeProfiles: CompositeTimeframe[]
  ): CompositeProfile {
    // Calculate confluence between timeframes
    timeframeProfiles.forEach(profile => {
      const basePoc = baseProfile.pointOfControl;
      const timeframePoc = profile.profile.pointOfControl;
      const pocDifference = Math.abs(basePoc - timeframePoc) / basePoc;

      profile.confluence = Math.max(0, 100 - pocDifference * 100);
    });

    // Create VWAP profiles
    const vwapProfile = this.createVwapProfile(baseProfile, timeframeProfiles);

    // Analyze developing value
    const developingValue = this.analyzeDevelopingValue(baseProfile);

    // Detect volume anomalies
    const anomalies = this.detectVolumeAnomalies(baseProfile.priceLevels);

    // Analyze liquidity
    const liquidity = this.analyzeLiquidity(baseProfile);

    return {
      multiTimeframe: timeframeProfiles,
      vwapProfile,
      developingValue,
      anomaly: anomalies,
      liquidity
    };
  }

  /**
   * Creates VWAP profile analysis
   */
  private createVwapProfile(
    baseProfile: VolumeProfile,
    timeframeProfiles: CompositeTimeframe[]
  ): VwapProfile {
    const anchored = this.createAnchoredVWAP(baseProfile.priceLevels);
    const volumeWeighted = timeframeProfiles.map(p => p.profile.volumeWeightedAverage);

    // Calculate VWAP bands
    const deviations = baseProfile.priceLevels.map(level =>
      level.price - baseProfile.volumeWeightedAverage
    );
    const stdDev = this.calculateStandardDeviation(deviations);

    const bands = this.createVWAPBands(
      baseProfile.volumeWeightedAverage,
      stdDev,
      timeframeProfiles.map(p => p.profile.volumeWeightedAverage)
    );

    return {
      standard: baseProfile.volumeWeightedAverage,
      anchored,
      volumeWeighted,
      deviation: deviations,
      bands
    };
  }

  /**
   * Creates anchored VWAP calculations
   */
  private createAnchoredVWAP(priceLevels: VolumeLevel[]): number[] {
    const anchoredVwaps: number[] = [];

    // Anchor at different significant points
    const significantPoints = priceLevels
      .filter(level => level.totalVolume >
        priceLevels.reduce((sum, l) => sum + l.totalVolume, 0) / priceLevels.length * 1.5
      )
      .slice(0, 10);

    for (let i = 1; i < significantPoints.length; i++) {
      const anchorPrice = significantPoints[i - 1].price;
      const targetPrice = significantPoints[i].price;

      // Calculate cumulative VWAP from anchor to target
      let cumulativeVolume = 0;
      let cumulativeVolumePrice = 0;

      for (const level of priceLevels) {
        if (level.price >= Math.min(anchorPrice, targetPrice) &&
            level.price <= Math.max(anchorPrice, targetPrice)) {
          cumulativeVolume += level.totalVolume;
          cumulativeVolumePrice += level.price * level.totalVolume;
        }
      }

      const anchoredVwap = cumulativeVolumePrice / cumulativeVolume;
      anchoredVwaps.push(anchoredVwap);
    }

    return anchoredVwaps;
  }

  /**
   * Creates VWAP bands for different timeframes
   */
  private createVWAPBands(
    baseVwap: number,
    standardDeviation: number,
    timeframeVwaps: number[]
  ): VwapBand[] {
    const bands: VwapBand[] = [];

    // Base VWAP bands
    bands.push({
      upper: baseVwap + standardDeviation,
      lower: baseVwap - standardDeviation,
      standardDeviation,
      strength: 80
    });

    // Multi-timeframe VWAP bands
    timeframeVwaps.forEach(vwap => {
      const deviation = Math.abs(vwap - baseVwap);
      bands.push({
        upper: Math.max(vwap, baseVwap + deviation),
        lower: Math.min(vwap, baseVwap - deviation),
        standardDeviation,
        strength: 60
      });
    });

    return bands.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Analyzes developing value in real-time
   */
  private analyzeDevelopingValue(profile: VolumeProfile): DevelopingValue {
    const recentLevels = profile.priceLevels.slice(-50);
    const currentPrice = recentLevels[recentLevels.length - 1].price;
    const valueArea = profile.valueArea;

    // Calculate developing POC
    const developingPoc = recentLevels.reduce((max, level) =>
      level.totalVolume > max.totalVolume ? level : max
    ).price;

    // Calculate developing VWAP
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;

    for (const level of recentLevels) {
      cumulativeVolume += level.totalVolume;
      cumulativeVolumePrice += level.price * level.totalVolume;
    }

    const developingVwap = cumulativeVolumePrice / cumulativeVolume;

    // Calculate buy/sell imbalance
    const totalBuyVolume = recentLevels.reduce((sum, level) => sum + level.buyVolume, 0);
    const totalSellVolume = recentLevels.reduce((sum, level) => sum + level.sellVolume, 0);
    const buySellImbalance = Math.abs(totalBuyVolume - totalSellVolume) / (totalBuyVolume + totalSellVolume);

    // Identify absorption level
    const absorptionLevel = this.identifyAbsorptionLevel(recentLevels);

    return {
      valueArea,
      developingPoc,
      developingVwap,
      buySellImbalance,
      absorptionLevel
    };
  }

  /**
   * Detects volume anomalies and unusual market activity
   */
  private detectVolumeAnomalies(priceLevels: VolumeLevel[]): VolumeAnomaly[] {
    const anomalies: VolumeAnomaly[] = [];
    const volumes = priceLevels.map(level => level.totalVolume);

    // Calculate average and standard deviation
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);

    for (let i = 10; i < priceLevels.length; i++) {
      const level = priceLevels[i];
      const expectedVolume = avgVolume;
      const actualVolume = level.totalVolume;
      const deviation = Math.abs(actualVolume - expectedVolume) / stdDev;

      // Detect different types of anomalies
      if (deviation > this.anomalyThreshold) {
        if (actualVolume > expectedVolume) {
          anomalies.push({
            timestamp: new Date(),
            type: 'VOLUME_SPIKE',
            severity: Math.min(100, deviation * 25),
            expectedVolume,
            actualVolume,
            explanation: 'Unusually high volume detected'
          });
        } else {
          anomalies.push({
            timestamp: new Date(),
            type: 'VOLUME_DRY',
            severity: Math.min(100, deviation * 25),
            expectedVolume,
            actualVolume,
            explanation: 'Unusually low volume detected'
          });
        }
      }

      // Detect absorption (high volume, small price movement)
      if (i > 0) {
        const priceChange = Math.abs(level.price - priceLevels[i - 1].price);
        const relativeVolume = actualVolume / avgVolume;

        if (relativeVolume > 2 && priceChange < expectedVolume * 0.01) {
          anomalies.push({
            timestamp: new Date(),
            type: 'ABSORPTION',
            severity: Math.min(100, (relativeVolume - 2) * 50),
            expectedVolume,
            actualVolume,
            explanation: 'High volume with minimal price movement suggests absorption'
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Analyzes liquidity distribution in the market
   */
  private analyzeLiquidity(profile: VolumeProfile): LiquidityAnalysis {
    const totalBuyVolume = profile.priceLevels.reduce((sum, level) => sum + level.buyVolume, 0);
    const totalSellVolume = profile.priceLevels.reduce((sum, level) => sum + level.sellVolume, 0);
    const totalLiquidity = totalBuyVolume + totalSellVolume;
    const liquidityRatio = totalBuyVolume / totalLiquidity;

    // Calculate efficient vs trapped liquidity
    const efficientLiquidity = this.calculateEfficientLiquidity(profile.priceLevels);
    const trappedLiquidity = this.calculateTrappedLiquidity(profile.priceLevels);

    // Identify liquidity zones
    const liquidityZones = this.identifyLiquidityZones(profile.priceLevels);

    return {
      buyLiquidity: totalBuyVolume,
      sellLiquidity: totalSellVolume,
      totalLiquidity,
      liquidityRatio,
      efficientLiquidity,
      trappedLiquidity,
      liquidityZones
    };
  }

  /**
   * Calculates efficient liquidity (followed by price movement)
   */
  private calculateEfficientLiquidity(priceLevels: VolumeLevel[]): number {
    let efficientVolume = 0;
    let totalVolume = 0;

    for (let i = 1; i < priceLevels.length; i++) {
      const currentLevel = priceLevels[i];
      const previousLevel = priceLevels[i - 1];

      totalVolume += currentLevel.totalVolume;

      // Check if liquidity was "efficient" (price moved away from level)
      const priceMovedAway = Math.abs(currentLevel.price - previousLevel.price) > 0;
      if (priceMovedAway) {
        efficientVolume += currentLevel.totalVolume;
      }
    }

    return totalVolume > 0 ? (efficientVolume / totalVolume) * 100 : 0;
  }

  /**
   * Calculates trapped liquidity (liquidity against price movement)
   */
  private calculateTrappedLiquidity(priceLevels: VolumeLevel[]): number {
    let trappedVolume = 0;
    let totalVolume = 0;

    for (let i = 1; i < priceLevels.length; i++) {
      const currentLevel = priceLevels[i];
      const previousLevel = priceLevels[i - 1];

      totalVolume += currentLevel.totalVolume;

      // Check if liquidity was "trapped" (price returned to level)
      const priceReturned = Math.abs(currentLevel.price - previousLevel.price) < 0.001;
      if (priceReturned) {
        trappedVolume += currentLevel.totalVolume;
      }
    }

    return totalVolume > 0 ? (trappedVolume / totalVolume) * 100 : 0;
  }

  /**
   * Identifies significant liquidity zones
   */
  private identifyLiquidityZones(priceLevels: VolumeLevel[]): LiquidityZone[] {
    const zones: LiquidityZone[] = [];
    const avgVolume = priceLevels.reduce((sum, level) => sum + level.totalVolume, 0) / priceLevels.length;
    const highVolumeThreshold = avgVolume * 2;

    // Group high-volume price levels
    const highVolumeLevels = priceLevels.filter(level =>
      level.totalVolume > highVolumeThreshold
    );

    // Create liquidity zones from clusters
    const clustered = this.clusterPriceLevels(highVolumeLevels);

    clustered.forEach(cluster => {
      if (cluster.length >= 2) {
        const high = Math.max(...cluster.map(level => level.price));
        const low = Math.min(...cluster.map(level => level.price));
        const volume = cluster.reduce((sum, level) => sum + level.totalVolume, 0);

        // Determine liquidity type based on delta
        const totalDelta = cluster.reduce((sum, level) => sum + level.delta, 0);
        const type = totalDelta > 0 ? 'BUY' : totalDelta < 0 ? 'SELL' : 'NEUTRAL';

        zones.push({
          price: (high + low) / 2,
          range: { high, low },
          volume,
          efficiency: volume / cluster.length,
          type
        });
      }
    });

    return zones;
  }

  /**
   * Clusters nearby price levels together
   */
  private clusterPriceLevels(levels: VolumeLevel[], maxDistance: number = 0.002): VolumeLevel[][] {
    const clusters: VolumeLevel[][] = [];
    const used = new Set<VolumeLevel>();

    for (const level of levels) {
      if (used.has(level)) continue;

      const cluster = [level];
      used.add(level);

      // Find nearby levels
      for (const otherLevel of levels) {
        if (used.has(otherLevel)) continue;

        const distance = Math.abs(level.price - otherLevel.price);
        if (distance <= maxDistance) {
          cluster.push(otherLevel);
          used.add(otherLevel);
        }
      }

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Helper methods
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getTimeframeWeight(timeframe: string): number {
    const weights: { [key: string]: number } = {
      '1m': 1,
      '5m': 2,
      '15m': 3,
      '30m': 4,
      '1h': 5,
      '4h': 6,
      '1d': 7
    };
    return weights[timeframe] || 5;
  }

  private resampleData(data: MarketData[], timeframe: string): MarketData[] {
    const resamplingMap: { [key: string]: number } = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };

    const multiplier = resamplingMap[timeframe] || 60;

    if (multiplier <= 1) return data;

    const resampled: MarketData[] = [];
    for (let i = 0; i < data.length; i += multiplier) {
      let ohlc = {
        symbol: data[i].symbol,
        open: data[i].open,
        high: Math.max(...data.slice(i, i + multiplier).map(d => d.high)),
        low: Math.min(...data.slice(i, i + multiplier).map(d => d.low)),
        close: data[i + multiplier - 1].close,
        volume: data.slice(i, i + multiplier).reduce((sum, d) => sum + d.volume, 0),
        timestamp: data[i + multiplier - 1].timestamp
      };

      resampled.push(ohlc);
    }

    return resampled;
  }

  private calculateATR(data: MarketData[], period: number = 14): number {
    let trueRangeSum = 0;

    for (let i = period; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const trueRange = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRangeSum += trueRange;
    }

    return trueRangeSum / (data.length - period);
  }

  private calculateVWAPFromLevels(priceLevels: VolumeLevel[]): number {
    const totalVol = priceLevels.reduce((sum, lvl) => sum + lvl.totalVolume, 0);
    if (totalVol === 0) return 0;
    const volPrice = priceLevels.reduce((sum, lvl) => sum + lvl.totalVolume * lvl.price, 0);
    return volPrice / totalVol;
  }

  private createSupportResistance(level: VolumeLevel): SupportResistance {
    return {
      level: level.price,
      type: level.delta > 0 ? 'RESISTANCE' : 'SUPPORT',
      strength: Math.min(50, Math.abs(level.delta) / 1000),
      touches: [0],
      volumeAtLevel: level.totalVolume,
      riskReward: level.delta > 0 ? 2 : 0.5,
      confluence: 25
    };
  }

  private identifyAbsorptionLevel(levels: VolumeLevel[]): number {
    // Find level with highest volume and minimal price movement
    let absorptionLevel = levels[0].price;
    let maxVolumeRatio = levels[0].totalVolume;

    for (let i = 1; i < Math.min(levels.length, 50); i++) {
      const currentLevel = levels[i];
      const previousLevel = levels[i - 1];

      const priceChange = Math.abs(currentLevel.price - previousLevel.price);
      const volumeRatio = currentLevel.totalVolume / maxVolumeRatio;

      // High volume with low price change suggests absorption
      if (volumeRatio > 1.2 && priceChange < previousLevel.price * 0.002) {
        absorptionLevel = currentLevel.price;
        maxVolumeRatio = currentLevel.totalVolume;
      }
    }

    return absorptionLevel;
  }
}