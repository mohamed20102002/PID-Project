/**
 * Connections Layer
 *
 * Renders all pipe connections between components.
 * Uses PortCalculator for 100% accurate port position calculations.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Layer, Line, Circle, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore } from '../../store/uiStore';
import {
  getPortWorldPosition,
  findPort,
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

// Light mode styles
const LIGHT_PIPE_STYLES = {
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

// Dark mode styles - bright white glowing pipes
const DARK_PIPE_STYLES = {
  pipe: {
    stroke: '#ffffff',
    strokeWidth: 2.5,
    shadowColor: '#ffffff',
    shadowBlur: 15,
    shadowOpacity: 1,
  },
  signal: {
    stroke: '#93c5fd',
    strokeWidth: 2,
    dash: [8, 4],
    shadowColor: '#93c5fd',
    shadowBlur: 12,
    shadowOpacity: 0.9,
  },
};

const LIGHT_SELECTED_STYLE = {
  stroke: '#2563eb',
  strokeWidth: 3,
};

const DARK_SELECTED_STYLE = {
  stroke: '#ffffff',
  strokeWidth: 3.5,
  shadowColor: '#60a5fa',
  shadowBlur: 20,
  shadowOpacity: 1,
};

const LIGHT_HOVERED_STYLE = {
  stroke: '#3b82f6',
  strokeWidth: 2.5,
};

const DARK_HOVERED_STYLE = {
  stroke: '#ffffff',
  strokeWidth: 3,
  shadowColor: '#93c5fd',
  shadowBlur: 18,
  shadowOpacity: 1,
};

const PREVIEW_STYLE = {
  stroke: '#10b981',
  strokeWidth: 2,
  dash: [6, 4],
  opacity: 0.8,
};

// KKS Highlight style interface (values come from uiStore)
interface KksHighlightStyle {
  color: string;
  strokeWidth: number;
  glowIntensity: number;
}

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

// Dark mode pipe style interface
interface DarkModePipeStyle {
  color: string;
  strokeWidth: number;
  glowBlur: number;
  glowOpacity: number;
}

interface ConnectionLineProps {
  connection: Connection;
  sourcePos: Point;
  targetPos: Point;
  isSelected: boolean;
  isHovered: boolean;
  isKksHighlighted: boolean;
  kksHighlightStyle: KksHighlightStyle;
  kksHideOpacity: number;
  darkMode: boolean;
  darkModePipeStyle: DarkModePipeStyle;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  sourcePos,
  targetPos,
  isSelected,
  isHovered,
  isKksHighlighted,
  kksHighlightStyle,
  kksHideOpacity,
  darkMode,
  darkModePipeStyle,
  onSelect,
  onHover,
}) => {
  // Calculate the path points
  const pathPoints = useMemo(
    () => calculatePipePath(sourcePos, targetPos, connection.waypoints),
    [sourcePos, targetPos, connection.waypoints]
  );

  // Select styles based on dark mode - use dynamic settings from store
  const PIPE_STYLES = darkMode ? {
    pipe: {
      stroke: darkModePipeStyle.color,
      strokeWidth: darkModePipeStyle.strokeWidth,
      shadowColor: darkModePipeStyle.color,
      shadowBlur: darkModePipeStyle.glowBlur,
      shadowOpacity: darkModePipeStyle.glowOpacity,
    },
    signal: {
      stroke: '#93c5fd',
      strokeWidth: darkModePipeStyle.strokeWidth,
      dash: [8, 4],
      shadowColor: '#93c5fd',
      shadowBlur: darkModePipeStyle.glowBlur,
      shadowOpacity: darkModePipeStyle.glowOpacity,
    },
  } : LIGHT_PIPE_STYLES;

  const SELECTED_STYLE = darkMode ? {
    stroke: darkModePipeStyle.color,
    strokeWidth: darkModePipeStyle.strokeWidth + 1,
    shadowColor: '#60a5fa',
    shadowBlur: darkModePipeStyle.glowBlur + 5,
    shadowOpacity: 1,
  } : LIGHT_SELECTED_STYLE;

  const HOVERED_STYLE = darkMode ? {
    stroke: darkModePipeStyle.color,
    strokeWidth: darkModePipeStyle.strokeWidth + 0.5,
    shadowColor: '#93c5fd',
    shadowBlur: darkModePipeStyle.glowBlur + 3,
    shadowOpacity: darkModePipeStyle.glowOpacity,
  } : LIGHT_HOVERED_STYLE;

  // Determine styles
  const baseStyle = connection.type === 'signal' ? PIPE_STYLES.signal : PIPE_STYLES.pipe;
  const customColor = connection.style?.strokeColor || baseStyle.stroke;
  const customWidth = connection.style?.strokeWidth || baseStyle.strokeWidth;
  const customDash = connection.style?.strokeDash || ('dash' in baseStyle ? baseStyle.dash : undefined);

  // Get the current style for shadow properties (based on state)
  const currentStyle = isSelected
    ? SELECTED_STYLE
    : isHovered
    ? HOVERED_STYLE
    : baseStyle;

  // Apply selection/hover/highlight overrides
  const displayColor = isKksHighlighted
    ? kksHighlightStyle.color
    : isSelected
    ? SELECTED_STYLE.stroke
    : isHovered
    ? HOVERED_STYLE.stroke
    : customColor;
  const displayWidth = isKksHighlighted
    ? kksHighlightStyle.strokeWidth
    : isSelected
    ? SELECTED_STYLE.strokeWidth
    : isHovered
    ? HOVERED_STYLE.strokeWidth
    : customWidth;

  // Dark mode glow properties - use dynamic settings
  const darkModeGlow = darkMode && !isKksHighlighted ? {
    shadowColor: 'shadowColor' in currentStyle ? (currentStyle as any).shadowColor : darkModePipeStyle.color,
    shadowBlur: 'shadowBlur' in currentStyle ? (currentStyle as any).shadowBlur : darkModePipeStyle.glowBlur,
    shadowOpacity: 'shadowOpacity' in currentStyle ? (currentStyle as any).shadowOpacity : darkModePipeStyle.glowOpacity,
    shadowEnabled: true,
  } : {
    shadowEnabled: false,
  };

  // Calculate glow properties from intensity (0-100)
  const glowWidth = kksHighlightStyle.strokeWidth + (kksHighlightStyle.glowIntensity / 100) * 12;
  const glowOpacity = (kksHighlightStyle.glowIntensity / 100) * 0.6;
  const glowBlur = (kksHighlightStyle.glowIntensity / 100) * 20;

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
    <Group opacity={kksHideOpacity}>
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

      {/* KKS Highlight glow effect (outer glow) */}
      {isKksHighlighted && kksHighlightStyle.glowIntensity > 0 && (
        <Line
          points={pathPoints}
          stroke={kksHighlightStyle.color}
          strokeWidth={glowWidth}
          opacity={glowOpacity}
          lineCap="round"
          lineJoin="round"
          listening={false}
          shadowColor={kksHighlightStyle.color}
          shadowBlur={glowBlur}
          shadowEnabled={true}
        />
      )}

      {/* Visible pipe line */}
      <Line
        points={pathPoints}
        stroke={displayColor}
        strokeWidth={displayWidth}
        dash={isKksHighlighted ? undefined : (customDash as number[] | undefined)}
        lineCap="round"
        lineJoin="round"
        listening={false}
        shadowColor={isKksHighlighted ? kksHighlightStyle.color : darkModeGlow.shadowColor}
        shadowBlur={isKksHighlighted ? glowBlur * 0.4 : (darkModeGlow.shadowBlur || 0)}
        shadowOpacity={darkModeGlow.shadowOpacity}
        shadowEnabled={isKksHighlighted ? kksHighlightStyle.glowIntensity > 0 : darkModeGlow.shadowEnabled}
      />

      {/* Pipe labels - show label always, KKS above when selected */}
      {(connection.label || (isSelected && connection.kks)) && (() => {
        // Position above the horizontal segment
        const offsetDistance = 18;
        const labelX = labelPosition.x;
        const baseY = labelPosition.y - offsetDistance;
        const labelRotation = connection.labelRotation || 0;

        const hasKks = isSelected && connection.kks && connection.kks.trim().length > 0;
        const labelText = connection.label;
        const hasLabel = labelText && labelText.trim().length > 0;

        return (
          <Group
            x={labelX}
            y={baseY}
            rotation={labelRotation}
          >
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
                x={0}
                y={hasLabel ? -10 : 0}
                offsetX={connection.kks.length * 2.7}
                listening={false}
              />
            )}

            {/* Label - always shown when available */}
            {hasLabel && (
              <Text
                text={labelText}
                fontSize={11}
                fontFamily="system-ui, sans-serif"
                fontStyle="bold"
                fill={customColor}
                opacity={0.9}
                align="center"
                verticalAlign="middle"
                x={0}
                y={0}
                offsetX={labelText.length * 3.3}
                listening={false}
              />
            )}
          </Group>
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

// Memoize ConnectionLine to prevent unnecessary re-renders
const MemoizedConnectionLine = React.memo(ConnectionLine, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.connection.kks === nextProps.connection.kks &&
    prevProps.connection.waypoints === nextProps.connection.waypoints &&
    prevProps.sourcePos.x === nextProps.sourcePos.x &&
    prevProps.sourcePos.y === nextProps.sourcePos.y &&
    prevProps.targetPos.x === nextProps.targetPos.x &&
    prevProps.targetPos.y === nextProps.targetPos.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isKksHighlighted === nextProps.isKksHighlighted &&
    prevProps.kksHideOpacity === nextProps.kksHideOpacity &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.darkModePipeStyle.color === nextProps.darkModePipeStyle.color &&
    prevProps.darkModePipeStyle.strokeWidth === nextProps.darkModePipeStyle.strokeWidth &&
    prevProps.darkModePipeStyle.glowBlur === nextProps.darkModePipeStyle.glowBlur &&
    prevProps.darkModePipeStyle.glowOpacity === nextProps.darkModePipeStyle.glowOpacity &&
    prevProps.kksHighlightStyle.color === nextProps.kksHighlightStyle.color &&
    prevProps.kksHighlightStyle.strokeWidth === nextProps.kksHighlightStyle.strokeWidth &&
    prevProps.kksHighlightStyle.glowIntensity === nextProps.kksHighlightStyle.glowIntensity
  );
});

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
  const alignmentData = useMemo((): { closestXPort: Point | null; closestYPort: Point | null } => {
    let closestXPort: Point | null = null;
    let closestXDist = Infinity;
    let closestYPort: Point | null = null;
    let closestYDist = Infinity;

    for (const portPos of portPositions) {
      const dx = Math.abs(portPos.x - cursorPos.x);
      const dy = Math.abs(portPos.y - cursorPos.y);

      // Check X alignment (for vertical guide)
      if (dx < ALIGNMENT_THRESHOLD && dx < closestXDist) {
        closestXPort = portPos;
        closestXDist = dx;
      }

      // Check Y alignment (for horizontal guide)
      if (dy < ALIGNMENT_THRESHOLD && dy < closestYDist) {
        closestYPort = portPos;
        closestYDist = dy;
      }
    }

    return { closestXPort, closestYPort };
  }, [cursorPos, portPositions]);

  const { closestXPort, closestYPort } = alignmentData;

  return (
    <>
      {/* Vertical guide to nearest X-aligned port */}
      {closestXPort && (
        <>
          <Line
            points={[closestXPort.x, -5000, closestXPort.x, 5000]}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={ALIGNMENT_GUIDE_STYLE.strokeWidth}
            dash={ALIGNMENT_GUIDE_STYLE.dash}
            opacity={ALIGNMENT_GUIDE_STYLE.opacity}
            listening={false}
          />
          <Circle
            x={closestXPort.x}
            y={closestXPort.y}
            radius={5}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={2}
            listening={false}
          />
        </>
      )}

      {/* Horizontal guide to nearest Y-aligned port */}
      {closestYPort && (
        <>
          <Line
            points={[-5000, closestYPort.y, 5000, closestYPort.y]}
            stroke={ALIGNMENT_GUIDE_STYLE.stroke}
            strokeWidth={ALIGNMENT_GUIDE_STYLE.strokeWidth}
            dash={ALIGNMENT_GUIDE_STYLE.dash}
            opacity={ALIGNMENT_GUIDE_STYLE.opacity}
            listening={false}
          />
          <Circle
            x={closestYPort.x}
            y={closestYPort.y}
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
  const canvasDarkMode = useUIStore(state => state.canvasDarkMode);

  // Dark mode pipe settings
  const darkModePipeColor = useUIStore(state => state.darkModePipeColor);
  const darkModePipeStrokeWidth = useUIStore(state => state.darkModePipeStrokeWidth);
  const darkModePipeGlowBlur = useUIStore(state => state.darkModePipeGlowBlur);
  const darkModePipeGlowOpacity = useUIStore(state => state.darkModePipeGlowOpacity);

  // Memoized dark mode pipe style
  const darkModePipeStyle = useMemo(() => ({
    color: darkModePipeColor,
    strokeWidth: darkModePipeStrokeWidth,
    glowBlur: darkModePipeGlowBlur,
    glowOpacity: darkModePipeGlowOpacity,
  }), [darkModePipeColor, darkModePipeStrokeWidth, darkModePipeGlowBlur, darkModePipeGlowOpacity]);

  // KKS Pipe Highlighting state
  const kksHighlightEnabled = useUIStore(state => state.kksHighlightEnabled);
  const kksHighlightSegment = useUIStore(state => state.kksHighlightSegment);
  const kksHighlightColor = useUIStore(state => state.kksHighlightColor);
  const kksHighlightStrokeWidth = useUIStore(state => state.kksHighlightStrokeWidth);
  const kksHighlightGlowIntensity = useUIStore(state => state.kksHighlightGlowIntensity);
  const kksHideNonMatching = useUIStore(state => state.kksHideNonMatching);

  // Memoized highlight style object
  const kksHighlightStyle = useMemo(() => ({
    color: kksHighlightColor,
    strokeWidth: kksHighlightStrokeWidth,
    glowIntensity: kksHighlightGlowIntensity,
  }), [kksHighlightColor, kksHighlightStrokeWidth, kksHighlightGlowIntensity]);

  // Compute set of component KKS that match the highlight segment
  // Excludes "Additional Components" (category: additional) from KKS matching
  const highlightedComponentKks = useMemo(() => {
    if (!kksHighlightEnabled || !kksHighlightSegment.trim()) return new Set<string>();

    const segment = kksHighlightSegment.trim().toUpperCase();
    const matchingKks = new Set<string>();

    Object.values(components).forEach((comp: Component) => {
      // Skip "Additional Components" category (auto-generated KKS)
      const isAdditionalComponent = comp.type.startsWith('additional:');

      if (!isAdditionalComponent && comp.kks.toUpperCase().includes(segment)) {
        matchingKks.add(comp.kks);
      }
    });

    return matchingKks;
  }, [kksHighlightEnabled, kksHighlightSegment, components]);

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

    const isSelected = selection.connectionKks.includes(connection.kks);
    const isHovered = hoveredConnectionKks === connection.kks;

    // Check if this pipe should be highlighted (connected to a matching component)
    const isKksHighlighted = highlightedComponentKks.has(connection.sourceComponentKks) ||
                              highlightedComponentKks.has(connection.targetComponentKks);

    // Calculate opacity for non-matching pipes when hide mode is on
    const shouldHideForKks = kksHighlightEnabled && kksHideNonMatching && highlightedComponentKks.size > 0;
    const kksHideOpacity = shouldHideForKks && !isKksHighlighted && !isSelected ? 0.1 : 1;

    // Create adjusted connection with moved waypoints for rendering
    const adjustedConnection = adjustedWaypoints !== connection.waypoints
      ? { ...connection, waypoints: adjustedWaypoints }
      : connection;

    return (
      <MemoizedConnectionLine
        key={connection.kks}
        connection={adjustedConnection}
        sourcePos={sourcePos}
        targetPos={targetPos}
        isSelected={isSelected}
        isHovered={isHovered}
        isKksHighlighted={isKksHighlighted}
        kksHighlightStyle={kksHighlightStyle}
        kksHideOpacity={kksHideOpacity}
        darkMode={canvasDarkMode}
        darkModePipeStyle={darkModePipeStyle}
        onSelect={() =>
          handleConnectionSelect(connection.kks, {
            evt: { shiftKey: false, ctrlKey: false },
          } as KonvaEventObject<MouseEvent>)
        }
        onHover={hovered => setHoveredConnectionKks(hovered ? connection.kks : null)}
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
