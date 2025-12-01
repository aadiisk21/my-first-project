import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Simple mock portfolio for dev
  const assets = [
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
  ];

  return NextResponse.json({ success: true, data: { assets, count: assets.length, timestamp: new Date().toISOString() } });
}
