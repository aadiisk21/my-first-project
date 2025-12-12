import { useEffect, useCallback, useRef } from 'react';
import { useTradingStore } from '@/stores/useTradingStore';
import { MarketData } from '@/types';

interface FetchMarketDataOptions {
  symbol: string;
  timeframe?: string;
  limit?: number;
  pollInterval?: number; // polling interval in milliseconds (default: 1000ms)
}

export function useMarketData(options: FetchMarketDataOptions) {
  const { symbol, timeframe = '1h', limit = 100, pollInterval = 1000 } = options;
  
  const setMarketData = useTradingStore((s) => s.setMarketData);
  const setLoading = useTradingStore((s) => s.setLoading);
  const marketData = useTradingStore((s) => s.marketData[symbol]);
  const pollingRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        symbol,
        timeframe,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/trading/history?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

  console.log('[DEBUG] API Response:', { success: result.success, hasData: !!result.data, hasDataArray: !!result.data?.data });
      
  if (result.success && result.data?.data) {
        // Extract market data from the response
        const marketDataArray: MarketData[] = result.data.data.map((item: any) => ({
          timestamp: new Date(item.timestamp),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
          closeTime: item.closeTime ? new Date(item.closeTime) : new Date(item.timestamp),
          quoteAssetVolume: parseFloat(item.quoteAssetVolume || item.volume),
          numberOfTrades: item.numberOfTrades || 0,
          takerBuyBaseAssetVolume: parseFloat(item.takerBuyBaseAssetVolume || 0),
          takerBuyQuoteAssetVolume: parseFloat(item.takerBuyQuoteAssetVolume || 0),
        }));

        setMarketData(symbol, marketDataArray);
        console.log('[DEBUG] setMarketData called for:', symbol, 'count:', marketDataArray.length);
      } else {
        console.warn('Invalid market data response:', result);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, limit, setMarketData, setLoading]);

  // Auto-fetch when symbol or timeframe changes
  useEffect(() => {
    fetchMarketData();
    
    // Set up polling for real-time updates
    pollingRef.current = setInterval(() => {
      fetchMarketData();
    }, pollInterval);

    // Cleanup polling on unmount or dependency change
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [symbol, timeframe, fetchMarketData, pollInterval]);

  return {
    data: marketData || [],
    isLoading: !marketData || marketData.length === 0,
    refetch: fetchMarketData,
  };
}
