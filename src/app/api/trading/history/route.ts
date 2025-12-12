import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003';

// Generate realistic mock candlestick data
function generateMockData(count: number = 100) {
  const now = Date.now();
  const interval = 3600000; // 1 hour
  let basePrice = 42000 + Math.random() * 3000; // BTC price range
  const data = [];

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * interval;
    const volatility = 0.015; // 1.5% volatility
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * Math.abs(change);
    const low = Math.min(open, close) - Math.random() * Math.abs(change);
    const volume = 100 + Math.random() * 500;

    data.push({
      timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
    });

    basePrice = close; // Next candle starts where this one ends
  }

  return data;
}

export async function GET(
  request: NextRequest
) {
  try {
    const symbol = new URL(request.url).searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = new URL(request.url).searchParams.get('timeframe') || '1h';
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '100');

    const backendUrl = `${BACKEND}/api/trading/history/${symbol}?timeframe=${timeframe}&limit=${limit}`;

    try {
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (backendError) {
      // Backend not available, use mock data
      console.log('Backend unavailable, using mock data for', symbol);
      const mockData = generateMockData(limit);
      
      return NextResponse.json({
        success: true,
        symbol,
        timeframe,
        data: mockData,
        source: 'mock', // Indicate this is mock data
      });
    }
  } catch (error) {
    console.error('Error in trading history route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch historical data',
      },
      { status: 500 }
    );
  }
}
