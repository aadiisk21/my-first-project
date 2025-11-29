export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  lastUpdate: Date;
}

export interface TradingSignal {
  id: string;
  pair: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
  timeframe: string;
  indicators: {
    rsi: number;
    macd: number;
    bollinger: number;
    volume: number;
  };
  technicalRationale: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  expiresAt: Date;
}

export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  sma: number[];
  ema: number[];
  stochastic: {
    k: number[];
    d: number[];
  };
  volume?: number[];
}

export interface UserPortfolio {
  id: string;
  userId: string;
  totalValue: number;
  assets: PortfolioAsset[];
  lastUpdate: Date;
}

export interface PortfolioAsset {
  symbol: string;
  quantity: number;
  value: number;
  allocationPercent: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface AlertSettings {
  id: string;
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  webhook?: string;
  minConfidence: number;
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  enabledPairs: string[];
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  currency: string;
  language: string;
  defaultTimeframe: string;
  chartSettings: {
    chartType: 'candlestick' | 'line' | 'area';
    volume: boolean;
    indicators: string[];
  };
}

export interface WebSocketMessage {
  type: 'PRICE_UPDATE' | 'NEW_SIGNAL' | 'SIGNAL_UPDATE' | 'ALERT' | 'ERROR';
  data: any;
  timestamp: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}