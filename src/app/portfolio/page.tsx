'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface PortfolioAsset {
  symbol: string;
  amount: number;
  currentPrice: number;
  value: number;
  change24h: number;
  changePercent24h: number;
  entryPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export default function PortfolioPage() {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);

  useEffect(() => {
    // Try fetching portfolio from same-origin Next API; fall back to mock data if unavailable
    let mounted = true;

    async function loadPortfolio() {
      try {
        const res = await fetch(`/api/users/portfolio`);
        const json = await res.json();
        if (mounted && json?.success && Array.isArray(json.data?.assets)) {
          const assetsFromApi: PortfolioAsset[] = json.data.assets;
          setAssets(assetsFromApi);
          const total = assetsFromApi.reduce(
            (sum, asset) => sum + asset.value,
            0
          );
          const pnl = assetsFromApi.reduce(
            (sum, asset) => sum + asset.unrealizedPnL,
            0
          );
          setTotalValue(total);
          setTotalPnL(pnl);
          setTotalPnLPercent((pnl / (total - pnl)) * 100);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // ignore and fall back to mock
      }

      const mockAssets: PortfolioAsset[] = [
        {
          symbol: 'BTC',
          amount: 0.5,
          currentPrice: 51200,
          value: 25600,
          change24h: 1200,
          changePercent24h: 2.4,
          entryPrice: 48000,
          unrealizedPnL: 1600,
          unrealizedPnLPercent: 6.7,
        },
        {
          symbol: 'ETH',
          amount: 5,
          currentPrice: 2850,
          value: 14250,
          change24h: 200,
          changePercent24h: 1.4,
          entryPrice: 2700,
          unrealizedPnL: 750,
          unrealizedPnLPercent: 5.6,
        },
        {
          symbol: 'BNB',
          amount: 10,
          currentPrice: 620,
          value: 6200,
          change24h: 50,
          changePercent24h: 0.8,
          entryPrice: 580,
          unrealizedPnL: 400,
          unrealizedPnLPercent: 6.9,
        },
        {
          symbol: 'XRP',
          amount: 500,
          currentPrice: 2.4,
          value: 1200,
          change24h: -30,
          changePercent24h: -2.4,
          entryPrice: 2.5,
          unrealizedPnL: -50,
          unrealizedPnLPercent: -4.0,
        },
      ];

      if (!mounted) return;
      setAssets(mockAssets);
      const total = mockAssets.reduce((sum, asset) => sum + asset.value, 0);
      const pnl = mockAssets.reduce(
        (sum, asset) => sum + asset.unrealizedPnL,
        0
      );
      setTotalValue(total);
      setTotalPnL(pnl);
      setTotalPnLPercent((pnl / (total - pnl)) * 100);
      setIsLoading(false);
    }

    loadPortfolio();
    return () => {
      mounted = false;
    };
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
          <h1 className='text-3xl font-bold text-foreground'>Portfolio</h1>
          <p className='text-muted-foreground mt-1'>
            Your crypto holdings and performance
          </p>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className='grid gap-4 md:grid-cols-3'>
        <div className='trading-card p-4'>
          <div className='text-sm text-muted-foreground'>
            Total Portfolio Value
          </div>
          <div className='text-3xl font-bold text-foreground mt-2'>
            ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
          <div className='text-xs text-muted-foreground mt-2'>
            USD equivalent
          </div>
        </div>
        <div className='trading-card p-4'>
          <div className='text-sm text-muted-foreground'>Unrealized P&L</div>
          <div
            className={`text-3xl font-bold mt-2 ${
              totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ${totalPnL.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
          <div
            className={`flex items-center mt-2 text-xs ${
              totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {totalPnL >= 0 ? (
              <ChevronUpIcon className='h-4 w-4' />
            ) : (
              <ChevronDownIcon className='h-4 w-4' />
            )}
            <span>{totalPnLPercent.toFixed(2)}%</span>
          </div>
        </div>
        <div className='trading-card p-4'>
          <div className='text-sm text-muted-foreground'>Total Holdings</div>
          <div className='text-3xl font-bold text-foreground mt-2'>
            {assets.length}
          </div>
          <div className='text-xs text-muted-foreground mt-2'>
            Active cryptocurrencies
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className='trading-card'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border'>
                <th className='text-left py-3 px-4 text-muted-foreground font-medium'>
                  Asset
                </th>
                <th className='text-right py-3 px-4 text-muted-foreground font-medium'>
                  Amount
                </th>
                <th className='text-right py-3 px-4 text-muted-foreground font-medium'>
                  Price
                </th>
                <th className='text-right py-3 px-4 text-muted-foreground font-medium'>
                  Value
                </th>
                <th className='text-right py-3 px-4 text-muted-foreground font-medium'>
                  Entry Price
                </th>
                <th className='text-right py-3 px-4 text-muted-foreground font-medium'>
                  Unrealized P&L
                </th>
                <th className='text-right py-3 px-4 text-muted-foreground font-medium'>
                  24h Change
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.symbol}
                  className='border-b border-border hover:bg-secondary transition-colors'
                >
                  <td className='py-3 px-4'>
                    <div className='font-semibold text-foreground'>
                      {asset.symbol}
                    </div>
                  </td>
                  <td className='text-right py-3 px-4 text-foreground'>
                    {asset.amount.toFixed(4)}
                  </td>
                  <td className='text-right py-3 px-4 text-foreground'>
                    $
                    {asset.currentPrice.toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className='text-right py-3 px-4 font-semibold text-foreground'>
                    $
                    {asset.value.toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className='text-right py-3 px-4 text-muted-foreground'>
                    $
                    {asset.entryPrice.toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className='text-right py-3 px-4'>
                    <div
                      className={
                        asset.unrealizedPnL >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      <div className='font-semibold'>
                        $
                        {asset.unrealizedPnL.toLocaleString('en-US', {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className='text-xs'>
                        {asset.unrealizedPnLPercent >= 0 ? '+' : ''}
                        {asset.unrealizedPnLPercent.toFixed(2)}%
                      </div>
                    </div>
                  </td>
                  <td className='text-right py-3 px-4'>
                    <div
                      className={`flex items-center justify-end gap-1 ${
                        asset.changePercent24h >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {asset.changePercent24h >= 0 ? (
                        <ChevronUpIcon className='h-4 w-4' />
                      ) : (
                        <ChevronDownIcon className='h-4 w-4' />
                      )}
                      <span>
                        {asset.changePercent24h >= 0 ? '+' : ''}
                        {asset.changePercent24h.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Distribution */}
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='trading-card p-4'>
          <h3 className='text-lg font-semibold text-foreground mb-4'>
            Asset Allocation
          </h3>
          <div className='space-y-3'>
            {assets.map((asset) => (
              <div key={asset.symbol}>
                <div className='flex justify-between items-center mb-1'>
                  <span className='text-sm text-muted-foreground'>
                    {asset.symbol}
                  </span>
                  <span className='text-sm font-semibold text-foreground'>
                    {((asset.value / totalValue) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className='h-2 bg-secondary rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-primary transition-all'
                    style={{ width: `${(asset.value / totalValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='trading-card p-4'>
          <h3 className='text-lg font-semibold text-foreground mb-4'>
            Performance Summary
          </h3>
          <div className='space-y-3'>
            <div className='flex justify-between items-center pb-3 border-b border-border'>
              <span className='text-sm text-muted-foreground'>Winners</span>
              <span className='text-sm font-semibold text-green-600'>
                {assets.filter((a) => a.unrealizedPnL > 0).length} assets
              </span>
            </div>
            <div className='flex justify-between items-center pb-3 border-b border-border'>
              <span className='text-sm text-muted-foreground'>Losers</span>
              <span className='text-sm font-semibold text-red-600'>
                {assets.filter((a) => a.unrealizedPnL < 0).length} assets
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>
                Total Return
              </span>
              <span
                className={`text-sm font-semibold ${
                  totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {totalPnL >= 0 ? '+' : ''}
                {totalPnLPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
