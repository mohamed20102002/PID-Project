/**
 * Components Layer
 *
 * Konva layer that renders all P&ID components with drag-drop and selection.
 * Handles component interaction, selection, and movement.
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Layer, Group, Rect, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { BaseSymbol } from '../symbols/base/BaseSymbol';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore } from '../../store/uiStore';
import { usePlantStore } from '../../store/plantStore';
import { useHistoryStore } from '../../store/historyStore';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { SnapEngine } from '../../core/grid/SnapEngine';
import type { Component, Point } from '../../types';
import { MoveMultipleCommand, MoveComponentCommand } from '../../core/commands/ComponentCommands';
import { UpdateWaypointsCommand } from '../../core/commands/ConnectionCommands';

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

  // Plant store for system selection
  const selectSystem = usePlantStore((state) => state.selectSystem);

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
        .map((conn) => conn.id);
    },
    [connections]
  );

  // UI Store - use individual selectors
  const mode = useUIStore((state) => state.mode);
  const tool = useUIStore((state) => state.tool);
  const selection = useUIStore((state) => state.selection);
  const hoveredComponentKks = useUIStore((state) => state.hoveredComponentKks);
  const isDrawingConnection = useUIStore((state) => state.isDrawingConnection);
  const snapToGrid = useUIStore((state) => state.snapToGrid);
  const highlightedComponentKks = useUIStore((state) => state.highlightedComponentKks);

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

  // Helper: Get component bounding box
  // Note: Component position is at the centerPoint of the symbol (due to offsetX/offsetY in BaseSymbol)
  // centerPoint is relative (0-1), defaults to (0.5, 0.5) if not defined
  const getComponentBounds = useCallback((component: Component) => {
    const definition = customSymbols[component.type];
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
      const definition = customSymbols[draggedComponent.type];
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
    [components, selection.componentKks, getComponentBounds]
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
      if (mode === 'view' || tool !== 'select') {
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

      // Calculate alignment guides
      const draggedComponent = components.find((c) => c.kks === draggedKks);
      if (draggedComponent) {
        const guides = calculateAlignmentGuides(draggedComponent, x, y);
        setAlignmentGuides(guides);
      }
    },
    [isDragging, dragStartPos, draggedKks, snapToGrid, snapEngine, updateDragSelectionDelta, components, calculateAlignmentGuides]
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
            executeCommand(new UpdateWaypointsCommand(conn.id, conn.waypoints, movedWaypoints));
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
    (component: Component) => {
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

      // Save current viewport before switching
      if (diagram?.systemKks) {
        saveViewportForSystem(diagram.systemKks);
      }

      // Switch to target system
      selectSystem(targetSystemKks);
      switchToSystem(targetSystemKks);

      // After switching, restore viewport and highlight terminal
      setTimeout(() => {
        // Try to restore saved viewport for target system
        restoreViewportForSystem(targetSystemKks);

        const targetDiagram = diagramCache[targetSystemKks];
        if (!targetDiagram) {
          console.warn(`No diagram found for system: ${targetSystemKks}`);
          return;
        }

        // Find the target terminal component
        let targetComponent = targetTerminalKks
          ? targetDiagram.components[targetTerminalKks]
          : null;

        // If no specific terminal, find any terminal that links back to this system
        if (!targetComponent) {
          targetComponent = Object.values(targetDiagram.components).find((c) => {
            if (!c.type.startsWith('terminals:')) return false;
            const cProps = c.properties as Record<string, string>;
            return cProps.targetSystemKks === diagram?.systemKks;
          }) || null;
        }

        if (targetComponent) {
          // Select the target terminal
          select([targetComponent.kks], []);

          // Highlight the target terminal with blinking animation (but don't change viewport)
          highlightComponent(targetComponent.kks, 3000);
        }
      }, 100);
    },
    [diagram, diagramCache, selectSystem, switchToSystem, select, highlightComponent, saveViewportForSystem, restoreViewportForSystem]
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
        const connectionIds = findConnectionsBetweenComponents(allSelectedKks);
        addToSelection(selectedKks, connectionIds);
      }
    }

    selectionStartRef.current = null;
    setSelectionRect(null);
  }, [selectionRect, components, addToSelection, selection.componentKks, findConnectionsBetweenComponents]);

  // Determine if ports should be shown
  const showPorts = tool === 'pipe' || isDrawingConnection;

  return (
    <Layer
      onMouseDown={handleLayerMouseDown}
      onMouseMove={handleLayerMouseMove}
      onMouseUp={handleLayerMouseUp}
    >
      {/* Render all components */}
      {components.map((component) => {
        const definition = customSymbols[component.type];
        if (!definition) {
          console.warn(`Symbol not found: ${component.type}`);
          return null;
        }

        const componentIsSelected = isSelected(component.kks);
        const componentIsHovered = hoveredComponentKks === component.kks;
        const componentIsDragging = draggedKks === component.kks;
        const componentIsHighlighted = highlightedComponentKks === component.kks;

        // Apply drag offset to selected components (except the one being dragged, it moves itself)
        const isBeingDraggedWithSelection = isDragging && componentIsSelected && !componentIsDragging;
        const offsetX = isBeingDraggedWithSelection ? dragDelta.x : 0;
        const offsetY = isBeingDraggedWithSelection ? dragDelta.y : 0;

        return (
          <Group
            key={component.kks}
            x={component.position.x + offsetX}
            y={component.position.y + offsetY}
            draggable={mode === 'draw' && tool === 'select'}
            onDragStart={(e) => handleDragStart(e, component)}
            onDragMove={handleDragMove}
            onDragEnd={(e) => handleDragEnd(e, component)}
            onClick={(e) => handleComponentClick(e, component)}
            onTap={(e) => handleComponentClick(e, component)}
            onDblClick={() => handleDoubleClick(component)}
            onDblTap={() => handleDoubleClick(component)}
            onMouseEnter={() => setHoveredComponent(component.kks)}
            onMouseLeave={() => setHoveredComponent(null)}
          >
            <BaseSymbol
              definition={definition}
              component={{...component, position: { x: 0, y: 0 }}}
              isSelected={componentIsSelected}
              isHovered={componentIsHovered}
              isDragging={componentIsDragging || isBeingDraggedWithSelection}
              isHighlighted={componentIsHighlighted}
              showPorts={showPorts}
              mode={mode}
              onPortClick={(portId) => handlePortClick(component.kks, portId)}
            />
          </Group>
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
