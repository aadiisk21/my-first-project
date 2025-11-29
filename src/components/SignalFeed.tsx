"use client";

import React, { useState, useEffect } from "react";
import { TradingSignal } from "@/types";
import { useTradingStore } from "@/stores/useTradingStore";
import { SignalCard } from "./SignalCard";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface SignalFeedProps {
  limit?: number;
  showExpired?: boolean;
  filter?: {
    signalType?: 'BUY' | 'SELL' | 'HOLD';
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    minConfidence?: number;
    pair?: string;
  };
  className?: string;
}

export function SignalFeed({
  limit = 10,
  showExpired = true,
  filter = {},
  className = ""
}: SignalFeedProps) {
  const {
    signals,
    activeSignals,
    addSignal,
    removeSignal,
    isLoading
  } = useTradingStore();

  const [displayedSignals, setDisplayedSignals] = useState<TradingSignal[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilter, setLocalFilter] = useState(filter);

  // Apply filters and get display signals
  useEffect(() => {
    let filteredSignals = [...signals];

    // Apply local filters
    // signalType will be undefined/null when 'All' is selected, otherwise one of 'BUY'|'SELL'|'HOLD'
    if (localFilter.signalType) {
      filteredSignals = filteredSignals.filter(s => s.signalType === localFilter.signalType);
    }

    if (localFilter.riskLevel) {
      filteredSignals = filteredSignals.filter(s => s.riskLevel === localFilter.riskLevel);
    }

    if (localFilter.minConfidence) {
      filteredSignals = filteredSignals.filter(s => s.confidence >= localFilter.minConfidence!);
    }

    const pairQuery = localFilter.pair;
    if (pairQuery && pairQuery.length > 0) {
      const q = pairQuery.toUpperCase();
      filteredSignals = filteredSignals.filter(s => s.pair.includes(q));
    }

    // Filter expired signals if needed
    if (!showExpired) {
      const now = new Date();
      filteredSignals = filteredSignals.filter(s => s.expiresAt > now);
    }

    // Sort by timestamp (newest first) and confidence
    filteredSignals.sort((a, b) => {
      const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
      const confidenceDiff = b.confidence - a.confidence;
      return timeDiff > 0 ? timeDiff : confidenceDiff;
    });

    // Limit results
    const limitedSignals = filteredSignals.slice(0, isExpanded ? filteredSignals.length : limit);
    setDisplayedSignals(limitedSignals);
  }, [signals, showExpired, limit, isExpanded, localFilter]);

  // Handle signal actions
  const handleSignalAction = (signal: TradingSignal, action: 'execute' | 'dismiss' | 'view') => {
    switch (action) {
      case 'execute':
        console.log('Executing signal:', signal);
        // This would integrate with your trading API
        break;
      case 'dismiss':
        removeSignal(signal.id);
        break;
      case 'view':
        console.log('Viewing signal details:', signal);
        // This would navigate to signal details page
        break;
    }
  };

  // Refresh signals
  const handleRefresh = async () => {
    // This would fetch new signals from your API
    console.log('Refreshing signals...');
    // Mock refresh - in real app, this would make API calls
  };

  // Filter controls
  const updateFilter = (key: string, value: any) => {
    setLocalFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Trading Signals
        </h3>

        <div className="flex items-center space-x-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Refresh signals"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Filter signals"
          >
            <FunnelIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Signal Type Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Signal Type
              </label>
              <select
                value={localFilter.signalType || 'ALL'}
                onChange={(e) => updateFilter('signalType', e.target.value === 'ALL' ? undefined : (e.target.value as 'BUY' | 'SELL' | 'HOLD'))}
                className="w-full px-3 py-2 border border-solid border-gray-200 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Types</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
                <option value="HOLD">Hold</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Risk Level
              </label>
              <select
                value={localFilter.riskLevel || 'ALL'}
                onChange={(e) => updateFilter('riskLevel', e.target.value === 'ALL' ? undefined : (e.target.value as 'LOW' | 'MEDIUM' | 'HIGH'))}
                className="w-full px-3 py-2 border border-solid border-gray-200 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Levels</option>
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
              </select>
            </div>

            {/* Minimum Confidence */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Confidence: {localFilter.minConfidence || 0}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localFilter.minConfidence || 0}
                onChange={(e) => updateFilter('minConfidence', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Pair Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Pair
              </label>
              <input
                type="text"
                placeholder="e.g., BTC, ETH"
                value={localFilter.pair || ''}
                onChange={(e) => updateFilter('pair', e.target.value)}
                className="w-full px-3 py-2 border border-solid border-gray-200 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Active filters display */}
          <div className="flex items-center space-x-2 flex-wrap">
            {localFilter.signalType && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Type: {localFilter.signalType}
              </span>
            )}
            {localFilter.riskLevel && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Risk: {localFilter.riskLevel}
              </span>
            )}
            {localFilter.minConfidence && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Min: {localFilter.minConfidence}%
              </span>
            )}
            {localFilter.pair && (
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Pair: {localFilter.pair}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Signals List */}
      {displayedSignals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {isLoading ? 'Loading signals...' : 'No signals available'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onAction={handleSignalAction}
              compact={false}
            />
          ))}
        </div>
      )}

      {/* Load More / Show Less */}
      {displayedSignals.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                <span>Show More ({Math.max(0, signals.length - displayedSignals.length)} remaining)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}