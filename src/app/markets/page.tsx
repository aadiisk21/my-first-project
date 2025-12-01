'use client';

import React, { useState, useEffect } from 'react';
import { MarketOverview } from '@/components/MarketOverview';
import { TradingChart } from '@/components/TradingChart';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTradingStore } from '@/stores/useTradingStore';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function MarketsPage() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [isLoading, setIsLoading] = useState(true);
  const setPairs = useTradingStore((s) => s.setPairs);

  useEffect(() => {
    let mounted = true;

    async function loadPairs() {
      try {
        // Prefer same-origin Next API route; fallback to external backend if needed
        const res = await fetch(`/api/trading/pairs`);
        const json = await res.json();
        if (mounted && json?.success && Array.isArray(json.data?.pairs)) {
          setPairs(json.data.pairs);
        } else {
          // Try external backend as fallback
          const res2 = await fetch(`${BACKEND}/api/trading/pairs?category=crypto&limit=20`);
          const json2 = await res2.json();
          if (mounted && json2?.success && Array.isArray(json2.data?.pairs)) {
            setPairs(json2.data.pairs);
          }
        }
      } catch (err) {
        // ignore network errors for now
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadPairs();

    return () => {
      mounted = false;
    };
  }, [setPairs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Markets</h1>
          <p className="text-muted-foreground mt-1">Real-time market data and analysis</p>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid gap-6 lg:grid-cols-4">
        <MarketOverview />
      </div>

      {/* Chart Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Price Chart</h2>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="30m">30m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </div>
        <div className="trading-card p-4">
          <TradingChart symbol={selectedPair} timeframe={timeframe} />
        </div>
      </div>

      {/* Market Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="trading-card p-4">
          <div className="text-sm text-muted-foreground">24h Volume</div>
          <div className="text-2xl font-bold text-foreground mt-2">$45.2B</div>
          <div className="flex items-center mt-2 text-green-600">
            <ChevronUpIcon className="h-4 w-4" />
            <span className="text-sm">+5.2%</span>
          </div>
        </div>
        <div className="trading-card p-4">
          <div className="text-sm text-muted-foreground">Market Cap</div>
          <div className="text-2xl font-bold text-foreground mt-2">$1.2T</div>
          <div className="flex items-center mt-2 text-green-600">
            <ChevronUpIcon className="h-4 w-4" />
            <span className="text-sm">+3.1%</span>
          </div>
        </div>
        <div className="trading-card p-4">
          <div className="text-sm text-muted-foreground">BTC Dominance</div>
          <div className="text-2xl font-bold text-foreground mt-2">45.2%</div>
          <div className="flex items-center mt-2 text-green-600">
            <ChevronDownIcon className="h-4 w-4" />
            <span className="text-sm">-0.5%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
