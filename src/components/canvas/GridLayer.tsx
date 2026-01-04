/**
 * GridLayer Component
 *
 * Renders the background grid on the canvas.
 * Uses Konva shapes for efficient rendering.
 */

import React, { useMemo } from 'react';
import { Layer, Line, Rect } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  gridSize: number;
  visible: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const GridLayer: React.FC<GridLayerProps> = ({
  width,
  height,
  gridSize,
  visible,
  scale,
  offsetX,
  offsetY,
}) => {
  // Calculate grid lines based on viewport
  const gridLines = useMemo(() => {
    if (!visible) return { vertical: [], horizontal: [] };

    // Adjust grid size based on zoom level
    let effectiveGridSize = gridSize;

    // When zoomed out, show fewer grid lines
    if (scale < 0.5) {
      effectiveGridSize = gridSize * 4;
    } else if (scale < 0.75) {
      effectiveGridSize = gridSize * 2;
    }

    // Calculate visible area in canvas coordinates
    const visibleLeft = -offsetX / scale;
    const visibleTop = -offsetY / scale;
    const visibleRight = visibleLeft + width / scale;
    const visibleBottom = visibleTop + height / scale;

    // Add padding to ensure lines are drawn beyond the visible edge
    const padding = effectiveGridSize * 2;
    const startX = Math.floor((visibleLeft - padding) / effectiveGridSize) * effectiveGridSize;
    const startY = Math.floor((visibleTop - padding) / effectiveGridSize) * effectiveGridSize;
    const endX = Math.ceil((visibleRight + padding) / effectiveGridSize) * effectiveGridSize;
    const endY = Math.ceil((visibleBottom + padding) / effectiveGridSize) * effectiveGridSize;

    const vertical: number[] = [];
    const horizontal: number[] = [];

    // Generate vertical lines
    for (let x = startX; x <= endX; x += effectiveGridSize) {
      vertical.push(x);
    }

    // Generate horizontal lines
    for (let y = startY; y <= endY; y += effectiveGridSize) {
      horizontal.push(y);
    }

    return { vertical, horizontal, effectiveGridSize };
  }, [width, height, gridSize, visible, scale, offsetX, offsetY]);

  // Calculate major grid lines (every 5th line)
  const majorGridInterval = 5;

  if (!visible) {
    return (
      <Layer listening={false}>
        {/* Background only */}
        <Rect
          x={-offsetX / scale}
          y={-offsetY / scale}
          width={width / scale}
          height={height / scale}
          fill="#ffffff"
        />
      </Layer>
    );
  }

  return (
    <Layer listening={false}>
      {/* Background */}
      <Rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="#ffffff"
      />

      {/* Minor grid lines */}
      {gridLines.vertical.map((x, i) => {
        const isMajor = Math.round(x / (gridLines.effectiveGridSize || gridSize)) % majorGridInterval === 0;
        if (isMajor) return null;
        return (
          <Line
            key={`v-${i}`}
            points={[x, -10000, x, 10000]}
            stroke="#e5e7eb"
            strokeWidth={1 / scale}
            listening={false}
          />
        );
      })}

      {gridLines.horizontal.map((y, i) => {
        const isMajor = Math.round(y / (gridLines.effectiveGridSize || gridSize)) % majorGridInterval === 0;
        if (isMajor) return null;
        return (
          <Line
            key={`h-${i}`}
            points={[-10000, y, 10000, y]}
            stroke="#e5e7eb"
            strokeWidth={1 / scale}
            listening={false}
          />
        );
      })}

      {/* Major grid lines */}
      {gridLines.vertical.map((x, i) => {
        const isMajor = Math.round(x / (gridLines.effectiveGridSize || gridSize)) % majorGridInterval === 0;
        if (!isMajor) return null;
        return (
          <Line
            key={`v-major-${i}`}
            points={[x, -10000, x, 10000]}
            stroke="#d1d5db"
            strokeWidth={1 / scale}
            listening={false}
          />
        );
      })}

      {gridLines.horizontal.map((y, i) => {
        const isMajor = Math.round(y / (gridLines.effectiveGridSize || gridSize)) % majorGridInterval === 0;
        if (!isMajor) return null;
        return (
          <Line
            key={`h-major-${i}`}
            points={[-10000, y, 10000, y]}
            stroke="#d1d5db"
            strokeWidth={1 / scale}
            listening={false}
          />
        );
      })}

      {/* Origin marker */}
      <Line
        points={[-50, 0, 50, 0]}
        stroke="#94a3b8"
        strokeWidth={2 / scale}
        listening={false}
      />
      <Line
        points={[0, -50, 0, 50]}
        stroke="#94a3b8"
        strokeWidth={2 / scale}
        listening={false}
      />
    </Layer>
  );
};

export default GridLayer;
