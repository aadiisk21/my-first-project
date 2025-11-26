import { create } from 'zustand';
import { TradingPair, TradingSignal, MarketData, TechnicalIndicators } from '@/types';

interface TradingStore {
  // Market data
  selectedPair: string;
  pairs: TradingPair[];
  marketData: Record<string, MarketData[]>;
  technicalIndicators: Record<string, TechnicalIndicators>;
  currentPrices: Record<string, number>;

  // Signals
  signals: TradingSignal[];
  activeSignals: TradingSignal[];
  signalHistory: TradingSignal[];

  // UI State
  selectedTimeframe: string;
  isLoading: boolean;
  isConnected: boolean;

  // Actions
  setSelectedPair: (pair: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setPairs: (pairs: TradingPair[]) => void;
  updatePairPrice: (pair: string, price: number, change: number, changePercent: number) => void;
  setMarketData: (pair: string, data: MarketData[]) => void;
  setTechnicalIndicators: (pair: string, indicators: TechnicalIndicators) => void;
  addSignal: (signal: TradingSignal) => void;
  updateSignal: (id: string, updates: Partial<TradingSignal>) => void;
  removeSignal: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  clearData: () => void;
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Initial state
  selectedPair: 'BTC/USDT',
  pairs: [],
  marketData: {},
  technicalIndicators: {},
  currentPrices: {},
  signals: [],
  activeSignals: [],
  signalHistory: [],
  selectedTimeframe: '1h',
  isLoading: false,
  isConnected: false,

  // Actions
  setSelectedPair: (pair: string) => {
    set({ selectedPair: pair });
  },

  setSelectedTimeframe: (timeframe: string) => {
    set({ selectedTimeframe: timeframe });
  },

  setPairs: (pairs: TradingPair[]) => {
    const currentPrices = pairs.reduce((acc, pair) => ({
      ...acc,
      [pair.symbol]: pair.currentPrice
    }), {});
    set({ pairs, currentPrices });
  },

  updatePairPrice: (pair: string, price: number, change: number, changePercent: number) => {
    set((state) => {
      const updatedPairs = state.pairs.map(p =>
        p.symbol === pair
          ? { ...p, currentPrice: price, priceChange: change, priceChangePercent: changePercent, lastUpdate: new Date() }
          : p
      );
      return {
        pairs: updatedPairs,
        currentPrices: { ...state.currentPrices, [pair]: price }
      };
    });
  },

  setMarketData: (pair: string, data: MarketData[]) => {
    set((state) => ({
      marketData: { ...state.marketData, [pair]: data }
    }));
  },

  setTechnicalIndicators: (pair: string, indicators: TechnicalIndicators) => {
    set((state) => ({
      technicalIndicators: { ...state.technicalIndicators, [pair]: indicators }
    }));
  },

  addSignal: (signal: TradingSignal) => {
    set((state) => {
      const newSignals = [signal, ...state.signals].slice(0, 100); // Keep last 100 signals
      const newActiveSignals = signal.expiresAt > new Date()
        ? [signal, ...state.activeSignals.filter(s => s.id !== signal.id)]
        : state.activeSignals.filter(s => s.id !== signal.id);

      return {
        signals: newSignals,
        activeSignals: newActiveSignals,
        signalHistory: [signal, ...state.signalHistory].slice(0, 500) // Keep last 500 in history
      };
    });
  },

  updateSignal: (id: string, updates: Partial<TradingSignal>) => {
    set((state) => ({
      signals: state.signals.map(s => s.id === id ? { ...s, ...updates } : s),
      activeSignals: state.activeSignals.map(s => s.id === id ? { ...s, ...updates } : s),
      signalHistory: state.signalHistory.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  },

  removeSignal: (id: string) => {
    set((state) => ({
      signals: state.signals.filter(s => s.id !== id),
      activeSignals: state.activeSignals.filter(s => s.id !== id),
      signalHistory: state.signalHistory.filter(s => s.id !== id)
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  clearData: () => {
    set({
      marketData: {},
      technicalIndicators: {},
      signals: [],
      activeSignals: [],
      signalHistory: [],
      currentPrices: {}
    });
  }
}));