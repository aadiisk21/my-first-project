"use client";

import React, { useState, useEffect } from "react";
import { TradingSignal } from "@/types";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ClockIcon,
  ChartBarIcon,
  InformationCircleIcon,
  PlayIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface SignalCardProps {
  signal: TradingSignal;
  onAction?: (signal: TradingSignal, action: 'execute' | 'dismiss' | 'view') => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function SignalCard({
  signal,
  onAction,
  showActions = true,
  compact = false,
  className = ""
}: SignalCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiryTime = signal.expiresAt.getTime();
      const remaining = Math.max(0, expiryTime - now);
      setTimeRemaining(remaining);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [signal.expiresAt]);

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
      // Use a deterministic timezone to avoid SSR/client locale mismatches
      return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    }).format(date);
  };

  // Get signal type styling
  const getSignalTypeStyle = (type: TradingSignal['signalType']) => {
    switch (type) {
      case 'BUY':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          text: 'text-green-700 dark:text-green-400',
          icon: ArrowTrendingUpIcon,
          label: 'BUY'
        };
      case 'SELL':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          text: 'text-red-700 dark:text-red-400',
          icon: ArrowTrendingDownIcon,
          label: 'SELL'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          text: 'text-gray-700 dark:text-gray-400',
          icon: MinusIcon,
          label: 'HOLD'
        };
    }
  };

  // Get risk level styling
  const getRiskLevelStyle = (risk: TradingSignal['riskLevel']) => {
    switch (risk) {
      case 'LOW':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-300',
          label: 'Low Risk'
        };
      case 'HIGH':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-800 dark:text-red-300',
          label: 'High Risk'
        };
      default:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-300',
          label: 'Medium Risk'
        };
    }
  };

  const signalTypeStyle = getSignalTypeStyle(signal.signalType);
  const riskStyle = getRiskLevelStyle(signal.riskLevel);
  const SignalIcon = signalTypeStyle.icon;
  const isExpired = timeRemaining <= 0;

  if (compact) {
    return (
      <div className={`trading-card p-3 ${className} ${isExpired ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${signalTypeStyle.bg}`}>
              <SignalIcon className={`h-4 w-4 ${signalTypeStyle.text}`} />
            </div>
            <div>
              <div className="font-medium text-foreground">
                {signal.pair}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatTimestamp(signal.timestamp)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold text-foreground">
              ${signal.entryPrice.toLocaleString('en-US')}
            </div>
            <div className={`text-sm ${signalTypeStyle.text}`}>
              {signalTypeStyle.label}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded ${riskStyle.bg} ${riskStyle.text}`}>
              {riskStyle.label}
            </span>
            <span className="text-muted-foreground">
              Confidence: {signal.confidence}%
            </span>
          </div>
          {timeRemaining > 0 && (
            <div className="flex items-center text-muted-foreground">
              <ClockIcon className="h-3 w-3 mr-1" />
              {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`trading-card p-4 ${className} ${isExpired ? 'opacity-60' : ''} ${
      signal.signalType === 'BUY' ? 'signal-glow-buy' : 'signal-glow-sell'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${signalTypeStyle.bg}`}>
            <SignalIcon className={`h-5 w-5 ${signalTypeStyle.text}`} />
          </div>
          <div>
            <div className="font-semibold text-lg text-foreground">
              {signal.pair}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <ClockIcon className="h-3 w-3" />
              <span>{formatTimestamp(signal.timestamp)}</span>
              <span>•</span>
              <span>{signal.timeframe}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${riskStyle.bg} ${riskStyle.text}`}>
            {riskStyle.label}
          </div>
          {timeRemaining > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <ClockIcon className="h-3 w-3 mr-1" />
              {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>
      </div>

      {/* Main Signal Info */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
          <div className="font-semibold text-foreground">
            ${signal.entryPrice.toLocaleString('en-US')}
          </div>
        </div>

        {signal.stopLoss && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
            <div className="font-semibold text-red-600">
              ${signal.stopLoss.toLocaleString('en-US')}
            </div>
          </div>
        )}

        {signal.takeProfit && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Take Profit</div>
            <div className="font-semibold text-green-600">
              ${signal.takeProfit.toLocaleString('en-US')}
            </div>
          </div>
        )}
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Confidence</span>
          <span className={`font-medium ${
            signal.confidence >= 80 ? 'text-green-600' :
            signal.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {signal.confidence}%
          </span>
        </div>
        <div className="confidence-bar">
          <div
            className={`confidence-fill ${
              signal.confidence >= 80 ? 'bg-green-500' :
              signal.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChartBarIcon className="h-4 w-4" />
          <span>Technical Analysis</span>
          <InformationCircleIcon className="h-4 w-4" />
        </button>

        {isExpanded && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">RSI:</span>
                <span className="font-medium">{signal.indicators.rsi.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MACD:</span>
                <span className="font-medium">{signal.indicators.macd.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bollinger:</span>
                <span className="font-medium">{signal.indicators.bollinger.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-medium">
                  {signal.indicators.volume > 1000000
                    ? `${(signal.indicators.volume / 1000000).toFixed(1)}M`
                    : `${(signal.indicators.volume / 1000).toFixed(0)}K`
                  }
                </span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
              <span className="font-medium">Rationale:</span> {signal.technicalRationale}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && !isExpired && onAction && (
        <div className="flex space-x-2">
          <button
            onClick={() => onAction(signal, 'execute')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              signal.signalType === 'BUY'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : signal.signalType === 'SELL'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <PlayIcon className="h-4 w-4" />
            <span>Execute</span>
          </button>

          <button
            onClick={() => onAction(signal, 'view')}
            className="px-4 py-2 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            View Details
          </button>

          <button
            onClick={() => onAction(signal, 'dismiss')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {isExpired && (
        <div className="text-center py-2 px-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            Signal expired
          </span>
        </div>
      )}
    </div>
  );
}