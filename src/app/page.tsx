'use client';

import React, { useState, useEffect } from 'react';
import { TradingChart } from '@/components/TradingChartEnhanced';
import { MarketOverview } from '@/components/MarketOverview';
import { SignalFeed } from '@/components/SignalFeed';
import { QuickStats } from '@/components/QuickStats';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingStore } from '@/stores/useTradingStore';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [generatedSignal, setGeneratedSignal] = useState(null);
  const [showSignalModal, setShowSignalModal] = useState(false);

  // Select only the pieces of state we need to avoid subscribing to the whole store
  const pairs = useTradingStore((s) => s.pairs);
  const activeSignals = useTradingStore((s) => s.activeSignals);
  const setStoreSelectedPair = useTradingStore((s) => s.setSelectedPair);
  const setStoreSelectedTimeframe = useTradingStore(
    (s) => s.setSelectedTimeframe
  );

  // Fetch market data for the selected pair
  const { data: marketData, isLoading: isLoadingChart } = useMarketData({
    symbol: selectedPair,
    timeframe: selectedTimeframe,
    limit: 100,
  });

  // Fetch pairs and populate the store
  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const response = await fetch('/api/trading/pairs');
        if (!response.ok) throw new Error('Failed to fetch pairs');
        const result = await response.json();
        if (result.success && result.data?.pairs) {
          useTradingStore.getState().setPairs(result.data.pairs);
        }
      } catch (error) {
        console.error('Error fetching pairs:', error);
      }
    };

    if (!pairs || pairs.length === 0) {
      fetchPairs();
    }
  }, [pairs]);

  // Handle pair selection
  useEffect(() => {
    setStoreSelectedPair?.(selectedPair);
  }, [selectedPair, setStoreSelectedPair]);

  // Handle timeframe selection
  useEffect(() => {
    setStoreSelectedTimeframe?.(selectedTimeframe);
  }, [selectedTimeframe, setStoreSelectedTimeframe]);

  return (
    <div className='space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-foreground'>
            Trading Dashboard
          </h1>
          <p className='text-muted-foreground mt-1'>
            Real-time market analysis and AI-powered trading signals
          </p>
        </div>

        <div className='flex items-center space-x-4'>
          <div className='flex items-center space-x-2'>
            <ClockIcon className='h-4 w-4 text-muted-foreground' />
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className='px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
            >
              <option value='1m'>1m</option>
              <option value='5m'>5m</option>
              <option value='15m'>15m</option>
              <option value='30m'>30m</option>
              <option value='1h'>1h</option>
              <option value='4h'>4h</option>
              <option value='1d'>1d</option>
            </select>
          </div>

          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/signals/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    symbols: [selectedPair],
                    timeframes: [selectedTimeframe],
                    riskTolerance: 'MODERATE',
                    minConfidence: 60,
                  }),
                });
                const data = await response.json();
                if (data.success && data.data.signals.length > 0) {
                  setGeneratedSignal(data.data.signals[0]);
                  setShowSignalModal(true);
                } else {
                  alert('No signal generated. Try again later.');
                }
              } catch (error) {
                console.error('Error generating signals:', error);
                alert('Error generating signal.');
              }
            }}
            className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium'
          >
            🤖 Generate Signal
          </button>
      {/* Signal Modal */}
      {showSignalModal && generatedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">AI Signal for {generatedSignal.pair}</h2>
            <div className="mb-2">
              <span className="font-semibold">Type:</span> {generatedSignal.signalType}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Entry:</span> {generatedSignal.entryPrice}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Take Profit:</span> {generatedSignal.takeProfit ?? 'N/A'}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Stop Loss:</span> {generatedSignal.stopLoss ?? 'N/A'}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Confidence:</span> {generatedSignal.confidence}%
            </div>
            <div className="mb-2">
              <span className="font-semibold">Rationale:</span>
              <div className="text-xs whitespace-pre-line mt-1">{generatedSignal.technicalRationale}</div>
            </div>
            <button
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              onClick={() => setShowSignalModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

          <button className='relative p-2 text-muted-foreground hover:text-foreground transition-colors'>
            <BellIcon className='h-5 w-5' />
            {activeSignals && activeSignals.length > 0 && (
              <span className='absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full'></span>
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Trading Chart - Takes 2/3 of space */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Pair Selector */}
          <div className='flex flex-wrap gap-2'>
            {(pairs || []).slice(0, 8).map((pair) => (
              <button
                key={pair.symbol}
                onClick={() => setSelectedPair(pair.symbol)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedPair === pair.symbol
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <div className='flex items-center space-x-2'>
                  <span>{pair.symbol}</span>
                  <div className='flex items-center space-x-1'>
                    {pair.priceChangePercent >= 0 ? (
                      <ArrowTrendingUpIcon className='h-3 w-3 text-green-500' />
                    ) : (
                      <ArrowTrendingDownIcon className='h-3 w-3 text-red-500' />
                    )}
                    <span
                      className={`text-xs ${
                        pair.priceChangePercent >= 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {pair.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Trading Chart */}
          <div className='trading-card'>
            <TradingChart
              symbol={selectedPair}
              timeframe={selectedTimeframe}
              height='500px'
              showVolume={true}
              showIndicators={true}
            />
          </div>
        </div>

        {/* Sidebar - Takes 1/3 of space */}
        <div className='space-y-6'>
          {/* Market Overview */}
          <MarketOverview />

          {/* Active Signals */}
          <div className='trading-card p-4'>
            <h3 className='text-lg font-semibold text-foreground mb-4'>
              Active Signals
            </h3>
            <SignalFeed limit={5} showExpired={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
