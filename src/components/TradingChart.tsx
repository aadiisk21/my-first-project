"use client";

import React, { useEffect, useRef, useState } from "react";
import { MarketData, TechnicalIndicators } from "@/types";
import { useTradingStore } from "@/stores/useTradingStore";

interface TradingChartProps {
  symbol: string;
  timeframe?: string;
  height?: string;
  showVolume?: boolean;
  showIndicators?: boolean;
  className?: string;
}

export function TradingChart({
  symbol,
  timeframe = "1h",
  height = "400px",
  showVolume = true,
  showIndicators = true,
  className = ""
}: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 800, height: 400 });
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);

    // Selectors should not create new objects/arrays (e.g. `|| []`) because
    // useSyncExternalStore expects stable snapshots - returning freshly created
    // arrays each call can trigger an infinite update loop. We return the
    // stored reference (may be undefined) and default to an empty array/local
    // value inside the component where needed.
    const marketData = useTradingStore((state) => state.marketData[symbol]);
    const technicalIndicators = useTradingStore((state) => state.technicalIndicators[symbol]);
    const currentPrice = useTradingStore((state) => state.currentPrices[symbol]);
    const md = marketData ?? [];

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setChartSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Custom chart drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
      if (!canvas || md.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = chartSize;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background');
    ctx.fillRect(0, 0, width, height);

    // Calculate chart dimensions
    const padding = { top: 20, right: 60, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

      if (md.length === 0) return;

    // Calculate price range
      const prices = md.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Draw grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange / 5) * i;
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground');
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(price.toFixed(4), width - padding.right + 5, y + 3);
    }
    ctx.setLineDash([]);

    // Draw candlesticks
    const candleWidth = Math.max(1, (chartWidth / md.length) * 0.6);
    const candleSpacing = chartWidth / md.length;

    md.forEach((candle, index) => {
      const x = padding.left + index * candleSpacing + candleSpacing / 2;
      const yHigh = padding.top + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const yLow = padding.top + ((maxPrice - candle.low) / priceRange) * chartHeight;
      const yOpen = padding.top + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const yClose = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;

      const isGreen = candle.close >= candle.open;
      const color = isGreen
        ? getComputedStyle(document.documentElement).getPropertyValue('--buy')
        : getComputedStyle(document.documentElement).getPropertyValue('--sell');

      // Highlight hovered candle
      if (hoveredCandle === index) {
        ctx.fillStyle = color + "20";
        ctx.fillRect(x - candleSpacing / 2, padding.top, candleSpacing, chartHeight);
      }

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
        // Doji (open equals close)
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, 1);
      }

      // Draw volume if enabled
      if (showVolume) {
          const maxVolume = Math.max(...md.map(d => d.volume));
        const volumeHeight = (candle.volume / maxVolume) * (chartHeight * 0.2);
        const volumeY = height - padding.bottom - volumeHeight;

        ctx.fillStyle = isGreen ? color + "60" : color + "40";
        ctx.fillRect(x - candleWidth / 2, volumeY, candleWidth, volumeHeight);
      }

      // Draw technical indicators if enabled and available
      if (showIndicators && technicalIndicators) {
        // Draw SMA
        if (technicalIndicators.sma && technicalIndicators.sma[index]) {
          ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-2');
          ctx.lineWidth = 2;
          ctx.beginPath();
          const smaY = padding.top + ((maxPrice - technicalIndicators.sma[index]) / priceRange) * chartHeight;
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
          if (upper[index] && lower[index]) {
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-3');
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 3]);

            // Upper band
            ctx.beginPath();
            const upperY = padding.top + ((maxPrice - upper[index]) / priceRange) * chartHeight;
            if (index === 0) {
              ctx.moveTo(x, upperY);
            } else {
              ctx.lineTo(x, upperY);
            }
            ctx.stroke();

            // Lower band
            ctx.beginPath();
            const lowerY = padding.top + ((maxPrice - lower[index]) / priceRange) * chartHeight;
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
      const currentY = padding.top + ((maxPrice - currentPrice) / priceRange) * chartHeight;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, currentY);
      ctx.lineTo(width - padding.right, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current price label
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
      ctx.fillRect(width - padding.right - 50, currentY - 10, 50, 20);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground');
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(currentPrice.toFixed(4), width - padding.right - 25, currentY + 3);
    }

    // Draw tooltip on hover
    if (hoveredCandle !== null && hoveredCandle < md.length) {
      const candle = md[hoveredCandle];
      const tooltipX = padding.left + hoveredCandle * candleSpacing + candleSpacing / 2;
      const tooltipY = padding.top + 20;

      // Tooltip background
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--popover');
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
      ctx.lineWidth = 1;

      const tooltipText = [
        `O: ${candle.open.toFixed(4)}`,
        `H: ${candle.high.toFixed(4)}`,
        `L: ${candle.low.toFixed(4)}`,
        `C: ${candle.close.toFixed(4)}`,
        `V: ${candle.volume.toLocaleString('en-US')}`
      ];

      ctx.font = "11px monospace";
      const textWidth = Math.max(...tooltipText.map(t => ctx.measureText(t).width));
      const tooltipHeight = tooltipText.length * 15 + 10;

      ctx.beginPath();
      ctx.roundRect(tooltipX - textWidth / 2 - 5, tooltipY, textWidth + 10, tooltipHeight, 4);
      ctx.fill();
      ctx.stroke();

      // Tooltip text
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--popover-foreground');
      ctx.textAlign = "left";
      tooltipText.forEach((text, index) => {
        ctx.fillText(text, tooltipX - textWidth / 2, tooltipY + 15 + index * 15);
      });
    }

  }, [marketData, technicalIndicators, currentPrice, chartSize, hoveredCandle, showVolume, showIndicators]);

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || md.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { top: 20, right: 60, bottom: 40, left: 10 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const candleSpacing = chartWidth / md.length;

    const candleIndex = Math.floor((x - padding.left) / candleSpacing);
    if (candleIndex >= 0 && candleIndex < md.length) {
      setHoveredCandle(candleIndex);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={{ height }}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center space-x-2">
        <div className="text-sm font-medium text-foreground">{symbol}</div>
        <div className="text-xs text-muted-foreground">{timeframe}</div>
        {currentPrice && (
          <div className={`text-sm font-mono ${
            md.length > 0 && currentPrice >= md[md.length - 1].close
              ? 'text-buy'
              : 'text-sell'
          }`}>
            {currentPrice.toFixed(4)}
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-xs">
          <div className="w-3 h-3 bg-buy rounded"></div>
          <span className="text-muted-foreground">Buy</span>
        </div>
        <div className="flex items-center space-x-1 text-xs">
          <div className="w-3 h-3 bg-sell rounded"></div>
          <span className="text-muted-foreground">Sell</span>
        </div>
      </div>

      {showIndicators && technicalIndicators && (
        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-2">
          {technicalIndicators.sma && (
            <div className="flex items-center space-x-1 text-xs">
              <div className="w-3 h-0.5 bg-chart-2"></div>
              <span className="text-muted-foreground">SMA</span>
            </div>
          )}
          {technicalIndicators.bollingerBands && (
            <div className="flex items-center space-x-1 text-xs">
              <div className="w-3 h-0.5 bg-chart-3 border-dashed border-chart-3"></div>
              <span className="text-muted-foreground">BB</span>
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {md.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">No Data Available</div>
            <div className="text-sm">Waiting for market data...</div>
          </div>
        </div>
      )}
    </div>
  );
}