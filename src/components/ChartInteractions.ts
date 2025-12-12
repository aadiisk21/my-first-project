/**
 * Chart interaction utilities for zoom, pan, and scroll handling
 */

export interface ChartState {
  zoom: number; // zoom level (1 = 100%, 2 = 200%, etc)
  panX: number; // horizontal pan offset in pixels
  panY: number; // vertical pan offset in pixels
  scrollY: number; // price axis scroll offset
}

export const DEFAULT_CHART_STATE: ChartState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  scrollY: 0,
};

/**
 * Handle wheel event for zoom and vertical scroll
 * Ctrl+Wheel = zoom in/out on candles
 * Shift+Wheel = scroll price axis up/down
 * Plain wheel = horizontal scroll (pan)
 */
export function handleWheelZoom(
  e: WheelEvent,
  state: ChartState,
  maxZoom: number = 10
): Partial<ChartState> {
  // Smooth zoom delta based on actual wheel delta
  const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100);
  const zoomSpeed = 0.001; // Reduced for smoother zoom
  const delta = normalizedDelta * zoomSpeed;

  if (e.ctrlKey || e.metaKey) {
    // Zoom in/out with smooth acceleration
    const newZoom = Math.max(0.5, Math.min(maxZoom, state.zoom - delta));
    return { zoom: newZoom };
  } else if (e.shiftKey) {
    // Scroll price axis with smoother movement
    const scrollDelta = normalizedDelta * 0.5;
    return { scrollY: state.scrollY + scrollDelta };
  } else {
    // Pan horizontally with smoother movement
    const panDelta = normalizedDelta * 0.3;
    return { panX: state.panX - panDelta };
  }
}

/**
 * Handle mouse drag for panning
 */
export function handleMouseDrag(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  isDragging: boolean
): Partial<ChartState> {
  if (!isDragging) return {};

  const dragX = currentX - startX;
  const dragY = currentY - startY;

  return {
    panX: dragX,
    panY: dragY,
  };
}

/**
 * Constrain chart state to reasonable bounds
 */
export function constrainChartState(state: ChartState): ChartState {
  return {
    ...state,
    zoom: Math.max(0.5, Math.min(10, state.zoom)),
    panX: Math.max(-500, Math.min(500, state.panX)),
    panY: Math.max(-200, Math.min(200, state.panY)),
    scrollY: Math.max(-1000, Math.min(1000, state.scrollY)),
  };
}

/**
 * Calculate visible candles based on zoom level
 */
export function getVisibleCandleRange(
  totalCandles: number,
  zoom: number,
  panX: number,
  chartWidth: number
): { start: number; end: number } {
  const candlesPerView = Math.max(2, Math.floor(40 / zoom));
  const candleWidth = (chartWidth / candlesPerView) * zoom;
  const startOffset = Math.floor(-panX / candleWidth);
  const start = Math.max(0, totalCandles - candlesPerView - startOffset);
  const end = Math.min(totalCandles, start + candlesPerView);

  return { start, end };
}
