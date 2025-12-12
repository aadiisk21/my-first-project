import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3003';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const pair = searchParams.get('pair');
    const signalType = searchParams.get('signalType');
    const confidenceMin = searchParams.get('confidenceMin');
    const riskLevel = searchParams.get('riskLevel');
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const queryParams = new URLSearchParams({
      page,
      limit,
      sortBy,
      sortOrder,
      ...(pair && { pair }),
      ...(signalType && { signalType }),
      ...(confidenceMin && { confidenceMin }),
      ...(riskLevel && { riskLevel }),
    });

    const backendUrl = `${BACKEND}/api/signals?${queryParams}`;

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
    console.error('Error fetching signals:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch signals',
      },
      { status: 500 }
    );
  }
}
