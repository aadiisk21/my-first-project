import { NextResponse } from 'next/server';
import { BinanceService } from '../../../../../../backend/services/binanceService';

export async function GET(request: Request) {
  try {
    const service = new BinanceService();
    const pairs = await service.getCryptoPairs();

    return NextResponse.json({
      success: true,
      data: {
        pairs,
        count: pairs.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
