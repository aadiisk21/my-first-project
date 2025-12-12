'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MarketData, TechnicalIndicators } from '@/types';
import { useTradingStore } from '@/stores/useTradingStore';
import {
  handleWheelZoom,
  constrainChartState,
  getVisibleCandleRange,
  DEFAULT_CHART_STATE,
  ChartState,
} from './ChartInteractions';

interface TradingChartProps {
  symbol: string;
  timeframe?: string;
  height?: string;
  showVolume?: boolean;
  showIndicators?: boolean;
  className?: string;
}

interface ChartTooltip {
  x: number;
  y: number;
  candle?: MarketData;
  visible: boolean;
}

export function TradingChart({
  symbol,
  timeframe = '1h',
  height = '400px',
  showVolume = true,
  showIndicators = true,
  className = '',
}: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Chart state
  const [chartSize, setChartSize] = useState({ width: 800, height: 400 });
  const [chartState, setChartState] = useState<ChartState>(DEFAULT_CHART_STATE);
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<ChartTooltip>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState('1.0x');
  const [countdown, setCountdown] = useState<string>('00:00');

  // Store data
  const marketData = useTradingStore((state) => state.marketData[symbol]);
  const technicalIndicators = useTradingStore(
    (state) => state.technicalIndicators[symbol]
  );
  const currentPrice = useTradingStore((state) => state.currentPrices[symbol]);
  const data = marketData ?? [];

  console.log('[TradingChart] symbol:', symbol, 'marketData length:', data.length);

  // CSS variable helper
  const cssVar = (key: string) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(key)
      .trim();
    if (!v) return '';
    if (
      v.startsWith('#') ||
      v.startsWith('rgb') ||
      v.startsWith('rgba') ||
      v.startsWith('hsl')
    )
      return v;
    return `rgb(${v})`;
  };

  const rgbaVar = (key: string, a: number) => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(key)
      .trim();
    if (!v) return `rgba(0,0,0,${a})`;
    return `rgba(${v},${a})`;
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setChartSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wheel handler for zoom and pan
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const wheelEvent = e.nativeEvent as WheelEvent;
      const newState = handleWheelZoom(wheelEvent, chartState);
      setChartState((prev) => constrainChartState({ ...prev, ...newState }));
    },
    [chartState]
  );

  // Mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Mouse move for dragging and tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setChartState((prev) =>
        constrainChartState({
          ...prev,
          panX: prev.panX + deltaX * 0.5,
          panY: prev.panY + deltaY * 0.5,
        })
      );
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Calculate which candle is hovered
    const padding = { top: 20, right: 60, bottom: 40, left: 10 };
    const chartWidth = rect.width - padding.left - padding.right;
    const visibleRange = getVisibleCandleRange(
      data.length,
      chartState.zoom,
      chartState.panX,
      chartWidth
    );
    const candleSpacing = chartWidth / (visibleRange.end - visibleRange.start);
    const relativeX = x - padding.left - chartState.panX;
    const candleIndex = Math.floor(relativeX / candleSpacing) + visibleRange.start;

    if (candleIndex >= 0 && candleIndex < data.length) {
      setHoveredCandle(candleIndex);
      setTooltip({
        x,
        y,
        candle: data[candleIndex],
        visible: true,
      });
    } else {
      setHoveredCandle(null);
      setTooltip({ ...tooltip, visible: false });
    }
  };

  // Mouse up for dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse leave
  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setTooltip({ ...tooltip, visible: false });
  };

  // Update zoom display
  useEffect(() => {
    setZoomLevel(`${chartState.zoom.toFixed(1)}x`);
  }, [chartState.zoom]);

  // Countdown timer for next candle close
  useEffect(() => {
    const getTimeframeMs = (tf: string): number => {
      const unit = tf.slice(-1);
      const value = parseInt(tf.slice(0, -1)) || 1;
      switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60 * 1000; // default 1 minute
      }
    };

    const updateCountdown = () => {
      const now = Date.now();
      const intervalMs = getTimeframeMs(timeframe);
      const msUntilClose = intervalMs - (now % intervalMs);
      const minutes = Math.floor(msUntilClose / 60000);
      const seconds = Math.floor((msUntilClose % 60000) / 1000);
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // Main drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = chartSize;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = cssVar('--background') || '#fff';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 20, right: 60, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get visible candles based on zoom and pan
    const visibleRange = getVisibleCandleRange(
      data.length,
      chartState.zoom,
      chartState.panX,
      chartWidth
    );
    const visibleData = data.slice(visibleRange.start, visibleRange.end);

    if (visibleData.length === 0) return;

    // Calculate price range for visible data
    const prices = visibleData.flatMap((d) => [d.high, d.low]);
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);

    // Apply price scroll offset
    const priceRange = maxPrice - minPrice;
    const priceScrollPixels = chartState.scrollY * 0.1;
    const priceScrollAmount = (priceScrollPixels / chartHeight) * priceRange;
    minPrice -= priceScrollAmount;
    maxPrice -= priceScrollAmount;

    const adjustedPriceRange = maxPrice - minPrice;
    if (adjustedPriceRange === 0) return;

    // Draw grid lines
    ctx.strokeStyle = cssVar('--border') || 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      ctx.fillStyle = cssVar('--muted-foreground') || '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      const price =
        maxPrice - (adjustedPriceRange / 5) * i - chartState.scrollY * 0.001;
      ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
    }
    ctx.setLineDash([]);

    // Draw candlesticks
    const candleSpacing = chartWidth / visibleData.length;
    const candleWidth = Math.max(1, candleSpacing * 0.6);

    visibleData.forEach((candle, index) => {
      const x = padding.left + index * candleSpacing + candleSpacing / 2 + chartState.panX;
      const yHigh =
        padding.top +
        ((maxPrice - candle.high) / adjustedPriceRange) * chartHeight;
      const yLow =
        padding.top +
        ((maxPrice - candle.low) / adjustedPriceRange) * chartHeight;
      const yOpen =
        padding.top +
        ((maxPrice - candle.open) / adjustedPriceRange) * chartHeight;
      const yClose =
        padding.top +
        ((maxPrice - candle.close) / adjustedPriceRange) * chartHeight;

      const isGreen = candle.close >= candle.open;
      const buyColor = cssVar('--buy') || 'rgb(34,197,94)';
      const sellColor = cssVar('--sell') || 'rgb(239,68,68)';
      const color = isGreen ? buyColor : sellColor;

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = color;
      const bodyHeight = Math.abs(yClose - yOpen);
      const bodyY = Math.min(yOpen, yClose);

      if (bodyHeight > 1) {
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      } else {
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, 1);
      }

      // Draw technical indicators if enabled
      if (showIndicators && technicalIndicators) {
        const dataIndex = visibleRange.start + index;

        // Draw SMA
        if (technicalIndicators.sma && technicalIndicators.sma[dataIndex]) {
          ctx.strokeStyle = cssVar('--chart-2') || '#8b5cf6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const smaY =
            padding.top +
            ((maxPrice - technicalIndicators.sma[dataIndex]) / adjustedPriceRange) *
              chartHeight;
          if (index === 0) {
            ctx.moveTo(x, smaY);
          } else {
            ctx.lineTo(x, smaY);
          }
          ctx.stroke();
        }

        // Draw Bollinger Bands
        if (technicalIndicators.bollingerBands) {
          const { upper, lower } = technicalIndicators.bollingerBands;
          if (upper[dataIndex] && lower[dataIndex]) {
            ctx.strokeStyle = cssVar('--chart-3') || '#06b6d4';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);

            ctx.beginPath();
            const upperY =
              padding.top +
              ((maxPrice - upper[dataIndex]) / adjustedPriceRange) * chartHeight;
            if (index === 0) {
              ctx.moveTo(x, upperY);
            } else {
              ctx.lineTo(x, upperY);
            }
            ctx.stroke();

            ctx.beginPath();
            const lowerY =
              padding.top +
              ((maxPrice - lower[dataIndex]) / adjustedPriceRange) * chartHeight;
            if (index === 0) {
              ctx.moveTo(x, lowerY);
            } else {
              ctx.lineTo(x, lowerY);
            }
            ctx.stroke();

            ctx.setLineDash([]);
          }
        }
      }
    });

    // Draw current price line
    if (currentPrice) {
      const currentY =
        padding.top +
        ((maxPrice - currentPrice) / adjustedPriceRange) * chartHeight;
      ctx.strokeStyle = cssVar('--primary') || '#0666ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, currentY);
      ctx.lineTo(width - padding.right, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = cssVar('--primary') || '#0666ff';
      ctx.fillRect(width - padding.right - 60, currentY - 10, 60, 20);
      ctx.fillStyle = cssVar('--primary-foreground') || '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentPrice.toFixed(2)} ${countdown}`, width - padding.right - 30, currentY + 3);
    }

    // Draw crosshair
    if (tooltip.visible && hoveredCandle !== null) {
      const candle = data[hoveredCandle];
      const x = tooltip.x;
      const y = tooltip.y;

      // Vertical line only (no horizontal)
      ctx.strokeStyle = rgbaVar('--foreground', 0.3) || 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip box
      const tooltipText = [
        `O: ${candle.open.toFixed(2)}`,
        `H: ${candle.high.toFixed(2)}`,
        `L: ${candle.low.toFixed(2)}`,
        `C: ${candle.close.toFixed(2)}`,
        `V: ${(candle.volume / 1000).toFixed(1)}K`,
      ];

      ctx.font = '11px monospace';
      const textWidth = Math.max(
        ...tooltipText.map((t) => ctx.measureText(t).width)
      );
      const tooltipHeight = tooltipText.length * 15 + 10;
      const tooltipX = Math.min(x + 10, width - textWidth - 20);
      const tooltipY = Math.min(y + 10, height - tooltipHeight - 10);

      ctx.fillStyle = cssVar('--popover') || 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = cssVar('--border') || 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(tooltipX - 5, tooltipY, textWidth + 10, tooltipHeight, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = cssVar('--popover-foreground') || '#111';
      ctx.textAlign = 'left';
      tooltipText.forEach((text, index) => {
        ctx.fillText(text, tooltipX, tooltipY + 15 + index * 15);
      });
    }
  }, [
    data,
    chartSize,
    chartState,
    hoveredCandle,
    tooltip,
    technicalIndicators,
    currentPrice,
    countdown,
    showVolume,
    showIndicators,
    cssVar,
    rgbaVar,
  ]);

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={{ height }}
    >
      {/* Header info */}
      <div className='absolute top-2 left-2 z-10 flex items-center space-x-4'>
        <div className='flex items-center space-x-2'>
          <div className='text-sm font-medium text-foreground'>{symbol}</div>
          <div className='text-xs text-muted-foreground'>{timeframe}</div>
        </div>
        {currentPrice && (
          <div className='text-sm font-mono text-primary'>{currentPrice.toFixed(2)}</div>
        )}
        <div className='text-xs text-muted-foreground'>Zoom: {zoomLevel}</div>
      </div>

      {/* Legend */}
      <div className='absolute top-2 right-2 z-10 flex items-center space-x-4'>
        <div className='flex items-center space-x-2'>
          <div className='w-3 h-3 bg-buy rounded'></div>
          <span className='text-xs text-muted-foreground'>Buy</span>
        </div>
        <div className='flex items-center space-x-2'>
          <div className='w-3 h-3 bg-sell rounded'></div>
          <span className='text-xs text-muted-foreground'>Sell</span>
        </div>
      </div>

      {/* Controls */}
      <div className='absolute bottom-2 left-2 z-10 flex items-center space-x-2 text-xs text-muted-foreground'>
        <span>Scroll: Pan</span>
        <span>•</span>
        <span>Ctrl+Scroll: Zoom</span>
        <span>•</span>
        <span>Shift+Scroll: Price</span>
        <span>•</span>
        <span>Drag: Move</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className='w-full h-full cursor-crosshair'
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />

      {/* No data overlay */}
      {data.length === 0 && (
        <div className='absolute inset-0 flex items-center justify-center text-muted-foreground'>
          <div className='text-center'>
            <div className='text-lg font-medium mb-2'>No Data Available</div>
            <div className='text-sm'>Waiting for market data...</div>
          </div>
        </div>
      )}
    </div>
  );
}
