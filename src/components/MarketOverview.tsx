"use client";

import React, { useState, useEffect } from "react";
import { useTradingStore } from "@/stores/useTradingStore";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface MarketMover {
  symbol: string;
  change: number;
  changePercent: number;
  volume: number;
}

export function MarketOverview() {
  const { pairs } = useTradingStore();
  const [marketSentiment, setMarketSentiment] = useState({
    overall: 'NEUTRAL' as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    score: 0
  });

  // Get top gainers and losers
  const getTopMovers = (limit: number = 5, type: 'gainers' | 'losers' = 'gainers'): MarketMover[] => {
    if (!pairs?.length) return [];

    const sortedPairs = [...pairs].sort((a, b) => {
      if (type === 'gainers') {
        return b.priceChangePercent - a.priceChangePercent;
      } else {
        return a.priceChangePercent - b.priceChangePercent;
      }
    });

    return sortedPairs.slice(0, limit).map(pair => ({
      symbol: pair.symbol,
      change: pair.priceChange,
      changePercent: pair.priceChangePercent,
      volume: pair.volume
    }));
  };

  // Calculate market sentiment
  useEffect(() => {
    if (!pairs?.length) return;

    const avgChange = pairs.reduce((sum, pair) => sum + pair.priceChangePercent, 0) / pairs.length;
    const positiveCount = pairs.filter(pair => pair.priceChangePercent > 0).length;
    const negativeCount = pairs.filter(pair => pair.priceChangePercent < 0).length;
    const ratio = positiveCount / (positiveCount + negativeCount);

    let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let score = 0;

    if (avgChange > 1 && ratio > 0.6) {
      overall = 'BULLISH';
      score = 0.7 + (avgChange / 100) * 0.3;
    } else if (avgChange < -1 && ratio < 0.4) {
      overall = 'BEARISH';
      score = -0.7 - (Math.abs(avgChange) / 100) * 0.3;
    } else {
      overall = 'NEUTRAL';
      score = ratio - 0.5; // Range from -0.5 to 0.5
    }

    setMarketSentiment({ overall, score });
  }, [pairs]);

  const topGainers = getTopMovers(3, 'gainers');
  const topLosers = getTopMovers(3, 'losers');

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'BEARISH':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH':
        return ArrowTrendingUpIcon;
      case 'BEARISH':
        return ArrowTrendingDownIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  return (
    <div className="trading-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Market Overview
        </h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getSentimentColor(marketSentiment.overall)}`}>
          {React.createElement(getSentimentIcon(marketSentiment.overall), { className: "h-4 w-4" })}
          <span className="text-sm font-medium">
            {marketSentiment.overall}
          </span>
        </div>
      </div>

      {/* Market Score */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Market Score</span>
          <span className="font-medium">
            {marketSentiment.score > 0 ? '+' : ''}{(marketSentiment.score * 100).toFixed(1)}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              marketSentiment.score > 0 ? 'bg-green-500' :
              marketSentiment.score < 0 ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{
              width: `${Math.abs(marketSentiment.score) * 100}%`,
              marginLeft: marketSentiment.score < 0 ? 'auto' : '0',
              marginRight: marketSentiment.score > 0 ? 'auto' : '0'
            }}
          />
        </div>
      </div>

      {/* Top Gainers */}
      {topGainers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground flex items-center">
            <FireIcon className="h-4 w-4 text-orange-500 mr-1" />
            Top Gainers
          </h4>
          <div className="mt-2 space-y-2">
            {topGainers.map((mover) => (
              <div key={mover.symbol} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-foreground">{mover.symbol}</span>
                </div>
                <div className="flex items-center space-x-2 text-green-600">
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                  <span className="font-medium">+{mover.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Losers */}
      {topLosers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground flex items-center">
            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
            Top Losers
          </h4>
          <div className="mt-2 space-y-2">
            {topLosers.map((mover) => (
              <div key={mover.symbol} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-foreground">{mover.symbol}</span>
                </div>
                <div className="flex items-center space-x-2 text-red-600">
                  <ArrowTrendingDownIcon className="h-3 w-3" />
                  <span className="font-medium">{mover.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Stats */}
      {pairs && pairs.length > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Pairs</span>
              <span className="block font-medium text-foreground">{pairs.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Positive</span>
              <span className="block font-medium text-green-600">
                {pairs.filter(p => p.priceChangePercent > 0).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Negative</span>
              <span className="block font-medium text-red-600">
                {pairs.filter(p => p.priceChangePercent < 0).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Change</span>
              <span className={`block font-medium ${
                (pairs.reduce((sum, p) => sum + p.priceChangePercent, 0) / pairs.length) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {((pairs.reduce((sum, p) => sum + p.priceChangePercent, 0) / pairs.length)).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}