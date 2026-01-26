/**
 * Components Layer
 *
 * Konva layer that renders all P&ID components with drag-drop and selection.
 * Handles component interaction, selection, and movement.
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Layer, Group, Rect, Line, Circle } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { MemoizedBaseSymbol } from '../symbols/base/BaseSymbol';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore, useUIStoreShallow } from '../../store/uiStore';
import { usePlantStore } from '../../store/plantStore';
import { useHistoryStore } from '../../store/historyStore';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { SnapEngine } from '../../core/grid/SnapEngine';
import type { Component, Point } from '../../types';
import type { SymbolDefinition } from '../../types/symbol.types';
import { MoveMultipleCommand, MoveComponentCommand } from '../../core/commands/ComponentCommands';
import { UpdateWaypointsCommand } from '../../core/commands/ConnectionCommands';
import { SymbolRegistry } from '../../data/symbols/SymbolRegistry';

// ============================================================================
// Memoized Component Item - Prevents inline function recreation
// ============================================================================

interface ComponentItemProps {
  component: Component;
  definition: SymbolDefinition;
  isSelected: boolean;
  isHovered: boolean;
  isDragging: boolean;
  isHighlighted: boolean;
  isBeingDraggedWithSelection: boolean;
  dragDelta: Point;
  showPorts: boolean;
  mode: 'view' | 'draw';
  tool: string;
  darkMode: boolean;
  kksOpacity: number;
  typeHighlightColor?: string; // Color for type-based highlighting
  availableSystemKks: Set<string>; // Set of available system KKS for terminal link validation
  diagramCache: Record<string, unknown>; // Diagram cache for terminal existence validation
  onDragStart: (e: KonvaEventObject<DragEvent>, component: Component) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, component: Component) => void;
  onClick: (e: KonvaEventObject<MouseEvent>, component: Component) => void;
  onDoubleClick: (component: Component) => void;
  onMouseEnter: (kks: string) => void;
  onMouseLeave: () => void;
  onPortClick: (componentKks: string, portId: string) => void;
}

const ComponentItem = React.memo<ComponentItemProps>(({
  component,
  definition,
  isSelected,
  isHovered,
  isDragging,
  isHighlighted,
  isBeingDraggedWithSelection,
  dragDelta,
  showPorts,
  mode,
  tool,
  darkMode,
  kksOpacity,
  typeHighlightColor,
  availableSystemKks,
  diagramCache,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onPortClick,
}) => {
  // Calculate offset for dragged selection
  const offsetX = isBeingDraggedWithSelection ? dragDelta.x : 0;
  const offsetY = isBeingDraggedWithSelection ? dragDelta.y : 0;

  // Memoize the component with zeroed position to prevent object recreation
  const componentWithZeroPosition = useMemo(() => ({
    ...component,
    position: { x: 0, y: 0 }
  }), [component]);

  // Memoize event handlers to prevent recreation
  const handleDragStart = useCallback((e: KonvaEventObject<DragEvent>) => {
    onDragStart(e, component);
  }, [onDragStart, component]);

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    onDragEnd(e, component);
  }, [onDragEnd, component]);

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    onClick(e, component);
  }, [onClick, component]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(component);
  }, [onDoubleClick, component]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(component.kks);
  }, [onMouseEnter, component.kks]);

  const handlePortClick = useCallback((portId: string) => {
    onPortClick(component.kks, portId);
  }, [onPortClick, component.kks]);

  // Use ref to access the Group node for stopping drag
  const groupRef = React.useRef<Konva.Group>(null);

  // Prevent drag on middle mouse button but allow event to bubble for panning
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 && groupRef.current) {
      // Temporarily disable dragging on this node
      groupRef.current.draggable(false);
      // Re-enable after a short delay (after the drag detection window)
      setTimeout(() => {
        if (groupRef.current) {
          groupRef.current.draggable(mode === 'draw' && tool === 'select');
        }
      }, 0);
      // Don't stop propagation - let event bubble to Stage for panning
    }
  }, [mode, tool]);

  // Calculate component bounds for hit region
  const compWidth = component.size?.width || definition?.defaultSize?.width || 60;
  const compHeight = component.size?.height || definition?.defaultSize?.height || 60;
  const centerX = definition?.centerPoint?.x ?? 0.5;
  const centerY = definition?.centerPoint?.y ?? 0.5;

  // Use hitBounds if defined, otherwise use full component bounds
  const hitBounds = (definition as any)?.hitBounds;
  const hitX = hitBounds ? hitBounds.x * compWidth : 0;
  const hitY = hitBounds ? hitBounds.y * compHeight : 0;
  const hitWidth = hitBounds ? hitBounds.width * compWidth : compWidth;
  const hitHeight = hitBounds ? hitBounds.height * compHeight : compHeight;

  return (
    <Group
      ref={groupRef}
      x={component.position.x + offsetX}
      y={component.position.y + offsetY}
      opacity={kksOpacity}
      draggable={mode === 'draw' && tool === 'select'}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragMove={onDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Invisible hit region rect - constrains clickable area to visual bounds */}
      <Rect
        x={hitX - centerX * compWidth}
        y={hitY - centerY * compHeight}
        width={hitWidth}
        height={hitHeight}
        fill="transparent"
      />
      <MemoizedBaseSymbol
        definition={definition}
        component={componentWithZeroPosition}
        isSelected={isSelected}
        isHovered={isHovered}
        isDragging={isDragging || isBeingDraggedWithSelection}
        isHighlighted={isHighlighted}
        showPorts={showPorts}
        mode={mode}
        darkMode={darkMode}
        typeHighlightColor={typeHighlightColor}
        onPortClick={handlePortClick}
      />
      {/* Terminal link status indicator */}
      {component.type.startsWith('terminals:') && (
        (() => {
          const props = component.properties as Record<string, string> | undefined;
          const targetSystemKks = props?.targetSystemKks;
          const targetTerminalKks = props?.targetTerminalKks;
          const hasLink = !!targetSystemKks;
          const width = definition?.defaultSize?.width || 60;
          const height = definition?.defaultSize?.height || 60;
          const cpX = definition?.centerPoint?.x ?? 0.5;
          const cpY = definition?.centerPoint?.y ?? 0.5;
          const rotation = component.rotation || 0;

          // Determine circle color:
          // - Green: has BOTH targetSystemKks AND targetTerminalKks, and both exist
          // - Orange: has BOTH but target system or terminal doesn't exist
          // - Yellow: incomplete data (only one of targetSystemKks or targetTerminalKks provided)
          // - Red: no link at all
          const hasSystemKks = !!targetSystemKks;
          const hasTerminalKks = !!targetTerminalKks;

          let circleColor = '#ef4444'; // Red - no link at all

          if (hasSystemKks && hasTerminalKks) {
            // Both fields provided - check if they exist
            const systemExists = availableSystemKks.has(targetSystemKks) ||
              Array.from(availableSystemKks).some(kks =>
                kks && kks.toUpperCase().trim() === targetSystemKks.toUpperCase().trim()
              );

            if (!systemExists) {
              // System doesn't exist - orange
              circleColor = '#f97316'; // Orange
            } else {
              // System exists, check if target terminal exists
              const targetDiagram = diagramCache[targetSystemKks] as { components?: Record<string, unknown> } | undefined;
              const terminalExists = targetDiagram?.components && targetTerminalKks in targetDiagram.components;
              circleColor = terminalExists ? '#22c55e' : '#f97316'; // Green or Orange
            }
          } else if (hasSystemKks || hasTerminalKks) {
            // Only one field provided - incomplete data - yellow
            circleColor = '#eab308'; // Yellow
          }

          // Calculate circle position based on rotation
          // Circle should always appear at the visual top of the terminal
          let circleX = 0;
          let circleY = 0;

          switch (rotation) {
            case 0:
              // Top is up, place circle at top-right
              circleX = width * (0.5 - cpX);
              circleY = -height * cpY - 6;
              break;
            case 90:
              // Top is now on the right (rotated clockwise)
              circleX = height * (1 - cpY) + 6;
              circleY = width * (0.5 - cpX);
              break;
            case 180:
              // Top is now at bottom
              circleX = width * (0.5 - cpX);
              circleY = height * (1 - cpY) + 6;
              break;
            case 270:
              // Top is now on the left
              circleX = -height * cpY - 6;
              circleY = width * (0.5 - cpX);
              break;
          }

          return (
            <Circle
              x={circleX}
              y={circleY}
              radius={4}
              fill={circleColor}
              stroke={darkMode ? '#1f2937' : '#ffffff'}
              strokeWidth={1.5}
            />
          );
        })()
      )}
    </Group>
  );
});

// Alignment guide line type
interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number; // x for vertical, y for horizontal
  start: number;
  end: number;
}

// Alignment threshold in pixels
const ALIGNMENT_THRESHOLD = 5;

interface ComponentsLayerProps {
  snapEngine: SnapEngine;
  onCompleteConnection?: (targetKks: string, targetPortId: string) => void;
}

/**
 * ComponentsLayer Component
 */
export const ComponentsLayer: React.FC<ComponentsLayerProps> = ({ snapEngine, onCompleteConnection }) => {
  // Get store state and actions - use individual selectors to prevent infinite loops
  const diagram = useDiagramStore((state) => state.diagram);
  const diagramCache = useDiagramStore((state) => state.diagramCache);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);
  const moveComponent = useDiagramStore((state) => state.moveComponent);
  const updateConnectionWaypoints = useDiagramStore((state) => state.updateConnectionWaypoints);
  const addComponent = useDiagramStore((state) => state.addComponent);
  const addConnection = useDiagramStore((state) => state.addConnection);

  // History Store - for undo/redo
  const executeCommand = useHistoryStore((state) => state.execute);

  // Plant store for system selection and available systems
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const plant = usePlantStore((state) => state.plant);

  // Custom symbols store - all symbols are now here
  const customSymbols = useCustomSymbolStore((state) => state.customSymbols);

  // Memoize components array to prevent infinite re-renders
  const components = useMemo(
    () => (diagram ? Object.values(diagram.components) : []),
    [diagram]
  );

  // Memoize connections for finding connections between selected components
  const connections = useMemo(
    () => (diagram?.connections ? Object.values(diagram.connections) : []),
    [diagram?.connections]
  );

  // Helper: Find connections between a set of component KKS
  const findConnectionsBetweenComponents = useCallback(
    (componentKksList: string[]): string[] => {
      if (componentKksList.length < 2) return [];
      const componentSet = new Set(componentKksList);
      return connections
        .filter(
          (conn) =>
            componentSet.has(conn.sourceComponentKks) &&
            componentSet.has(conn.targetComponentKks)
        )
        .map((conn) => conn.kks);
    },
    [connections]
  );

  // UI Store - use individual selectors to prevent issues
  const mode = useUIStore((state) => state.mode);
  const tool = useUIStore((state) => state.tool);
  const selection = useUIStore((state) => state.selection);
  const hoveredComponentKks = useUIStore((state) => state.hoveredComponentKks);
  const isDrawingConnection = useUIStore((state) => state.isDrawingConnection);
  const snapToGrid = useUIStore((state) => state.snapToGrid);
  const highlightedComponentKks = useUIStore((state) => state.highlightedComponentKks);
  const canvasDarkMode = useUIStore((state) => state.canvasDarkMode);

  // KKS Pipe Highlighting state (Segments tab)
  const kksHighlightEnabled = useUIStore((state) => state.kksHighlightEnabled);
  const kksHighlightSegments = useUIStore((state) => state.kksHighlightSegments);
  const kksHighlightSegment = useUIStore((state) => state.kksHighlightSegment);
  const kksHighlightColor = useUIStore((state) => state.kksHighlightColor);
  const kksHideNonMatching = useUIStore((state) => state.kksHideNonMatching);
  const kksHideFadeOpacity = useUIStore((state) => state.kksHideFadeOpacity);

  // Type Highlighting state (Types tab)
  const kksHighlightTypes = useUIStore((state) => state.kksHighlightTypes);

  // UI Store actions
  const select = useUIStore((state) => state.select);
  const addToSelection = useUIStore((state) => state.addToSelection);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const setHoveredComponent = useUIStore((state) => state.setHoveredComponent);
  const startConnectionDrawing = useUIStore((state) => state.startConnectionDrawing);
  const highlightComponent = useUIStore((state) => state.highlightComponent);
  const saveViewportForSystem = useUIStore((state) => state.saveViewportForSystem);
  const restoreViewportForSystem = useUIStore((state) => state.restoreViewportForSystem);
  const startDraggingSelection = useUIStore((state) => state.startDraggingSelection);
  const updateDragSelectionDelta = useUIStore((state) => state.updateDragSelectionDelta);
  const endDraggingSelection = useUIStore((state) => state.endDraggingSelection);

  // Local state for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [draggedKks, setDraggedKks] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState<Point>({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const selectionStartRef = useRef<Point | null>(null);

  // Alignment guides state
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const lastAlignmentCalcRef = useRef<number>(0);
  const ALIGNMENT_THROTTLE_MS = 32; // ~30fps for alignment guides (reduce CPU load)

  // Pre-compute uppercase segments once (outside component loop)
  const upperCaseSegments = useMemo(() => {
    const previewSegment = kksHighlightSegment.trim().toUpperCase();
    const segments: string[] = [];

    // Add preview segment first (higher priority)
    if (previewSegment.length > 0) {
      segments.push(previewSegment);
    }

    // Add saved segments - only if enabled
    kksHighlightSegments.forEach(seg => {
      if (seg.enabled) {
        segments.push(seg.segment.toUpperCase());
      }
    });

    return segments;
  }, [kksHighlightSegments, kksHighlightSegment]);

  // Compute set of component KKS that match any KKS highlight segment
  // Includes both saved segments AND the live preview segment being typed
  // Excludes "Additional Components" (category: additional) from KKS matching
  const kksMatchingComponents = useMemo(() => {
    if (!kksHighlightEnabled || upperCaseSegments.length === 0) return new Set<string>();

    const matchingKks = new Set<string>();

    components.forEach((comp) => {
      // Skip "Additional Components" category (auto-generated KKS)
      if (comp.type.startsWith('additional:')) return;

      // Check if component matches any segment (segments already uppercased)
      const compKksUpper = comp.kks.toUpperCase();
      for (const segment of upperCaseSegments) {
        if (compKksUpper.includes(segment)) {
          matchingKks.add(comp.kks);
          break; // Found a match, no need to check other segments
        }
      }
    });

    return matchingKks;
  }, [kksHighlightEnabled, upperCaseSegments, components]);

  // Check if a component is connected to a matching component (for pipes through it)
  const kksConnectedComponents = useMemo(() => {
    if (!kksHighlightEnabled || !kksHideNonMatching || kksMatchingComponents.size === 0) {
      return new Set<string>();
    }

    const connectedKks = new Set<string>();

    // Find components that are connected to matching components via pipes
    connections.forEach((conn) => {
      const sourceMatches = kksMatchingComponents.has(conn.sourceComponentKks);
      const targetMatches = kksMatchingComponents.has(conn.targetComponentKks);

      if (sourceMatches || targetMatches) {
        // Both ends of a highlighted pipe should remain visible
        connectedKks.add(conn.sourceComponentKks);
        connectedKks.add(conn.targetComponentKks);
      }
    });

    return connectedKks;
  }, [kksHighlightEnabled, kksHideNonMatching, kksMatchingComponents, connections]);

  // Compute type highlight colors for components (Types tab)
  // Returns a map of componentKks -> highlight color
  const typeHighlightColors = useMemo(() => {
    const colorMap = new Map<string, string>();

    // Get enabled type highlights
    const enabledTypes = kksHighlightTypes.filter(t => t.enabled);
    if (enabledTypes.length === 0) return colorMap;

    components.forEach((comp) => {
      // Check if component type matches any enabled type highlight
      for (const typeHighlight of enabledTypes) {
        if (comp.type === typeHighlight.symbolId) {
          colorMap.set(comp.kks, typeHighlight.color);
          break; // First match wins
        }
      }
    });

    return colorMap;
  }, [kksHighlightTypes, components]);

  // Compute set of available system KKS for terminal link validation
  const availableSystemKks = useMemo(() => {
    if (!plant) return new Set<string>();
    const systemKksSet = new Set<string>();
    // Iterate through all units and their systems
    for (const unit of Object.values(plant.units)) {
      for (const system of Object.values(unit.systems)) {
        // System uses 'kks' property, not 'systemKks'
        if (system.kks) {
          systemKksSet.add(system.kks);
        }
      }
    }
    return systemKksSet;
  }, [plant]);

  // Helper: Get component bounding box
  // Note: Component position is at the centerPoint of the symbol (due to offsetX/offsetY in BaseSymbol)
  // centerPoint is relative (0-1), defaults to (0.5, 0.5) if not defined
  const getComponentBounds = useCallback((component: Component) => {
    // Check custom symbols first, then fall back to SymbolRegistry
    const definition = customSymbols[component.type] || SymbolRegistry.getSymbol(component.type);
    const width = definition?.defaultSize?.width || 60;
    const height = definition?.defaultSize?.height || 60;
    // Get centerPoint (defaults to geometric center 0.5, 0.5)
    const cpX = definition?.centerPoint?.x ?? 0.5;
    const cpY = definition?.centerPoint?.y ?? 0.5;
    // Position is at the centerPoint, calculate edges from there
    const posX = component.position.x;
    const posY = component.position.y;

    return {
      left: posX - cpX * width,
      right: posX + (1 - cpX) * width,
      top: posY - cpY * height,
      bottom: posY + (1 - cpY) * height,
      centerX: posX - cpX * width + width / 2,  // Geometric center X
      centerY: posY - cpY * height + height / 2, // Geometric center Y
      width,
      height,
    };
  }, [customSymbols]);

  // Helper: Calculate alignment guides during drag
  const calculateAlignmentGuides = useCallback(
    (draggedComponent: Component, currentX: number, currentY: number): AlignmentGuide[] => {
      const guides: AlignmentGuide[] = [];
      const selectedSet = new Set(selection.componentKks);

      // Get dragged component bounds at current position
      // Note: currentX/currentY is at the centerPoint position (due to offsetX/offsetY in BaseSymbol)
      // Check custom symbols first, then fall back to SymbolRegistry
      const definition = customSymbols[draggedComponent.type] || SymbolRegistry.getSymbol(draggedComponent.type);
      const width = definition?.defaultSize?.width || 60;
      const height = definition?.defaultSize?.height || 60;
      // Get centerPoint (defaults to geometric center 0.5, 0.5)
      const cpX = definition?.centerPoint?.x ?? 0.5;
      const cpY = definition?.centerPoint?.y ?? 0.5;

      const draggedBounds = {
        left: currentX - cpX * width,
        right: currentX + (1 - cpX) * width,
        top: currentY - cpY * height,
        bottom: currentY + (1 - cpY) * height,
        centerX: currentX - cpX * width + width / 2,  // Geometric center X
        centerY: currentY - cpY * height + height / 2, // Geometric center Y
      };

      // Check against all other components (not being dragged)
      components.forEach((otherComponent) => {
        // Skip if it's being dragged (selected)
        if (selectedSet.has(otherComponent.kks)) return;

        const otherBounds = getComponentBounds(otherComponent);

        // Vertical alignments (x-axis)
        // Left edge alignment
        if (Math.abs(draggedBounds.left - otherBounds.left) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'vertical',
            position: otherBounds.left,
            start: Math.min(draggedBounds.top, otherBounds.top) - 50,
            end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 50,
          });
        }
        // Right edge alignment
        if (Math.abs(draggedBounds.right - otherBounds.right) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'vertical',
            position: otherBounds.right,
            start: Math.min(draggedBounds.top, otherBounds.top) - 50,
            end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 50,
          });
        }
        // Center X alignment
        if (Math.abs(draggedBounds.centerX - otherBounds.centerX) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'vertical',
            position: otherBounds.centerX,
            start: Math.min(draggedBounds.top, otherBounds.top) - 50,
            end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 50,
          });
        }
        // Left to Right alignment
        if (Math.abs(draggedBounds.left - otherBounds.right) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'vertical',
            position: otherBounds.right,
            start: Math.min(draggedBounds.top, otherBounds.top) - 50,
            end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 50,
          });
        }
        // Right to Left alignment
        if (Math.abs(draggedBounds.right - otherBounds.left) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'vertical',
            position: otherBounds.left,
            start: Math.min(draggedBounds.top, otherBounds.top) - 50,
            end: Math.max(draggedBounds.bottom, otherBounds.bottom) + 50,
          });
        }

        // Horizontal alignments (y-axis)
        // Top edge alignment
        if (Math.abs(draggedBounds.top - otherBounds.top) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'horizontal',
            position: otherBounds.top,
            start: Math.min(draggedBounds.left, otherBounds.left) - 50,
            end: Math.max(draggedBounds.right, otherBounds.right) + 50,
          });
        }
        // Bottom edge alignment
        if (Math.abs(draggedBounds.bottom - otherBounds.bottom) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'horizontal',
            position: otherBounds.bottom,
            start: Math.min(draggedBounds.left, otherBounds.left) - 50,
            end: Math.max(draggedBounds.right, otherBounds.right) + 50,
          });
        }
        // Center Y alignment
        if (Math.abs(draggedBounds.centerY - otherBounds.centerY) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'horizontal',
            position: otherBounds.centerY,
            start: Math.min(draggedBounds.left, otherBounds.left) - 50,
            end: Math.max(draggedBounds.right, otherBounds.right) + 50,
          });
        }
        // Top to Bottom alignment
        if (Math.abs(draggedBounds.top - otherBounds.bottom) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'horizontal',
            position: otherBounds.bottom,
            start: Math.min(draggedBounds.left, otherBounds.left) - 50,
            end: Math.max(draggedBounds.right, otherBounds.right) + 50,
          });
        }
        // Bottom to Top alignment
        if (Math.abs(draggedBounds.bottom - otherBounds.top) < ALIGNMENT_THRESHOLD) {
          guides.push({
            type: 'horizontal',
            position: otherBounds.top,
            start: Math.min(draggedBounds.left, otherBounds.left) - 50,
            end: Math.max(draggedBounds.right, otherBounds.right) + 50,
          });
        }
      });

      // Remove duplicate guides (same type and position)
      const uniqueGuides: AlignmentGuide[] = [];
      const seenKeys = new Set<string>();
      guides.forEach((guide) => {
        const key = `${guide.type}-${Math.round(guide.position)}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueGuides.push(guide);
        }
      });

      return uniqueGuides;
    },
    [components, selection.componentKks, getComponentBounds, customSymbols]
  );

  // Check if a component is selected
  const isSelected = useCallback(
    (kks: string) => selection.componentKks.includes(kks),
    [selection.componentKks]
  );

  // Handle component click
  const handleComponentClick = useCallback(
    (e: KonvaEventObject<MouseEvent>, component: Component) => {
      e.cancelBubble = true; // Prevent canvas click

      // Allow selection in both view and draw modes
      if (mode === 'view' || tool === 'select') {
        if (e.evt.shiftKey || e.evt.ctrlKey) {
          // Toggle selection with modifier
          if (isSelected(component.kks)) {
            // Remove from selection
            const newComponentSelection = selection.componentKks.filter(
              (kks) => kks !== component.kks
            );
            // Recalculate connections between remaining components
            const newConnectionSelection = findConnectionsBetweenComponents(newComponentSelection);
            select(newComponentSelection, newConnectionSelection);
          } else {
            // Add to selection and include connections between all selected components
            const newComponentSelection = [...selection.componentKks, component.kks];
            const connectionsToAdd = findConnectionsBetweenComponents(newComponentSelection);
            addToSelection([component.kks], connectionsToAdd);
          }
        } else {
          // Single select
          select([component.kks], []);
        }
      }
    },
    [mode, tool, isSelected, selection, select, addToSelection, findConnectionsBetweenComponents]
  );

  // Handle component drag start
  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>, component: Component) => {
      // Prevent drag on middle mouse button (used for panning) or in view mode
      // button === 1 is middle click, buttons & 4 checks if middle is currently pressed
      const isMiddleButton = e.evt.button === 1 || (e.evt.buttons & 4) !== 0;
      if (mode === 'view' || tool !== 'select' || isMiddleButton) {
        e.target.stopDrag();
        return;
      }

      setIsDragging(true);
      setDraggedKks(component.kks);
      setDragStartPos({ ...component.position });
      setDragDelta({ x: 0, y: 0 });

      // Ensure the dragged component is selected
      if (!isSelected(component.kks)) {
        select([component.kks], []);
        startDraggingSelection([component.kks]);
      } else {
        // Start dragging all selected components
        startDraggingSelection(selection.componentKks);
      }
    },
    [mode, tool, isSelected, select, selection.componentKks, startDraggingSelection]
  );

  // Handle component dragging
  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!isDragging || !dragStartPos || !draggedKks) return;

      // Get the current position
      const node = e.target;
      let x = node.x();
      let y = node.y();

      // Apply snap to grid
      if (snapToGrid) {
        const snapped = snapEngine.getNearestGridPoint({ x, y });
        x = snapped.x;
        y = snapped.y;
      }

      // Update node position
      node.x(x);
      node.y(y);

      // Calculate delta from original position for other selected components
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      setDragDelta({ x: deltaX, y: deltaY });

      // Update global drag state for connections to follow
      updateDragSelectionDelta({ x: deltaX, y: deltaY });

      // Calculate alignment guides (throttled to reduce CPU load)
      const now = performance.now();
      if (now - lastAlignmentCalcRef.current >= ALIGNMENT_THROTTLE_MS) {
        lastAlignmentCalcRef.current = now;
        const draggedComponent = components.find((c) => c.kks === draggedKks);
        if (draggedComponent) {
          const guides = calculateAlignmentGuides(draggedComponent, x, y);
          setAlignmentGuides(guides);
        }
      }
    },
    [isDragging, dragStartPos, draggedKks, snapToGrid, snapEngine, updateDragSelectionDelta, components, calculateAlignmentGuides, ALIGNMENT_THROTTLE_MS]
  );

  // Handle component drag end
  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, component: Component) => {
      if (!isDragging || !dragStartPos) return;

      const node = e.target;
      let x = node.x();
      let y = node.y();

      // Final snap
      if (snapToGrid) {
        const snapped = snapEngine.getNearestGridPoint({ x, y });
        x = snapped.x;
        y = snapped.y;
      }

      // Calculate final delta
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;

      // Move all selected components using commands for undo/redo
      if (selection.componentKks.length > 0 && isSelected(component.kks)) {
        const selectedSet = new Set(selection.componentKks);

        // Build moves array for the command
        // IMPORTANT: Calculate oldPosition by subtracting delta from current position
        // because component positions may have been updated during drag
        const moves = selection.componentKks
          .map((kks) => {
            const comp = components.find((c) => c.kks === kks);
            if (comp) {
              return {
                kks,
                oldPosition: {
                  x: comp.position.x,
                  y: comp.position.y,
                },
                newPosition: {
                  x: comp.position.x + deltaX,
                  y: comp.position.y + deltaY,
                },
              };
            }
            return null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null);

        // Execute move command
        if (moves.length > 0) {
          executeCommand(new MoveMultipleCommand(moves));
        }

        // Move waypoints for connections where BOTH endpoints are selected
        connections.forEach((conn) => {
          if (
            selectedSet.has(conn.sourceComponentKks) &&
            selectedSet.has(conn.targetComponentKks) &&
            conn.waypoints.length > 0
          ) {
            const movedWaypoints = conn.waypoints.map((wp) => ({
              x: wp.x + deltaX,
              y: wp.y + deltaY,
            }));
            executeCommand(new UpdateWaypointsCommand(conn.kks, conn.waypoints, movedWaypoints));
          }
        });
      } else {
        // Just move the dragged component using command
        executeCommand(new MoveComponentCommand(component.kks, dragStartPos, { x, y }));
      }

      setIsDragging(false);
      setDraggedKks(null);
      setDragDelta({ x: 0, y: 0 });
      setDragStartPos(null);
      setAlignmentGuides([]); // Clear alignment guides
      endDraggingSelection();
    },
    [isDragging, dragStartPos, snapToGrid, snapEngine, executeCommand, selection.componentKks, isSelected, components, connections, endDraggingSelection]
  );

  // Handle port click for connections
  const handlePortClick = useCallback(
    (componentKks: string, portId: string) => {
      if (mode === 'view') return;

      if (isDrawingConnection) {
        // Complete the connection
        if (onCompleteConnection) {
          onCompleteConnection(componentKks, portId);
        }
      } else if (tool === 'pipe') {
        // Start drawing a new connection
        startConnectionDrawing(componentKks, portId);
      }
    },
    [mode, tool, isDrawingConnection, startConnectionDrawing, onCompleteConnection]
  );

  // Handle double-click for terminal navigation
  const handleDoubleClick = useCallback(
    async (component: Component) => {
      // Check if this is a terminal component
      if (!component.type.startsWith('terminals:')) return;

      // Get target system and terminal from properties
      const props = component.properties as Record<string, string>;
      const targetSystemKks = props.targetSystemKks;
      const targetTerminalKks = props.targetTerminalKks;

      if (!targetSystemKks) {
        console.warn('Terminal has no target system configured');
        return;
      }

      // Store current system KKS before switching
      const currentSystemKks = diagram?.systemKks;

      // Save current viewport before switching
      if (currentSystemKks) {
        saveViewportForSystem(currentSystemKks);
      }

      // Switch to target system - DON'T create if not found
      selectSystem(targetSystemKks);
      const result = await switchToSystem(targetSystemKks, { createIfNotFound: false });

      if (!result.success) {
        // Show error message - system doesn't exist
        alert(`Target system "${targetSystemKks}" not found. The linked system may have been renamed or deleted.`);
        return;
      }

      // After switching, restore viewport and highlight terminal
      setTimeout(() => {
        // Try to restore saved viewport for target system
        restoreViewportForSystem(targetSystemKks);

        // Get the loaded diagram from cache (it's now loaded after switchToSystem)
        const loadedDiagram = useDiagramStore.getState().diagramCache[targetSystemKks];
        if (!loadedDiagram) return;

        // Find the target terminal component
        let targetComponent = targetTerminalKks
          ? loadedDiagram.components[targetTerminalKks]
          : null;

        // If no specific terminal, find any terminal that links back to this system
        if (!targetComponent) {
          targetComponent = Object.values(loadedDiagram.components).find((c) => {
            if (!c.type.startsWith('terminals:')) return false;
            const cProps = c.properties as Record<string, string>;
            return cProps.targetSystemKks === currentSystemKks;
          }) || null;
        }

        if (targetComponent) {
          // Select the target terminal using KKS
          select([targetComponent.kks], []);

          // Highlight the target terminal with blinking animation (but don't change viewport)
          highlightComponent(targetComponent.kks, 3000);
        }
      }, 100);
    },
    [diagram, selectSystem, switchToSystem, select, highlightComponent, saveViewportForSystem, restoreViewportForSystem]
  );

  // Handle selection rectangle drag
  const handleLayerMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Only start selection rect if clicking on empty space
      if (e.target === e.currentTarget && tool === 'select' && mode === 'draw') {
        const stage = e.target.getStage();
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Transform to canvas coordinates
        const transform = stage.getAbsoluteTransform().copy().invert();
        const canvasPos = transform.point(pos);

        selectionStartRef.current = canvasPos;
        setSelectionRect({
          x: canvasPos.x,
          y: canvasPos.y,
          width: 0,
          height: 0,
        });

        if (!e.evt.shiftKey && !e.evt.ctrlKey) {
          clearSelection();
        }
      }
    },
    [tool, mode, clearSelection]
  );

  const handleLayerMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!selectionStartRef.current || !selectionRect) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const canvasPos = transform.point(pos);

      const startPos = selectionStartRef.current;
      const width = canvasPos.x - startPos.x;
      const height = canvasPos.y - startPos.y;

      setSelectionRect({
        x: width < 0 ? canvasPos.x : startPos.x,
        y: height < 0 ? canvasPos.y : startPos.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    },
    [selectionRect]
  );

  const handleLayerMouseUp = useCallback(() => {
    if (selectionRect && selectionRect.width > 5 && selectionRect.height > 5) {
      // Find components within selection rect
      const selectedKks = components
        .filter((component) => {
          const { x, y } = component.position;
          return (
            x >= selectionRect.x &&
            x <= selectionRect.x + selectionRect.width &&
            y >= selectionRect.y &&
            y <= selectionRect.y + selectionRect.height
          );
        })
        .map((c) => c.kks);

      if (selectedKks.length > 0) {
        // Find connections between selected components (including already selected ones)
        const allSelectedKks = [...new Set([...selection.componentKks, ...selectedKks])];
        const connectionKksList = findConnectionsBetweenComponents(allSelectedKks);
        addToSelection(selectedKks, connectionKksList);
      }
    }

    selectionStartRef.current = null;
    setSelectionRect(null);
  }, [selectionRect, components, addToSelection, selection.componentKks, findConnectionsBetweenComponents]);

  // Determine if ports should be shown
  const showPorts = tool === 'pipe' || isDrawingConnection;

  // Stable callback for mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredComponent(null);
  }, [setHoveredComponent]);

  // Pre-compute shouldHideForKks to avoid recalculating in loop
  const shouldHideForKks = kksHighlightEnabled && kksHideNonMatching && kksMatchingComponents.size > 0;

  return (
    <Layer
      onMouseDown={handleLayerMouseDown}
      onMouseMove={handleLayerMouseMove}
      onMouseUp={handleLayerMouseUp}
    >
      {/* Render all components using memoized ComponentItem */}
      {components.map((component) => {
        // Check custom symbols first, then fall back to SymbolRegistry
        const definition = customSymbols[component.type] || SymbolRegistry.getSymbol(component.type);
        if (!definition) {
          console.warn(`Symbol not found: ${component.type}`);
          return null;
        }

        const componentIsSelected = isSelected(component.kks);
        const componentIsDragging = draggedKks === component.kks;
        const isBeingDraggedWithSelection = isDragging && componentIsSelected && !componentIsDragging;

        // KKS Highlight visibility
        const isKksMatching = kksMatchingComponents.has(component.kks);
        const isKksConnected = kksConnectedComponents.has(component.kks);
        const isVisibleForKks = isKksMatching || isKksConnected || componentIsSelected;
        const kksOpacity = shouldHideForKks && !isVisibleForKks ? kksHideFadeOpacity : 1;

        // Get type highlight color if applicable
        const componentTypeHighlightColor = typeHighlightColors.get(component.kks);

        return (
          <ComponentItem
            key={component.kks}
            component={component}
            definition={definition}
            isSelected={componentIsSelected}
            isHovered={hoveredComponentKks === component.kks}
            isDragging={componentIsDragging}
            isHighlighted={highlightedComponentKks === component.kks}
            isBeingDraggedWithSelection={isBeingDraggedWithSelection}
            dragDelta={dragDelta}
            showPorts={showPorts}
            mode={mode}
            tool={tool}
            darkMode={canvasDarkMode}
            kksOpacity={kksOpacity}
            typeHighlightColor={componentTypeHighlightColor}
            availableSystemKks={availableSystemKks}
            diagramCache={diagramCache}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onClick={handleComponentClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={setHoveredComponent}
            onMouseLeave={handleMouseLeave}
            onPortClick={handlePortClick}
          />
        );
      })}

      {/* Selection rectangle */}
      {selectionRect && (
        <Rect
          x={selectionRect.x}
          y={selectionRect.y}
          width={selectionRect.width}
          height={selectionRect.height}
          fill="rgba(37, 99, 235, 0.1)"
          stroke="#2563eb"
          strokeWidth={1}
          dash={[5, 5]}
        />
      )}

      {/* Alignment guide lines */}
      {alignmentGuides.map((guide, index) => (
        <Line
          key={`guide-${index}`}
          points={
            guide.type === 'vertical'
              ? [guide.position, guide.start, guide.position, guide.end]
              : [guide.start, guide.position, guide.end, guide.position]
          }
          stroke="#ff6b6b"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
    </Layer>
  );
};

export default ComponentsLayer;
