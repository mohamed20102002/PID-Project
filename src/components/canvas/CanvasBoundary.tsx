/**
 * Canvas Boundary Component
 *
 * Renders a visible boundary rectangle showing the canvas working area.
 * This helps users understand the printable/exportable area of the diagram.
 */

import React from 'react';
import { Layer, Rect, Line } from 'react-konva';

interface CanvasBoundaryProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Current zoom scale */
  scale: number;
  /** Whether to show the boundary */
  visible?: boolean;
  /** Dark mode enabled */
  darkMode?: boolean;
}

// Color schemes for light and dark modes
const LIGHT_COLORS = {
  background: '#ffffff',
  border: '#94a3b8',
  corner: '#64748b',
};

const DARK_COLORS = {
  background: '#111827',
  border: '#6b7280',
  corner: '#9ca3af',
};

export const CanvasBoundary: React.FC<CanvasBoundaryProps> = ({
  width,
  height,
  scale,
  visible = true,
  darkMode = false,
}) => {
  if (!visible) {
    return null;
  }

  // Select color scheme based on mode
  const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;
  const borderWidth = 2 / scale;
  const cornerSize = 20 / scale;

  return (
    <Layer listening={false}>
      {/* Canvas background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={colors.background}
        listening={false}
      />

      {/* Canvas border */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke={colors.border}
        strokeWidth={borderWidth}
        dash={[10 / scale, 5 / scale]}
        listening={false}
      />

      {/* Corner markers */}
      {/* Top-left corner */}
      <Line
        points={[0, cornerSize, 0, 0, cornerSize, 0]}
        stroke={colors.corner}
        strokeWidth={borderWidth * 1.5}
        listening={false}
      />

      {/* Top-right corner */}
      <Line
        points={[width - cornerSize, 0, width, 0, width, cornerSize]}
        stroke={colors.corner}
        strokeWidth={borderWidth * 1.5}
        listening={false}
      />

      {/* Bottom-left corner */}
      <Line
        points={[0, height - cornerSize, 0, height, cornerSize, height]}
        stroke={colors.corner}
        strokeWidth={borderWidth * 1.5}
        listening={false}
      />

      {/* Bottom-right corner */}
      <Line
        points={[width - cornerSize, height, width, height, width, height - cornerSize]}
        stroke={colors.corner}
        strokeWidth={borderWidth * 1.5}
        listening={false}
      />
    </Layer>
  );
};

export default CanvasBoundary;
