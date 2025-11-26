import axios from 'axios';
import { MarketData } from '../../src/types';

export class BinanceService {
  private baseUrl = 'https://api.binance.com';
  private wsUrl = 'wss://stream.binance.com:9443';

  async getCurrentPrice(symbol: string): Promise<{
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }> {
    try {
      const [ticker, _24hrTicker] = await Promise.all([
        axios.get(`${this.baseUrl}/api/v3/ticker/price`, {
          params: { symbol: symbol.replace('/', '') }
        }),
        axios.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
          params: { symbol: symbol.replace('/', '') }
        })
      ]);

      return {
        price: parseFloat(ticker.data.price),
        change: parseFloat(_24hrTicker.data.priceChange),
        changePercent: parseFloat(_24hrTicker.data.priceChangePercent),
        volume: parseFloat(_24hrTicker.data.volume)
      };
    } catch (error) {
      throw new Error(`Failed to fetch price for ${symbol}: ${error}`);
    }
  }

  async getHistoricalData(
    symbol: string,
    options: {
      timeframe: string;
      limit: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<MarketData[]> {
    try {
      const { timeframe, limit } = options;
      const interval = this.mapTimeframe(timeframe);

      const params: any = {
        symbol: symbol.replace('/', ''),
        interval,
        limit
      };

      if (options.startDate) {
        params.startTime = options.startDate.getTime();
      }

      if (options.endDate) {
        params.endTime = options.endDate.getTime();
      }

      const response = await axios.get(`${this.baseUrl}/api/v3/klines`, { params });

      return response.data.map((kline: any[]) => ({
        symbol,
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
    } catch (error) {
      throw new Error(`Failed to fetch historical data for ${symbol}: ${error}`);
    }
  }

  private mapTimeframe(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };

    return mapping[timeframe] || '1h';
  }
}