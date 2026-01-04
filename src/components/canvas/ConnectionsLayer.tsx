/**
 * Connections Layer
 *
 * Renders all pipe connections between components.
 * Uses PortCalculator for 100% accurate port position calculations.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Layer, Line, Circle, Group, Text, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore } from '../../store/uiStore';
import {
  getPortWorldPosition,
  findPort,
  findPortDefinition,
  getPortWorldAngle,
} from '../../core/geometry/PortCalculator';
import type { Connection, Point, Component } from '../../types';

// ============================================================================
// Style Constants
// ============================================================================

// Alignment guide style
const ALIGNMENT_GUIDE_STYLE = {
  stroke: '#10b981', // green - less distracting
  strokeWidth: 1,
  dash: [6, 6],
  opacity: 0.5,
};

const ALIGNMENT_THRESHOLD = 20; // pixels - how close cursor needs to be to show guide

const PIPE_STYLES = {
  pipe: {
    stroke: '#1a1a1a',
    strokeWidth: 2,
  },
  signal: {
    stroke: '#2563eb',
    strokeWidth: 1.5,
    dash: [8, 4],
  },
};

const SELECTED_STYLE = {
  stroke: '#2563eb',
  strokeWidth: 3,
};

const HOVERED_STYLE = {
  stroke: '#3b82f6',
  strokeWidth: 2.5,
};

const PREVIEW_STYLE = {
  stroke: '#10b981',
  strokeWidth: 2,
  dash: [6, 4],
  opacity: 0.8,
};

// ============================================================================
// Path Calculation - 90 Degree Only
// ============================================================================

/**
 * Convert any two points into orthogonal (90-degree) segments.
 * Goes horizontal first if dx > dy, otherwise vertical first.
 */
function makeOrthogonalSegment(from: Point, to: Point): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // If already aligned, no intermediate point needed
  if (Math.abs(dx) < 1) return [to]; // Vertical line
  if (Math.abs(dy) < 1) return [to]; // Horizontal line

  // Create L-shaped path: horizontal then vertical, or vice versa
  if (Math.abs(dx) > Math.abs(dy)) {
    // Go horizontal first to midpoint, then vertical
    return [{ x: to.x, y: from.y }, to];
  } else {
    // Go vertical first to midpoint, then horizontal
    return [{ x: from.x, y: to.y }, to];
  }
}

/**
 * Calculate pipe path points - ALWAYS 90 degrees only.
 * The path starts EXACTLY at sourcePos and ends EXACTLY at targetPos.
 * All segments are strictly horizontal or vertical.
 */
function calculatePipePath(
  sourcePos: Point,
  targetPos: Point,
  waypoints: Point[]
): number[] {
  const points: Point[] = [sourcePos];

  // Build path through all waypoints with orthogonal segments
  const allTargets = [...waypoints, targetPos];

  for (const target of allTargets) {
    const lastPoint = points[points.length - 1];
    const orthPoints = makeOrthogonalSegment(lastPoint, target);
    points.push(...orthPoints);
  }

  return points.flatMap(p => [p.x, p.y]);
}

/**
 * Calculate the midpoint along the actual path (not straight line)
 * Returns the point at 50% of the total path length
 */
function calculatePathMidpoint(
  sourcePos: Point,
  targetPos: Point,
  waypoints: Point[]
): Point {
  // Build the full path points
  const points: Point[] = [sourcePos];
  const allTargets = [...waypoints, targetPos];

  for (const target of allTargets) {
    const lastPoint = points[points.length - 1];
    const orthPoints = makeOrthogonalSegment(lastPoint, target);
    points.push(...orthPoints);
  }

  // Calculate total path length
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Find the point at 50% of the path length
  const targetLength = totalLength / 2;
  let accumulatedLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (accumulatedLength + segmentLength >= targetLength) {
      // The midpoint is in this segment
      const remainingLength = targetLength - accumulatedLength;
      const ratio = remainingLength / segmentLength;

      return {
        x: points[i].x + dx * ratio,
        y: points[i].y + dy * ratio,
      };
    }

    accumulatedLength += segmentLength;
  }

  // Fallback: return the last point (shouldn't happen)
  return points[points.length - 1];
}

/**
 * Calculate orthogonal preview path for connection drawing
 */
export function calculateOrthogonalPreview(points: Point[]): Point[] {
  if (points.length < 2) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const lastPoint = result[result.length - 1];
    const orthPoints = makeOrthogonalSegment(lastPoint, points[i]);
    result.push(...orthPoints);
  }

  return result;
}

// ============================================================================
// Connection Line Component
// ============================================================================

interface ConnectionLineProps {
  connection: Connection;
  sourcePos: Point;
  targetPos: Point;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  sourcePos,
  targetPos,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}) => {
  // Calculate the path points
  const pathPoints = useMemo(
    () => calculatePipePath(sourcePos, targetPos, connection.waypoints),
    [sourcePos, targetPos, connection.waypoints]
  );

  // Determine styles
  const baseStyle = connection.type === 'signal' ? PIPE_STYLES.signal : PIPE_STYLES.pipe;
  const customColor = connection.style?.strokeColor || baseStyle.stroke;
  const customWidth = connection.style?.strokeWidth || baseStyle.strokeWidth;
  const customDash = connection.style?.strokeDash || baseStyle.dash;

  // Apply selection/hover overrides
  const displayColor = isSelected
    ? SELECTED_STYLE.stroke
    : isHovered
    ? HOVERED_STYLE.stroke
    : customColor;
  const displayWidth = isSelected
    ? SELECTED_STYLE.strokeWidth
    : isHovered
    ? HOVERED_STYLE.strokeWidth
    : customWidth;

  // Calculate label position on a horizontal segment only
  const labelPosition = useMemo(() => {
    // Build all segments of the path
    const points: Point[] = [sourcePos];
    const allTargets = [...connection.waypoints, targetPos];

    for (const target of allTargets) {
      const lastPoint = points[points.length - 1];
      const orthPoints = makeOrthogonalSegment(lastPoint, target);
      points.push(...orthPoints);
    }

    // Find the first horizontal segment (prefer horizontal over vertical)
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const isHorizontal = Math.abs(dx) > Math.abs(dy);

      if (isHorizontal) {
        // Found a horizontal segment - use its midpoint
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        return { x: midX, y: midY, found: true };
      }
    }

    // Fallback: no horizontal segment found, use first segment
    if (points.length >= 2) {
      const midX = (points[0].x + points[1].x) / 2;
      const midY = (points[0].y + points[1].y) / 2;
      return { x: midX, y: midY, found: false };
    }

    return { x: sourcePos.x, y: sourcePos.y, found: false };
  }, [sourcePos, targetPos, connection.waypoints]);

  return (
    <Group>
      {/* Invisible hit area for easier selection */}
      <Line
        points={pathPoints}
        stroke="transparent"
        strokeWidth={12}
        lineCap="round"
        lineJoin="round"
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      />

      {/* Visible pipe line */}
      <Line
        points={pathPoints}
        stroke={displayColor}
        strokeWidth={displayWidth}
        dash={customDash as number[] | undefined}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />

      {/* Pipe labels - show label always, KKS above when selected */}
      {(connection.label || (isSelected && connection.kks)) && (() => {
        // Position above the horizontal segment
        const offsetDistance = 18;
        const labelX = labelPosition.x;
        const baseY = labelPosition.y - offsetDistance;

        const hasKks = isSelected && connection.kks && connection.kks.trim().length > 0;
        const hasLabel = connection.label && connection.label.trim().length > 0;

        return (
          <>
            {/* KKS code - only when selected, shown above */}
            {hasKks && (
              <Text
                text={connection.kks}
                fontSize={9}
                fontFamily="monospace"
                fontStyle="bold"
                fill={customColor}
                opacity={0.9}
                align="center"
                verticalAlign="middle"
                x={labelX}
                y={hasLabel ? baseY - 10 : baseY}
                offsetX={connection.kks.length * 2.7}
                listening={false}
              />
            )}

            {/* Label - always shown when available */}
            {hasLabel && (
              <Text
                text={connection.label}
                fontSize={11}
                fontFamily="system-ui, sans-serif"
                fontStyle="bold"
                fill={customColor}
                opacity={0.9}
                align="center"
                verticalAlign="middle"
                x={labelX}
                y={baseY}
                offsetX={connection.label.length * 3.3}
                listening={false}
              />
            )}
          </>
        );
      })()}

      {/* Cross-system indicator */}
      {connection.isCrossSystem && (
        <Circle
          x={labelPosition.x}
          y={labelPosition.y}
          radius={6}
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={1}
          listening={false}
        />
      )}

      {/* Debug: Show exact endpoint positions (uncomment for debugging) */}
      {/*
      <Circle x={sourcePos.x} y={sourcePos.y} radius={3} fill="red" listening={false} />
      <Circle x={targetPos.x} y={targetPos.y} radius={3} fill="blue" listening={false} />
      */}
    </Group>
  );
};

// ============================================================================
// Connection Preview (while drawing) - 90 Degree Only
// ============================================================================

const ConnectionPreview: React.FC<{ points: Point[] }> = ({ points }) => {
  if (points.length < 2) return null;

  // Convert to orthogonal path
  const orthogonalPoints = calculateOrthogonalPreview(points);
  const flatPoints = orthogonalPoints.flatMap(p => [p.x, p.y]);

  return (
    <Line
      points={flatPoints}
      stroke={PREVIEW_STYLE.stroke}
      strokeWidth={PREVIEW_STYLE.strokeWidth}
      dash={PREVIEW_STYLE.dash}
      opacity={PREVIEW_STYLE.opacity}
      lineCap="round"
      lineJoin="round"
      listening={false}
    />
  );
};

// ============================================================================
// Alignment Guides - Shows guide to nearest aligned port only
// ============================================================================

interface AlignmentGuidesProps {
  cursorPos: Point;
  portPositions: Point[];
  stageWidth: number;
  stageHeight: number;
}

const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({
  cursorPos,
  portPositions,
}) => {
  // Find the closest port for X alignment and Y alignment
  let closestX: { port: Point; dist: number } | null = null;
  let closestY: { port: Point; dist: number } | null = null;

  portPositions.forEach((portPos) => {
    const dx = Math.abs(portPos.x - cursorPos.x);
    const dy = Math.abs(portPos.y - cursorPos.y);

    // Check X alignment (for vertical guide)
    if (dx < ALIGNMENT_THRESHOLD) {
      if (!closestX || dx < closestX.dist) {
        closestX = { port: portPos, dist: dx };
      }
    }

    // Check Y alignment (for horizontal guide)
    if (dy < ALIGNMENT_THRESHOLD) {
      if (!closestY || dy < closestY.dist) {
        closestY = { port: portPos, dist: dy };
      }
    }
  });

  return (
    <>
      {/* Vertical guide to nearest X-aligned port */}
      {closestX && (
        <>
          <Line
            points={[closestX.port.x, -5000, closestX.port.x, 5000]}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={ALIGNMENT_GUIDE_STYLE.strokeWidth}
            dash={ALIGNMENT_GUIDE_STYLE.dash}
            opacity={ALIGNMENT_GUIDE_STYLE.opacity}
            listening={false}
          />
          <Circle
            x={closestX.port.x}
            y={closestX.port.y}
            radius={5}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={2}
            listening={false}
          />
        </>
      )}

      {/* Horizontal guide to nearest Y-aligned port */}
      {closestY && (
        <>
          <Line
            points={[-5000, closestY.port.y, 5000, closestY.port.y]}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={ALIGNMENT_GUIDE_STYLE.strokeWidth}
            dash={ALIGNMENT_GUIDE_STYLE.dash}
            opacity={ALIGNMENT_GUIDE_STYLE.opacity}
            listening={false}
          />
          <Circle
            x={closestY.port.x}
            y={closestY.port.y}
            radius={5}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={2}
            listening={false}
          />
        </>
      )}
    </>
  );
};

// ============================================================================
// Connections Layer Component
// ============================================================================

export const ConnectionsLayer: React.FC = () => {
  // Store state
  const diagram = useDiagramStore(state => state.diagram);

  const connections = useMemo(
    () => (diagram ? Object.values(diagram.connections) : []),
    [diagram]
  );

  const components = useMemo(
    () => diagram?.components || {},
    [diagram?.components]
  );

  // UI state
  const selection = useUIStore(state => state.selection);
  const isDrawingConnection = useUIStore(state => state.isDrawingConnection);
  const connectionPreviewPoints = useUIStore(state => state.connectionPreviewPoints);
  const select = useUIStore(state => state.select);
  const addToSelection = useUIStore(state => state.addToSelection);

  // Calculate all port positions for alignment guides
  const allPortPositions = useMemo(() => {
    const positions: Point[] = [];
    Object.values(components).forEach((component: Component) => {
      if (!component.ports) return;
      component.ports.forEach(port => {
        const worldPos = getPortWorldPosition(component, port);
        positions.push(worldPos);
      });
    });
    return positions;
  }, [components]);

  // Get cursor position (last point in preview)
  const cursorPos = useMemo(() => {
    if (connectionPreviewPoints.length > 0) {
      return connectionPreviewPoints[connectionPreviewPoints.length - 1];
    }
    return null;
  }, [connectionPreviewPoints]);

  // Drag state for moving connections with components
  const isDraggingSelection = useUIStore(state => state.isDraggingSelection);
  const dragSelectionDelta = useUIStore(state => state.dragSelectionDelta);
  const draggedSelectionKks = useUIStore(state => state.draggedSelectionKks);

  const [hoveredConnectionKks, setHoveredConnectionKks] = useState<string | null>(null);

  // Handle connection selection
  const handleConnectionSelect = useCallback(
    (id: string, e: KonvaEventObject<MouseEvent>) => {
      if (e.evt.shiftKey || e.evt.ctrlKey) {
        addToSelection([], [id]);
      } else {
        select([], [id]);
      }
    },
    [select, addToSelection]
  );

  // Render all connections - not memoized to ensure drag updates work correctly
  const renderedConnections = connections.map(connection => {
    const sourceComponent = components[connection.sourceComponentKks];
    const targetComponent = components[connection.targetComponentKks];

    if (!sourceComponent || !targetComponent) {
      console.warn(`Missing component for connection ${connection.kks}`);
      return null;
    }

    // Find ports on components
    const sourcePort = findPort(sourceComponent, connection.sourcePortId);
    const targetPort = findPort(targetComponent, connection.targetPortId);

    if (!sourcePort || !targetPort) {
      console.warn(`Missing port for connection ${connection.kks}`);
      return null;
    }

    // Calculate EXACT port world positions using centralized calculator
    let sourcePos = getPortWorldPosition(sourceComponent, sourcePort);
    let targetPos = getPortWorldPosition(targetComponent, targetPort);
    let adjustedWaypoints = connection.waypoints;

    // Apply drag offset if the connected components are being dragged
    if (isDraggingSelection && draggedSelectionKks.length > 0) {
      const sourceIsDragged = draggedSelectionKks.includes(connection.sourceComponentKks);
      const targetIsDragged = draggedSelectionKks.includes(connection.targetComponentKks);

      if (sourceIsDragged) {
        sourcePos = {
          x: sourcePos.x + dragSelectionDelta.x,
          y: sourcePos.y + dragSelectionDelta.y,
        };
      }
      if (targetIsDragged) {
        targetPos = {
          x: targetPos.x + dragSelectionDelta.x,
          y: targetPos.y + dragSelectionDelta.y,
        };
      }

      // If BOTH components are being dragged, move waypoints too
      if (sourceIsDragged && targetIsDragged && connection.waypoints.length > 0) {
        adjustedWaypoints = connection.waypoints.map(wp => ({
          x: wp.x + dragSelectionDelta.x,
          y: wp.y + dragSelectionDelta.y,
        }));
      }
    }

    const isSelected = selection.connectionIds.includes(connection.id);
    const isHovered = hoveredConnectionKks === connection.id;

    // Create adjusted connection with moved waypoints for rendering
    const adjustedConnection = adjustedWaypoints !== connection.waypoints
      ? { ...connection, waypoints: adjustedWaypoints }
      : connection;

    return (
      <ConnectionLine
        key={connection.id}
        connection={adjustedConnection}
        sourcePos={sourcePos}
        targetPos={targetPos}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={() =>
          handleConnectionSelect(connection.id, {
            evt: { shiftKey: false, ctrlKey: false },
          } as KonvaEventObject<MouseEvent>)
        }
        onHover={hovered => setHoveredConnectionKks(hovered ? connection.id : null)}
      />
    );
  });

  return (
    <Layer>
      {/* Render all connections */}
      {renderedConnections}

      {/* Alignment guides when drawing */}
      {isDrawingConnection && cursorPos && (
        <AlignmentGuides
          cursorPos={cursorPos}
          portPositions={allPortPositions}
          stageWidth={5000}
          stageHeight={5000}
        />
      )}

      {/* Connection preview while drawing */}
      {isDrawingConnection && connectionPreviewPoints.length > 0 && (
        <ConnectionPreview points={connectionPreviewPoints} />
      )}
    </Layer>
  );
};

export default ConnectionsLayer;
