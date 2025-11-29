"use client";

import React from "react";
import { useTradingStore } from "@/stores/useTradingStore";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

export function QuickStats() {
  const {
    pairs,
    activeSignals,
    signalHistory
  } = useTradingStore();

  // Calculate stats
  const totalPairs = pairs?.length || 0;
  const totalVolume = pairs?.reduce((sum, pair) => sum + pair.volume, 0) || 0;
  const avgChange = pairs?.reduce((sum, pair) => sum + pair.priceChangePercent, 0) / totalPairs || 0;
  const positivePairs = pairs?.filter(pair => pair.priceChangePercent > 0).length || 0;
  const negativePairs = totalPairs - positivePairs;

  const totalSignals = signalHistory?.length || 0;
  const activeSignalCount = activeSignals?.length || 0;

  const stats = [
    {
      name: "Active Pairs",
      value: totalPairs.toLocaleString('en-US'),
      change: null,
      icon: ChartBarIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      name: "Market Change",
      value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
      change: avgChange,
      icon: avgChange >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
      color: avgChange >= 0 ? "text-green-600" : "text-red-600",
      bgColor: avgChange >= 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
    },
    {
      name: "Total Volume",
      value: totalVolume > 1000000000
        ? `$${(totalVolume / 1000000000).toFixed(1)}B`
        : totalVolume > 1000000
          ? `$${(totalVolume / 1000000).toFixed(1)}M`
          : `$${(totalVolume / 1000).toFixed(1)}K`,
      change: null,
      icon: CurrencyDollarIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20"
    },
    {
      name: "Active Signals",
      value: activeSignalCount.toString(),
      change: activeSignalCount > 0 ? activeSignalCount : null,
      icon: ClockIcon,
      color: activeSignalCount > 0 ? "text-orange-600" : "text-gray-600",
      bgColor: activeSignalCount > 0 ? "bg-orange-100 dark:bg-orange-900/20" : "bg-gray-100 dark:bg-gray-900/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.name} className="trading-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {stat.value}
                </p>
                {stat.change !== null && (
                  <div className="flex items-center mt-1">
                    <Icon className={`h-4 w-4 ${stat.color} mr-1`} />
                    <span className={`text-sm font-medium ${stat.color}`}>
                      {stat.change > 0 ? '+' : ''}{stat.change?.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>

            {/* Additional context for specific stats */}
            {stat.name === "Market Change" && totalPairs > 0 && (
              <div className="mt-4 pt-4 border-t border-solid border-gray-200">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Up: {positivePairs}</span>
                  <span className="text-muted-foreground">Down: {negativePairs}</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(positivePairs / totalPairs) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {stat.name === "Active Signals" && totalSignals > 0 && (
              <div className="mt-4 pt-4 border-t border-solid border-gray-200">
                <p className="text-xs text-muted-foreground">
                  Total Generated: {totalSignals}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}