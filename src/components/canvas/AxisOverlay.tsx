/**
 * Axis Overlay Component
 *
 * Provides a visual reference grid with:
 * - X-axis: Alphabetical labels (A, B, C, D, ...)
 * - Y-axis: Numerical labels (1, 2, 3, ...)
 *
 * This is purely visual and non-interactive.
 * - Cannot be selected or edited
 * - Does not receive mouse events
 * - Not stored in data files
 * - Components do not snap to axis intersections
 */

import React, { useMemo } from 'react';
import { Layer, Line, Text, Rect } from 'react-konva';

interface AxisOverlayProps {
  /** Viewport width in pixels */
  viewportWidth: number;
  /** Viewport height in pixels */
  viewportHeight: number;
  /** Current zoom scale */
  scale: number;
  /** Viewport X offset */
  offsetX: number;
  /** Viewport Y offset */
  offsetY: number;
  /** Size of each grid cell in canvas units */
  cellSize?: number;
  /** Show grid lines (not just labels) */
  showLines?: boolean;
  /** Show the overlay */
  visible?: boolean;
}

// Style constants
const LABEL_FONT_SIZE = 12;
const LABEL_COLOR = '#6b7280'; // gray-500
const LABEL_BG_COLOR = 'rgba(249, 250, 251, 0.9)'; // gray-50 with opacity
const LINE_COLOR = 'rgba(209, 213, 219, 0.5)'; // gray-300 with opacity
const BORDER_WIDTH = 24; // Width of the label border area

/**
 * Convert a number to alphabetical label (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
 */
function numberToAlpha(n: number): string {
  let result = '';
  let num = n;

  do {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return result;
}

export const AxisOverlay: React.FC<AxisOverlayProps> = ({
  viewportWidth,
  viewportHeight,
  scale,
  offsetX,
  offsetY,
  cellSize = 100,
  showLines = true,
  visible = true,
}) => {
  // Calculate visible range in canvas coordinates
  const canvasLeft = -offsetX / scale;
  const canvasTop = -offsetY / scale;
  const canvasRight = (viewportWidth - offsetX) / scale;
  const canvasBottom = (viewportHeight - offsetY) / scale;

  // Calculate which cells are visible
  const startCol = Math.floor(canvasLeft / cellSize);
  const endCol = Math.ceil(canvasRight / cellSize);
  const startRow = Math.floor(canvasTop / cellSize);
  const endRow = Math.ceil(canvasBottom / cellSize);

  // Generate grid data
  const gridData = useMemo(() => {
    const columns: { index: number; x: number; label: string }[] = [];
    const rows: { index: number; y: number; label: string }[] = [];

    // Generate column data (X-axis, alphabetical)
    for (let i = Math.max(0, startCol); i <= endCol; i++) {
      columns.push({
        index: i,
        x: i * cellSize,
        label: numberToAlpha(i),
      });
    }

    // Generate row data (Y-axis, numerical)
    for (let i = Math.max(0, startRow); i <= endRow; i++) {
      rows.push({
        index: i,
        y: i * cellSize,
        label: String(i + 1), // 1-indexed for display
      });
    }

    return { columns, rows };
  }, [startCol, endCol, startRow, endRow, cellSize]);

  if (!visible) {
    return null;
  }

  // Calculate label positions in screen space
  const labelFontSize = LABEL_FONT_SIZE;

  return (
    <>
      {/* Grid Lines Layer - rendered in canvas coordinates */}
      {showLines && (
        <Layer listening={false}>
          {/* Vertical grid lines */}
          {gridData.columns.map((col) => (
            <Line
              key={`v-${col.index}`}
              points={[col.x, canvasTop, col.x, canvasBottom]}
              stroke={LINE_COLOR}
              strokeWidth={1 / scale}
              listening={false}
            />
          ))}

          {/* Horizontal grid lines */}
          {gridData.rows.map((row) => (
            <Line
              key={`h-${row.index}`}
              points={[canvasLeft, row.y, canvasRight, row.y]}
              stroke={LINE_COLOR}
              strokeWidth={1 / scale}
              listening={false}
            />
          ))}
        </Layer>
      )}

      {/* Labels Layer - rendered in screen coordinates (fixed position) */}
      <Layer listening={false}>
        {/* Top label background */}
        <Rect
          x={0}
          y={0}
          width={viewportWidth / scale}
          height={BORDER_WIDTH / scale}
          fill={LABEL_BG_COLOR}
          listening={false}
          transformsEnabled="position"
        />

        {/* Left label background */}
        <Rect
          x={canvasLeft}
          y={canvasTop}
          width={BORDER_WIDTH / scale}
          height={(canvasBottom - canvasTop)}
          fill={LABEL_BG_COLOR}
          listening={false}
        />

        {/* Column labels (A, B, C...) at top */}
        {gridData.columns.map((col) => {
          const screenX = col.x;
          const labelX = screenX + (cellSize / 2);

          return (
            <Text
              key={`col-label-${col.index}`}
              x={labelX}
              y={canvasTop + (BORDER_WIDTH / 2 / scale)}
              text={col.label}
              fontSize={labelFontSize / scale}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="bold"
              fill={LABEL_COLOR}
              align="center"
              verticalAlign="middle"
              offsetX={(col.label.length * labelFontSize * 0.3) / scale}
              listening={false}
            />
          );
        })}

        {/* Row labels (1, 2, 3...) at left */}
        {gridData.rows.map((row) => {
          const screenY = row.y;
          const labelY = screenY + (cellSize / 2);

          return (
            <Text
              key={`row-label-${row.index}`}
              x={canvasLeft + (BORDER_WIDTH / 2 / scale)}
              y={labelY}
              text={row.label}
              fontSize={labelFontSize / scale}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontStyle="bold"
              fill={LABEL_COLOR}
              align="center"
              verticalAlign="middle"
              offsetX={(row.label.length * labelFontSize * 0.3) / scale}
              offsetY={(labelFontSize * 0.4) / scale}
              listening={false}
            />
          );
        })}

        {/* Corner cell (top-left) */}
        <Rect
          x={canvasLeft}
          y={canvasTop}
          width={BORDER_WIDTH / scale}
          height={BORDER_WIDTH / scale}
          fill={LABEL_BG_COLOR}
          listening={false}
        />
      </Layer>
    </>
  );
};

export default AxisOverlay;
