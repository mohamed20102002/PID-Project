/**
 * BaseSymbol Component
 *
 * Renders a P&ID symbol from its definition on the Konva canvas.
 * Handles all path types, ports, labels, and interaction states.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { Group, Line, Circle, Rect, Text, Ellipse } from 'react-konva';
import { SymbolDefinition, SymbolPath, PortDefinition, LabelDefinition } from '../../../types/symbol.types';
import { Component, ComponentRotation } from '../../../types/diagram.types';
import { AppMode } from '../../../store/uiStore';

interface BaseSymbolProps {
  definition: SymbolDefinition;
  component: Component;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isHighlighted?: boolean;
  showPorts?: boolean;
  mode?: AppMode;
  darkMode?: boolean;
  onPortClick?: (portId: string) => void;
  onPortHover?: (portId: string | null) => void;
}

// Light mode colors
const LIGHT_COLORS = {
  stroke: '#1a1a1a',
  fill: '#ffffff',
  selectedStroke: '#2563eb',
  hoveredStroke: '#3b82f6',
  highlightStroke: '#f59e0b',
  highlightFill: 'rgba(245, 158, 11, 0.3)',
  portStroke: '#059669',
  portFill: '#10b981',
  portHoverFill: '#34d399',
  labelColor: '#374151',
};

// Dark mode colors
const DARK_COLORS = {
  stroke: '#e5e7eb',
  fill: '#374151',
  selectedStroke: '#60a5fa',
  hoveredStroke: '#93c5fd',
  highlightStroke: '#fbbf24',
  highlightFill: 'rgba(251, 191, 36, 0.3)',
  portStroke: '#10b981',
  portFill: '#34d399',
  portHoverFill: '#6ee7b7',
  labelColor: '#e5e7eb',
};

// Default colors (for backward compatibility)
const COLORS = LIGHT_COLORS;

/**
 * Render a single path element
 */
const renderPath = (
  path: SymbolPath,
  index: number,
  width: number,
  height: number,
  strokeColor: string,
  fillColor: string
): React.ReactNode => {
  const style = {
    stroke: path.style.stroke === 'inherit' ? strokeColor : path.style.stroke,
    strokeWidth: path.style.strokeWidth || 2,
    fill: path.style.fill === 'inherit' ? fillColor : path.style.fill,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  };

  switch (path.type) {
    case 'line': {
      const { x1, y1, x2, y2 } = path.data as { x1: number; y1: number; x2: number; y2: number };
      return (
        <Line
          key={`line-${index}`}
          points={[x1 * width, y1 * height, x2 * width, y2 * height]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          lineCap={style.lineCap}
        />
      );
    }

    case 'polyline': {
      const { points } = path.data as { points: { x: number; y: number }[] };
      const flatPoints = points.flatMap((p) => [p.x * width, p.y * height]);
      return (
        <Line
          key={`polyline-${index}`}
          points={flatPoints}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={style.fill}
          closed={false}
          lineCap={style.lineCap}
          lineJoin={style.lineJoin}
        />
      );
    }

    case 'polygon': {
      const { points } = path.data as { points: { x: number; y: number }[] };
      const flatPoints = points.flatMap((p) => [p.x * width, p.y * height]);
      return (
        <Line
          key={`polygon-${index}`}
          points={flatPoints}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={style.fill}
          closed={true}
          lineCap={style.lineCap}
          lineJoin={style.lineJoin}
        />
      );
    }

    case 'circle': {
      const { cx, cy, r } = path.data as { cx: number; cy: number; r: number };
      const radius = Math.min(width, height) * r;
      return (
        <Circle
          key={`circle-${index}`}
          x={cx * width}
          y={cy * height}
          radius={radius}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={style.fill}
        />
      );
    }

    case 'ellipse': {
      const { cx, cy, rx, ry } = path.data as { cx: number; cy: number; rx: number; ry: number };
      return (
        <Ellipse
          key={`ellipse-${index}`}
          x={cx * width}
          y={cy * height}
          radiusX={rx * width}
          radiusY={ry * height}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={style.fill}
        />
      );
    }

    case 'rect': {
      const { x, y, width: w, height: h, rx, ry } = path.data as {
        x: number;
        y: number;
        width: number;
        height: number;
        rx?: number;
        ry?: number;
      };
      return (
        <Rect
          key={`rect-${index}`}
          x={x * width}
          y={y * height}
          width={w * width}
          height={h * height}
          cornerRadius={rx ? rx * Math.min(width, height) : 0}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={style.fill}
        />
      );
    }

    case 'arc': {
      const { x, y, innerRadius, outerRadius, startAngle, endAngle } = path.data as {
        x: number;
        y: number;
        innerRadius: number;
        outerRadius: number;
        startAngle: number;
        endAngle: number;
      };
      const cx = x * width;
      const cy = y * height;
      const outer = Math.min(width, height) * outerRadius;
      const inner = Math.min(width, height) * innerRadius;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Generate arc points
      const points: number[] = [];
      const steps = 50;

      // Outer arc
      for (let i = 0; i <= steps; i++) {
        const angle = startRad + (endRad - startRad) * (i / steps);
        points.push(cx + outer * Math.cos(angle));
        points.push(cy + outer * Math.sin(angle));
      }

      // If there's an inner radius (ring/donut arc), add return path
      if (inner > 0) {
        for (let i = steps; i >= 0; i--) {
          const angle = startRad + (endRad - startRad) * (i / steps);
          points.push(cx + inner * Math.cos(angle));
          points.push(cy + inner * Math.sin(angle));
        }
      }

      return (
        <Line
          key={`arc-${index}`}
          points={points}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={inner > 0 && style.fill !== 'transparent' ? style.fill : 'transparent'}
          closed={inner > 0}
          lineCap={style.lineCap}
        />
      );
    }

    case 'path': {
      // SVG path data - simplified rendering using points
      // For complex paths, we'd need a proper SVG path parser
      console.warn('SVG path type not fully supported, using fallback');
      return null;
    }

    default:
      console.warn(`Unknown path type: ${path.type}`);
      return null;
  }
};

/**
 * Render directional arrow for terminal ports
 */
const renderPortArrow = (
  x: number,
  y: number,
  portId: string,
  direction: 'in' | 'out' | 'both' | 'none',
  portAngle: number // 0=right, 90=down, 180=left, 270=up
): React.ReactNode[] => {
  if (direction === 'none') return [];

  const arrowSize = 8;
  const arrowOffset = 12; // Distance from port center
  const arrows: React.ReactNode[] = [];

  // Calculate arrow position based on port angle (pointing outward from component)
  const rad = (portAngle * Math.PI) / 180;
  const arrowX = x + Math.cos(rad) * arrowOffset;
  const arrowY = y + Math.sin(rad) * arrowOffset;

  // Arrow pointing outward (for 'out' direction)
  const outArrowPoints = [
    arrowX - Math.cos(rad) * arrowSize + Math.sin(rad) * arrowSize * 0.5,
    arrowY - Math.sin(rad) * arrowSize - Math.cos(rad) * arrowSize * 0.5,
    arrowX,
    arrowY,
    arrowX - Math.cos(rad) * arrowSize - Math.sin(rad) * arrowSize * 0.5,
    arrowY - Math.sin(rad) * arrowSize + Math.cos(rad) * arrowSize * 0.5,
  ];

  // Arrow pointing inward (for 'in' direction)
  const inArrowPoints = [
    arrowX + Math.cos(rad) * arrowSize * 0.5 + Math.sin(rad) * arrowSize * 0.5,
    arrowY + Math.sin(rad) * arrowSize * 0.5 - Math.cos(rad) * arrowSize * 0.5,
    arrowX - Math.cos(rad) * arrowSize * 0.5,
    arrowY - Math.sin(rad) * arrowSize * 0.5,
    arrowX + Math.cos(rad) * arrowSize * 0.5 - Math.sin(rad) * arrowSize * 0.5,
    arrowY + Math.sin(rad) * arrowSize * 0.5 + Math.cos(rad) * arrowSize * 0.5,
  ];

  if (direction === 'out' || direction === 'both') {
    arrows.push(
      <Line
        key={`arrow-out-${portId}`}
        points={outArrowPoints}
        stroke="#6366f1"
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    );
  }

  if (direction === 'in' || direction === 'both') {
    const offsetMultiplier = direction === 'both' ? 1.8 : 1;
    const inX = x + Math.cos(rad) * arrowOffset * offsetMultiplier;
    const inY = y + Math.sin(rad) * arrowOffset * offsetMultiplier;
    const adjustedInArrowPoints = [
      inX + Math.sin(rad) * arrowSize * 0.5,
      inY - Math.cos(rad) * arrowSize * 0.5,
      inX - Math.cos(rad) * arrowSize * 0.5,
      inY - Math.sin(rad) * arrowSize * 0.5,
      inX - Math.sin(rad) * arrowSize * 0.5,
      inY + Math.cos(rad) * arrowSize * 0.5,
    ];
    arrows.push(
      <Line
        key={`arrow-in-${portId}`}
        points={adjustedInArrowPoints}
        stroke="#6366f1"
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    );
  }

  return arrows;
};

/**
 * Render a connection port
 */
const renderPort = (
  port: PortDefinition,
  index: number,
  width: number,
  height: number,
  showPorts: boolean,
  hoveredPort: string | null,
  onPortClick?: (portId: string) => void,
  onPortHover?: (portId: string | null) => void,
  portDirection?: 'in' | 'out' | 'both' | 'none',
  isTerminal?: boolean,
  colors: typeof LIGHT_COLORS = LIGHT_COLORS
): React.ReactNode => {
  if (!showPorts && !isTerminal) return null;

  const x = port.relativePosition.x * width;
  const y = port.relativePosition.y * height;
  const isHovered = hoveredPort === port.id;
  const radius = isHovered ? 6 : 5;

  // For terminals, render arrows based on port direction
  const arrows = isTerminal && portDirection && portDirection !== 'none'
    ? renderPortArrow(x, y, port.id, portDirection, port.defaultAngle || 0)
    : [];

  return (
    <Group key={`port-group-${port.id}-${index}`}>
      {/* Port circle */}
      {(showPorts || isHovered) && (
        <Circle
          x={x}
          y={y}
          radius={radius}
          stroke={colors.portStroke}
          strokeWidth={2}
          fill={isHovered ? colors.portHoverFill : colors.portFill}
          opacity={0.9}
          onClick={() => onPortClick?.(port.id)}
          onTap={() => onPortClick?.(port.id)}
          onMouseEnter={() => onPortHover?.(port.id)}
          onMouseLeave={() => onPortHover?.(null)}
          hitStrokeWidth={10}
        />
      )}
      {/* Direction arrows for terminals */}
      {arrows}
    </Group>
  );
};

/**
 * Helper to wrap KKS text - splits after 7 characters
 * Example: "10KBA10AA001" -> "10KBA10\nAA001"
 */
const wrapKksText = (text: string, splitPosition: number = 7): string => {
  if (text.length <= splitPosition) {
    return text;
  }
  const firstLine = text.substring(0, splitPosition);
  const secondLine = text.substring(splitPosition);
  return `${firstLine}\n${secondLine}`;
};

/**
 * Render a label
 * - Counter-flips text to keep it readable when symbol is flipped (not mirrored)
 * - Text rotates WITH the symbol at 90° and 270°
 * - Text is counter-rotated at 180° to stay readable (not upside down)
 * - Supports automatic KKS wrapping with component.wrapLabel (splits after 7 chars)
 */
const renderLabel = (
  label: LabelDefinition,
  index: number,
  width: number,
  height: number,
  component: Component,
  flipX: boolean = false,
  flipY: boolean = false,
  componentRotation: number = 0,
  colors: typeof LIGHT_COLORS = LIGHT_COLORS
): React.ReactNode => {
  const x = label.relativePosition.x * width;
  const y = label.relativePosition.y * height;

  // Get label value from component properties or KKS
  let text = '';
  if (label.binding === 'kks') {
    // For terminals, show only the base KKS (without the -terminalId suffix)
    const isTerminal = component.type.startsWith('terminals:');
    const props = component.properties as Record<string, string>;
    const terminalId = isTerminal ? (props.terminalId || '') : '';

    if (isTerminal && terminalId && component.kks.endsWith(`-${terminalId}`)) {
      // Extract base KKS by removing the terminal ID suffix
      text = component.kks.slice(0, -(terminalId.length + 1));
    } else {
      text = component.kks || '';
    }
  } else if (label.binding === 'letterCode') {
    text = (component.properties as Record<string, unknown>).letterCode as string || '';
  } else if (label.binding) {
    text = (component.properties as Record<string, unknown>)[label.binding] as string || '';
  }

  if (!text) return null;

  const fontSize = label.style?.fontSize || 10;
  const fontWeight = label.style?.fontWeight || 'normal';
  const labelRotation = label.rotation || 0;

  // Check if component has wrapLabel enabled (per-component setting)
  const shouldWrapKks = component.wrapLabel === true && label.binding === 'kks';

  // Apply KKS wrapping if enabled on the component (splits after 7 characters)
  const displayText = shouldWrapKks ? wrapKksText(text, 7) : text;

  // Count lines for vertical positioning
  const lineCount = displayText.split('\n').length;
  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lineCount * lineHeight;

  // Calculate offset based on anchor (for single-line text)
  let offsetX = 0;
  if (!shouldWrapKks) {
    if (label.anchor === 'middle') {
      offsetX = -text.length * fontSize * 0.3; // Approximate center
    } else if (label.anchor === 'end') {
      offsetX = -text.length * fontSize * 0.6;
    }
  }

  // Counter-flip the text so it remains readable (not mirrored) when the symbol is flipped
  const counterScaleX = flipX ? -1 : 1;
  const counterScaleY = flipY ? -1 : 1;

  // Normalize rotation to 0-360 range
  const normalizedRotation = ((componentRotation % 360) + 360) % 360;

  // Counter-rotate text by 180° when symbol is at 180° to keep text readable (not upside down)
  // At 90° and 270°, text rotates with symbol (sideways is acceptable)
  const isUpsideDown = normalizedRotation > 135 && normalizedRotation < 225;
  const textCounterRotation = isUpsideDown ? 180 : 0;

  // Final rotation combines label's own rotation with counter-rotation for readability
  const finalRotation = labelRotation + textCounterRotation;

  // Check if we need any transformation
  const needsTransform = flipX || flipY || finalRotation !== 0;

  // Common text props
  const textProps = {
    text: displayText,
    fontSize,
    fontStyle: fontWeight === 'bold' ? 'bold' as const : 'normal' as const,
    fill: label.style?.color || colors.labelColor,
    align: shouldWrapKks ? 'center' as const : (label.anchor || 'start' as const),
    lineHeight: 1.2,
  };

  // For wrapped KKS, estimate width based on first line
  const wrappedWidth = shouldWrapKks ? Math.max(7, text.length - 7) * fontSize * 0.6 : 0;

  if (needsTransform) {
    return (
      <Group
        key={`label-group-${label.id}-${index}`}
        x={x}
        y={y}
        rotation={finalRotation}
        scaleX={counterScaleX}
        scaleY={counterScaleY}
      >
        <Text
          x={shouldWrapKks ? -wrappedWidth / 2 : offsetX}
          y={-totalTextHeight / 2}
          {...textProps}
        />
      </Group>
    );
  }

  return (
    <Text
      key={`label-${label.id}-${index}`}
      x={shouldWrapKks ? x - wrappedWidth / 2 : x + offsetX}
      y={y - totalTextHeight / 2}
      {...textProps}
    />
  );
};

/**
 * BaseSymbol Component
 */
export const BaseSymbol: React.FC<BaseSymbolProps> = ({
  definition,
  component,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  isHighlighted = false,
  showPorts = false,
  mode = 'draw',
  darkMode = false,
  onPortClick,
  onPortHover,
}) => {
  const [hoveredPort, setHoveredPort] = React.useState<string | null>(null);
  const [blinkOpacity, setBlinkOpacity] = useState(1);

  // Select color scheme based on mode
  const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;

  // Blinking animation for highlighted components
  useEffect(() => {
    if (!isHighlighted) {
      setBlinkOpacity(1);
      return;
    }

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // Blink 6 times over 3 seconds (every 250ms)
      setBlinkOpacity(frame % 2 === 0 ? 1 : 0.3);
    }, 250);

    return () => clearInterval(interval);
  }, [isHighlighted]);

  // Calculate actual size
  const width = component.size?.width || definition.defaultSize.width;
  const height = component.size?.height || definition.defaultSize.height;

  // Determine colors based on state
  const strokeColor = useMemo(() => {
    if (isHighlighted) return colors.highlightStroke;
    if (isSelected) return colors.selectedStroke;
    if (isHovered) return colors.hoveredStroke;
    // In dark mode, override component stroke color with light color for visibility
    if (darkMode && (!component.style?.strokeColor || component.style?.strokeColor === '#1a1a1a')) {
      return colors.stroke;
    }
    return component.style?.strokeColor || colors.stroke;
  }, [isSelected, isHovered, isHighlighted, component.style?.strokeColor, darkMode, colors]);

  // In dark mode, override white fills with dark fill for visibility
  const fillColor = useMemo(() => {
    if (darkMode && (!component.style?.fillColor || component.style?.fillColor === '#ffffff')) {
      return colors.fill;
    }
    return component.style?.fillColor || colors.fill;
  }, [component.style?.fillColor, darkMode, colors]);

  // Handle port hover
  const handlePortHover = (portId: string | null) => {
    setHoveredPort(portId);
    onPortHover?.(portId);
  };

  // Apply rotation transform
  const rotation = component.rotation || 0;

  // Calculate offset based on centerPoint (relative 0-1 coordinates)
  // Default to center (0.5, 0.5) if no centerPoint is defined
  const centerX = definition.centerPoint?.x ?? 0.5;
  const centerY = definition.centerPoint?.y ?? 0.5;
  const offsetX = centerX * width;
  const offsetY = centerY * height;

  // Calculate flip transformations
  const scaleX = component.flipX ? -1 : 1;
  const scaleY = component.flipY ? -1 : 1;

  return (
    <Group
      x={component.position.x}
      y={component.position.y}
      rotation={rotation}
      offsetX={offsetX}
      offsetY={offsetY}
      opacity={isDragging ? 0.7 : (isHighlighted ? blinkOpacity : 1)}
    >
      {/* Inner group for flip transformations - flip around center */}
      <Group
        x={offsetX}
        y={offsetY}
        scaleX={scaleX}
        scaleY={scaleY}
        offsetX={offsetX}
        offsetY={offsetY}
      >
        {/* Highlight glow effect */}
        {isHighlighted && (
          <Rect
            x={offsetX - width / 2 - 8}
            y={offsetY - height / 2 - 8}
            width={width + 16}
            height={height + 16}
            stroke={colors.highlightStroke}
            strokeWidth={4}
            fill={colors.highlightFill}
            cornerRadius={8}
            shadowColor={colors.highlightStroke}
            shadowBlur={20}
            shadowOpacity={0.8}
          />
        )}

        {/* Selection/hover outline */}
        {(isSelected || isHovered) && !isHighlighted && (
          <Rect
            x={offsetX - width / 2 - 4}
            y={offsetY - height / 2 - 4}
            width={width + 8}
            height={height + 8}
            stroke={isSelected ? colors.selectedStroke : colors.hoveredStroke}
            strokeWidth={isSelected ? 2 : 1}
            dash={isSelected ? undefined : [5, 5]}
            fill="transparent"
            cornerRadius={4}
          />
        )}

        {/* Render all paths */}
        {definition.paths.map((path, index) =>
          renderPath(path, index, width, height, strokeColor, fillColor)
        )}

        {/* Render ports when in connection mode or hovering (only in draw mode) */}
        {definition.ports?.map((port, index) => {
          // Check if this is a terminal component
          const isTerminal = definition.id.startsWith('terminals:');

          // Get port direction from component properties
          let portDirection: 'in' | 'out' | 'both' | 'none' = 'none';
          if (isTerminal) {
            const directionProp = `${port.id}PortDirection`;
            portDirection = (component.properties as Record<string, string>)[directionProp] as typeof portDirection || 'none';
          }

          // Only show ports on hover when in draw mode
          const shouldShowPorts = showPorts || (isHovered && mode === 'draw');

          return renderPort(
            port,
            index,
            width,
            height,
            shouldShowPorts,
            hoveredPort,
            onPortClick,
            handlePortHover,
            portDirection,
            isTerminal,
            colors
          );
        })}

        {/* Render labels (skip if hideLabel is true) */}
        {/* Labels rotate with symbol, counter-flipped to prevent mirroring, counter-rotated at 180° */}
        {!definition.hideLabel && definition.labels?.map((label, index) =>
          renderLabel(label, index, width, height, component, component.flipX, component.flipY, rotation, colors)
        )}
      </Group>
    </Group>
  );
};

// Memoize BaseSymbol to prevent unnecessary re-renders
export const MemoizedBaseSymbol = React.memo(BaseSymbol, (prevProps, nextProps) => {
  // Only re-render if these key props change
  return (
    prevProps.component.kks === nextProps.component.kks &&
    prevProps.component.position.x === nextProps.component.position.x &&
    prevProps.component.position.y === nextProps.component.position.y &&
    prevProps.component.rotation === nextProps.component.rotation &&
    prevProps.component.flipX === nextProps.component.flipX &&
    prevProps.component.flipY === nextProps.component.flipY &&
    prevProps.component.wrapLabel === nextProps.component.wrapLabel &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.showPorts === nextProps.showPorts &&
    prevProps.mode === nextProps.mode &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.definition === nextProps.definition
  );
});

/**
 * Preview version of BaseSymbol for tool palette
 * Simpler rendering without interaction
 */
export const SymbolPreview: React.FC<{
  definition: SymbolDefinition;
  size?: number;
  strokeColor?: string;
  fillColor?: string;
}> = ({
  definition,
  size = 32,
  strokeColor = COLORS.stroke,
  fillColor = COLORS.fill,
}) => {
  // Scale to fit in the preview size while maintaining aspect ratio
  const aspectRatio = definition.defaultSize.width / definition.defaultSize.height;
  let width: number, height: number;

  if (aspectRatio >= 1) {
    width = size;
    height = size / aspectRatio;
  } else {
    height = size;
    width = size * aspectRatio;
  }

  // Get centerPoint (defaults to 0.5, 0.5 if not defined)
  const centerX = definition.centerPoint?.x ?? 0.5;
  const centerY = definition.centerPoint?.y ?? 0.5;

  // Calculate offset based on centerPoint to ensure symbol is centered in preview
  const offsetX = centerX * width;
  const offsetY = centerY * height;

  return (
    <Group
      x={size / 2}
      y={size / 2}
      offsetX={offsetX}
      offsetY={offsetY}
    >
      {definition.paths.map((path, index) =>
        renderPath(path, index, width, height, strokeColor, fillColor)
      )}
    </Group>
  );
};

export default BaseSymbol;
