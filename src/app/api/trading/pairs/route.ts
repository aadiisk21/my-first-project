import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: Request) {
  try {
    const res = await fetch(`${BACKEND}/api/trading/pairs?category=crypto&limit=50`);
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json({ success: false, error: json?.error || 'Backend error' }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: json.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
