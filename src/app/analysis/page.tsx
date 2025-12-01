'use client';

import React, { useState, useEffect } from 'react';
import { TradingChart } from '@/components/TradingChart';

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  stochastic: { k: number; d: number };
}

export default function AnalysisPage() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading indicators
    const timer = setTimeout(() => {
      setIndicators({
        rsi: 62.5,
        macd: { value: 245.6, signal: 238.2, histogram: 7.4 },
        bollingerBands: { upper: 52300, middle: 50800, lower: 49300 },
        sma20: 50900,
        sma50: 49800,
        ema12: 51200,
        ema26: 50600,
        stochastic: { k: 68.5, d: 65.2 },
      });
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-foreground'>
            Technical Analysis
          </h1>
          <p className='text-muted-foreground mt-1'>
            Advanced market indicators and signals
          </p>
        </div>
        <select
          value={selectedPair}
          onChange={(e) => setSelectedPair(e.target.value)}
          className='px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
        >
          <option value='BTCUSDT'>BTC/USDT</option>
          <option value='ETHUSDT'>ETH/USDT</option>
          <option value='BNBUSDT'>BNB/USDT</option>
          <option value='XRPUSDT'>XRP/USDT</option>
        </select>
      </div>

      {/* Chart Section */}
      <div className='trading-card p-4'>
        <TradingChart symbol={selectedPair} timeframe='1h' />
      </div>

      {/* Technical Indicators */}
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold text-foreground'>
          Technical Indicators
        </h2>

        {/* Momentum Indicators */}
        <div className='grid gap-4 md:grid-cols-3'>
          <div className='trading-card p-4'>
            <div className='text-sm text-muted-foreground uppercase tracking-wide'>
              RSI (14)
            </div>
            <div className='text-3xl font-bold text-foreground mt-2'>
              {indicators?.rsi.toFixed(1)}
            </div>
            <div className='mt-3 h-2 bg-secondary rounded-full overflow-hidden'>
              <div
                className='h-full bg-primary transition-all'
                style={{ width: `${((indicators?.rsi || 0) / 100) * 100}%` }}
              ></div>
            </div>
            <div className='text-xs text-muted-foreground mt-2'>
              {(indicators?.rsi || 0) > 70
                ? 'Overbought'
                : (indicators?.rsi || 0) < 30
                ? 'Oversold'
                : 'Neutral'}
            </div>
          </div>

          <div className='trading-card p-4'>
            <div className='text-sm text-muted-foreground uppercase tracking-wide'>
              MACD
            </div>
            <div className='text-3xl font-bold text-foreground mt-2'>
              {indicators?.macd.value.toFixed(1)}
            </div>
            <div className='text-xs text-muted-foreground mt-2 space-y-1'>
              <div>Signal: {indicators?.macd.signal.toFixed(1)}</div>
              <div>Histogram: {indicators?.macd.histogram.toFixed(1)}</div>
            </div>
          </div>

          <div className='trading-card p-4'>
            <div className='text-sm text-muted-foreground uppercase tracking-wide'>
              Stochastic
            </div>
            <div className='text-3xl font-bold text-foreground mt-2'>
              {indicators?.stochastic.k.toFixed(1)}%
            </div>
            <div className='text-xs text-muted-foreground mt-2'>
              <div>K: {indicators?.stochastic.k.toFixed(1)}</div>
              <div>D: {indicators?.stochastic.d.toFixed(1)}</div>
            </div>
          </div>
        </div>

        {/* Moving Averages */}
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='trading-card p-4'>
            <div className='text-sm text-muted-foreground uppercase tracking-wide mb-4'>
              Simple Moving Averages
            </div>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-muted-foreground'>SMA 20</span>
                <span className='font-semibold text-foreground'>
                  ${indicators?.sma20.toFixed(2)}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-muted-foreground'>SMA 50</span>
                <span className='font-semibold text-foreground'>
                  ${indicators?.sma50.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className='trading-card p-4'>
            <div className='text-sm text-muted-foreground uppercase tracking-wide mb-4'>
              Exponential Moving Averages
            </div>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-muted-foreground'>EMA 12</span>
                <span className='font-semibold text-foreground'>
                  ${indicators?.ema12.toFixed(2)}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-muted-foreground'>EMA 26</span>
                <span className='font-semibold text-foreground'>
                  ${indicators?.ema26.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className='trading-card p-4'>
          <div className='text-sm text-muted-foreground uppercase tracking-wide mb-4'>
            Bollinger Bands (20, 2)
          </div>
          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Upper Band</span>
              <span className='font-semibold text-foreground'>
                ${indicators?.bollingerBands.upper.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>
                Middle Band (SMA)
              </span>
              <span className='font-semibold text-foreground'>
                ${indicators?.bollingerBands.middle.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Lower Band</span>
              <span className='font-semibold text-foreground'>
                ${indicators?.bollingerBands.lower.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
