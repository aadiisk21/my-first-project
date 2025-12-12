import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const timeframe = searchParams.get('timeframe');
    const pair = searchParams.get('pair');
    const signalType = searchParams.get('signalType');

    const queryParams = new URLSearchParams({
      ...(timeframe && { timeframe }),
      ...(pair && { pair }),
      ...(signalType && { signalType }),
    });

    const backendUrl = `${BACKEND}/api/signals/stats?${queryParams}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching signal stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch signal stats',
      },
      { status: 500 }
    );
  }
}
