/**
 * DiagramCanvas Component
 *
 * Main canvas component that wraps Konva Stage and handles:
 * - Pan and zoom
 * - Mouse events
 * - Component rendering layers
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Konva from 'konva';
import { GridLayer } from './GridLayer';
import { ComponentsLayer } from './ComponentsLayer';
import { ConnectionsLayer } from './ConnectionsLayer';
import { BuildingsLayer } from './BuildingsLayer';
import { CanvasBoundary } from './CanvasBoundary';
import { AxisOverlay } from './AxisOverlay';
import { KKSHoverTooltip } from './KKSHoverTooltip';
import { CopyKKSButton } from './CopyKKSButton';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';
import { usePlantStore } from '../../store/plantStore';
import { useHistoryStore } from '../../store/historyStore';
import { SnapEngine, GuideLine } from '../../core/grid/SnapEngine';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ConnectionManager } from '../../core/connections/ConnectionManager';
import { getPortWorldPosition, findPort } from '../../core/geometry/PortCalculator';
import { AddComponentCommand } from '../../core/commands/ComponentCommands';
import { AddConnectionCommand } from '../../core/commands/ConnectionCommands';
import { SymbolRegistry } from '../../data/symbols/SymbolRegistry';

interface DiagramCanvasProps {
  width: number;
  height: number;
  onStageReady?: (stage: Konva.Stage | null) => void;
  onOpenSystem?: (systemKks: string) => void;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({ width, height, onStageReady, onOpenSystem }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // UI Store
  const viewport = useUIStore((state) => state.viewport);
  const setViewport = useUIStore((state) => state.setViewport);
  const gridVisible = useUIStore((state) => state.gridVisible);
  const gridSize = useUIStore((state) => state.gridSize);
  const snapToGrid = useUIStore((state) => state.snapToGrid);
  const axisOverlayVisible = useUIStore((state) => state.axisOverlayVisible);
  const axisLinesVisible = useUIStore((state) => state.axisLinesVisible);
  const diagramCanvasWidth = useUIStore((state) => state.canvasWidth);
  const diagramCanvasHeight = useUIStore((state) => state.canvasHeight);
  const canvasDarkMode = useUIStore((state) => state.canvasDarkMode);
  const mode = useUIStore((state) => state.mode);
  const tool = useUIStore((state) => state.tool);
  const placingComponentType = useUIStore((state) => state.placingComponentType);
  const setMousePosition = useUIStore((state) => state.setMousePosition);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const setTool = useUIStore((state) => state.setTool);
  const setPlacingComponentType = useUIStore((state) => state.setPlacingComponentType);
  const isDrawingConnection = useUIStore((state) => state.isDrawingConnection);
  const connectionSourceKks = useUIStore((state) => state.connectionSourceKks);
  const connectionSourcePortId = useUIStore((state) => state.connectionSourcePortId);
  const connectionWaypoints = useUIStore((state) => state.connectionWaypoints);
  const updateConnectionPreview = useUIStore((state) => state.updateConnectionPreview);
  const addConnectionWaypoint = useUIStore((state) => state.addConnectionWaypoint);
  const removeLastWaypoint = useUIStore((state) => state.removeLastWaypoint);
  const completeConnectionDrawing = useUIStore((state) => state.completeConnectionDrawing);
  const cancelConnectionDrawing = useUIStore((state) => state.cancelConnectionDrawing);

  // Building drawing state
  const isDrawingBuilding = useUIStore((state) => state.isDrawingBuilding);
  const buildingPreviewPoints = useUIStore((state) => state.buildingPreviewPoints);
  const addBuildingVertex = useUIStore((state) => state.addBuildingVertex);
  const cancelBuildingDrawing = useUIStore((state) => state.cancelBuildingDrawing);
  const completeBuildingDrawing = useUIStore((state) => state.completeBuildingDrawing);
  const selectBuilding = useUIStore((state) => state.selectBuilding);

  // Box selection state
  const isBoxSelecting = useUIStore((state) => state.isBoxSelecting);
  const boxSelectionStart = useUIStore((state) => state.boxSelectionStart);
  const boxSelectionEnd = useUIStore((state) => state.boxSelectionEnd);
  const startBoxSelection = useUIStore((state) => state.startBoxSelection);
  const updateBoxSelection = useUIStore((state) => state.updateBoxSelection);
  const endBoxSelection = useUIStore((state) => state.endBoxSelection);
  const select = useUIStore((state) => state.select);
  const addToSelection = useUIStore((state) => state.addToSelection);

  // Diagram Store
  const diagram = useDiagramStore((state) => state.diagram);
  const addComponent = useDiagramStore((state) => state.addComponent);
  const addConnection = useDiagramStore((state) => state.addConnection);
  const getComponent = useDiagramStore((state) => state.getComponent);
  const addBuilding = useDiagramStore((state) => state.addBuilding);

  // History Store - for undo/redo
  const executeCommand = useHistoryStore((state) => state.execute);

  // Plant Store - for selected system
  const selectedSystemKks = usePlantStore((state) => state.selectedSystemKks);

  // Memoize derived data to prevent infinite loops
  const componentsMap = useMemo(() => diagram?.components || {}, [diagram?.components]);
  const components = useMemo(
    () => Object.values(diagram?.components || {}),
    [diagram?.components]
  );
  const connectionsMap = useMemo(() => diagram?.connections || {}, [diagram?.connections]);
  const connections = useMemo(
    () => Object.values(diagram?.connections || {}),
    [diagram?.connections]
  );

  // Helper: Find connection IDs between a set of component KKS
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

  // Get custom symbols store
  const { customSymbols } = useCustomSymbolStore();

  // Create snap engine
  const snapEngine = useMemo(() => new SnapEngine({ gridSize }), [gridSize]);

  // Create connection manager
  const connectionManager = useMemo(
    () => new ConnectionManager(componentsMap, connectionsMap, customSymbols),
    [componentsMap, connectionsMap, customSymbols]
  );

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Notify parent when stage is ready
  useEffect(() => {
    if (onStageReady) {
      onStageReady(stageRef.current);
    }
    return () => {
      if (onStageReady) {
        onStageReady(null);
      }
    };
  }, [onStageReady]);

  // Local state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);

  // Throttle ref for mouse position updates (performance optimization)
  const lastMouseUpdateRef = useRef<number>(0);
  const MOUSE_UPDATE_THROTTLE = 32; // ~30fps for status bar updates

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = viewport.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Calculate zoom direction
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const scaleBy = 1.1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      // Clamp scale
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      // Calculate new position to zoom towards pointer
      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };

      // Constrain viewport to not allow negative canvas coordinates
      setViewport({
        scale: clampedScale,
        x: Math.min(0, newPos.x),
        y: Math.min(0, newPos.y),
      });
    },
    [viewport, setViewport]
  );

  // Place a component at the given canvas position

  const placeComponent = useCallback(
    (symbolId: string, canvasX: number, canvasY: number) => {
      // Check custom symbols first, then fall back to SymbolRegistry
      const definition = customSymbols[symbolId] || SymbolRegistry.getSymbol(symbolId);
      if (!definition) {
        console.warn(`Symbol not found: ${symbolId}`);
        return;
      }

      // Snap position if enabled
      let position = { x: canvasX, y: canvasY };
      if (snapToGrid) {
        position = snapEngine.getNearestGridPoint(position);
      }

      // Create ports from definition
      const ports = definition.ports?.map((portDef) => ({
        id: portDef.id,
        name: portDef.name,
        position: portDef.relativePosition, // Stored as relative, converted to absolute when rendering
        direction: portDef.direction,
        angle: portDef.defaultAngle || 0,
        allowedConnectionTypes: portDef.allowedConnections || ['pipe'],
      })) || [];

      // Use selected system or diagram's system
      const systemKks = selectedSystemKks || diagram?.systemKks || 'DEFAULT';

      // Add the component using command for undo/redo
      executeCommand(new AddComponentCommand({
        type: symbolId,
        systemKks,
        buildingKks: '10UJA',
        position,
        rotation: 0,
        size: definition.defaultSize,
        ports,
        properties: {
          letterCode: definition.propertySchema?.properties?.letterCode?.defaultValue,
        },
        style: {
          strokeColor: '#1a1a1a',
          fillColor: '#ffffff',
          opacity: 1,
        },
      }));
    },
    [customSymbols, snapToGrid, snapEngine, diagram, executeCommand, selectedSystemKks]
  );

  // Handle completing a building polygon
  const handleCompleteBuildingPolygon = useCallback(() => {
    if (buildingPreviewPoints.length < 3) {
      cancelBuildingDrawing();
      return;
    }

    const points = completeBuildingDrawing();

    // Calculate center for label position
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    // Add the building to the diagram
    addBuilding({
      name: 'New Building',
      polygon: points,
      fillColor: 'rgba(200, 220, 255, 0.2)',
      strokeColor: '#64748b',
      strokeWidth: 1,
      labelPosition: { x: centerX, y: centerY },
      labelVisible: true,
      containedItems: [],
      locked: false,
      visible: true,
      zIndex: 0,
    });
  }, [buildingPreviewPoints, completeBuildingDrawing, addBuilding, cancelBuildingDrawing]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle mouse button, space+click, or Ctrl+left click for panning
      const isCtrlPan = e.evt.button === 0 && e.evt.ctrlKey;
      if (e.evt.button === 1 || (e.evt.button === 0 && tool === 'pan') || isCtrlPan) {
        setIsPanning(true);
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            setLastPointerPosition({ x: pointer.x, y: pointer.y });
          }
        }
        e.evt.preventDefault();
        return;
      }

      // Left click on empty canvas in view mode - clear selection (skip if Ctrl held for panning)
      const isBackgroundClick = e.target === e.target.getStage() ||
                                e.target.getClassName() === 'Layer';
      if (e.evt.button === 0 && isBackgroundClick && mode === 'view' && !e.evt.ctrlKey) {
        clearSelection();
        selectBuilding(null);
      }

      // Left click - building tool mode
      if (e.evt.button === 0 && tool === 'building' && isDrawingBuilding) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            const canvasX = (pointer.x - viewport.x) / viewport.scale;
            const canvasY = (pointer.y - viewport.y) / viewport.scale;
            let point = { x: canvasX, y: canvasY };

            // Snap to grid if enabled
            if (snapToGrid) {
              point = snapEngine.getNearestGridPoint(point);
            }

            // Apply 90-degree constraint: lines must be horizontal or vertical
            if (buildingPreviewPoints.length > 0) {
              const lastPoint = buildingPreviewPoints[buildingPreviewPoints.length - 1];
              const dx = Math.abs(point.x - lastPoint.x);
              const dy = Math.abs(point.y - lastPoint.y);

              // Constrain to horizontal or vertical based on which direction is dominant
              if (dx > dy) {
                // Horizontal line - keep Y from last point
                point = { x: point.x, y: lastPoint.y };
              } else {
                // Vertical line - keep X from last point
                point = { x: lastPoint.x, y: point.y };
              }

              // Re-snap after constraining
              if (snapToGrid) {
                point = snapEngine.getNearestGridPoint(point);
                // Maintain the constraint after snapping
                if (dx > dy) {
                  point.y = lastPoint.y;
                } else {
                  point.x = lastPoint.x;
                }
              }
            }

            // Check if we're close to the starting point (to close the polygon)
            if (buildingPreviewPoints.length >= 3) {
              const start = buildingPreviewPoints[0];
              const distance = Math.sqrt(
                Math.pow(point.x - start.x, 2) +
                Math.pow(point.y - start.y, 2)
              );
              const closeThreshold = 20 / viewport.scale;

              if (distance < closeThreshold) {
                // Complete the building
                handleCompleteBuildingPolygon();
                return;
              }
            }

            // Add vertex to the preview
            addBuildingVertex(point);
          }
        }
        return;
      }

      // Left click - component placement mode (Circuit Wizard style)
      if (e.evt.button === 0 && tool === 'component' && placingComponentType) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            const canvasX = (pointer.x - viewport.x) / viewport.scale;
            const canvasY = (pointer.y - viewport.y) / viewport.scale;
            placeComponent(placingComponentType, canvasX, canvasY);
            // Stay in placement mode for multiple placements
          }
        }
        return;
      }

      // Left click while drawing connection - add waypoint
      if (e.evt.button === 0 && isDrawingConnection && e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            const canvasX = (pointer.x - viewport.x) / viewport.scale;
            const canvasY = (pointer.y - viewport.y) / viewport.scale;
            let point = { x: canvasX, y: canvasY };

            // Priority 1: Snap to nearest port alignment (within 20px)
            const PORT_SNAP_THRESHOLD = 20;
            let snappedToPort = false;
            const allComponents = diagram ? Object.values(diagram.components) : [];

            let closestXPort: { x: number; dist: number } | null = null;
            let closestYPort: { y: number; dist: number } | null = null;

            allComponents.forEach(comp => {
              if (!comp.ports) return;
              comp.ports.forEach(port => {
                const portPos = getPortWorldPosition(comp, port);
                const dx = Math.abs(portPos.x - canvasX);
                const dy = Math.abs(portPos.y - canvasY);

                if (dx < PORT_SNAP_THRESHOLD && (!closestXPort || dx < closestXPort.dist)) {
                  closestXPort = { x: portPos.x, dist: dx };
                }
                if (dy < PORT_SNAP_THRESHOLD && (!closestYPort || dy < closestYPort.dist)) {
                  closestYPort = { y: portPos.y, dist: dy };
                }
              });
            });

            // Apply port snapping
            if (closestXPort) {
              point.x = closestXPort.x;
              snappedToPort = true;
            }
            if (closestYPort) {
              point.y = closestYPort.y;
              snappedToPort = true;
            }

            // Priority 2: Snap to grid only if not snapped to port
            if (!snappedToPort && snapToGrid) {
              point = snapEngine.getNearestGridPoint(point);
            }

            // Add waypoint
            addConnectionWaypoint(point);
          }
        }
        return;
      }

      // Left click on empty canvas - start box selection or clear selection
      if (e.evt.button === 0 && e.target === e.target.getStage() && tool === 'select') {
        const stage = stageRef.current;
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            const canvasX = (pointer.x - viewport.x) / viewport.scale;
            const canvasY = (pointer.y - viewport.y) / viewport.scale;

            // Start box selection
            if (!e.evt.shiftKey) {
              clearSelection();
            }
            selectBuilding(null);
            startBoxSelection({ x: canvasX, y: canvasY });
          }
        }
      }
    },
    [tool, placingComponentType, viewport, placeComponent, clearSelection, isDrawingBuilding, isDrawingConnection,
     buildingPreviewPoints, addBuildingVertex, snapToGrid, snapEngine, handleCompleteBuildingPolygon, selectBuilding, startBoxSelection, addConnectionWaypoint, mode]
  );

  // Handle drop from palette
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      console.log('[DiagramCanvas] Drop event received');
      e.preventDefault();

      if (mode === 'view' || !diagram) {
        console.log('[DiagramCanvas] Drop rejected - mode:', mode, 'diagram:', !!diagram);
        return;
      }

      // Get drop data - use text/plain for better browser compatibility
      const dataString = e.dataTransfer.getData('text/plain');
      console.log('[DiagramCanvas] Drop data string:', dataString);
      if (!dataString) {
        console.log('[DiagramCanvas] No data string found in drop event');
        return;
      }

      try {
        const data = JSON.parse(dataString);
        console.log('[DiagramCanvas] Parsed drop data:', data);
        const symbolId = data.symbolId;
        if (!symbolId) {
          console.log('[DiagramCanvas] No symbolId in drop data');
          return;
        }

        // Get drop position relative to container
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;

        // Convert to canvas coordinates
        const canvasX = (dropX - viewport.x) / viewport.scale;
        const canvasY = (dropY - viewport.y) / viewport.scale;

        console.log('[DiagramCanvas] Placing component at:', canvasX, canvasY);
        placeComponent(symbolId, canvasX, canvasY);

        // Clear placing mode
        setPlacingComponentType(null);
        setTool('select');
        console.log('[DiagramCanvas] Component placed successfully');
      } catch (error) {
        console.error('[DiagramCanvas] Failed to parse drop data:', error);
      }
    },
    [mode, diagram, viewport, placeComponent, setPlacingComponentType, setTool]
  );

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Update mouse position in canvas coordinates
      const canvasPos = {
        x: (pointer.x - viewport.x) / viewport.scale,
        y: (pointer.y - viewport.y) / viewport.scale,
      };

      // Throttle mouse position updates for status bar (performance optimization)
      const now = Date.now();
      if (now - lastMouseUpdateRef.current >= MOUSE_UPDATE_THROTTLE) {
        setMousePosition(canvasPos);
        lastMouseUpdateRef.current = now;
      }

      // Handle panning
      if (isPanning && lastPointerPosition) {
        const dx = pointer.x - lastPointerPosition.x;
        const dy = pointer.y - lastPointerPosition.y;

        // Constrain viewport to not allow negative canvas coordinates
        // viewport.x/y <= 0 ensures canvas (0,0) is always visible at or before top-left
        const newX = Math.min(0, viewport.x + dx);
        const newY = Math.min(0, viewport.y + dy);

        setViewport({
          x: newX,
          y: newY,
        });

        setLastPointerPosition({ x: pointer.x, y: pointer.y });
      }

      // Handle connection preview with waypoints
      if (isDrawingConnection && connectionSourceKks && connectionSourcePortId) {
        const sourceComponent = getComponent(connectionSourceKks);
        if (sourceComponent) {
          const sourcePort = findPort(sourceComponent, connectionSourcePortId);
          if (sourcePort) {
            const sourcePos = getPortWorldPosition(sourceComponent, sourcePort);
            // Build preview: source -> waypoints -> cursor
            const previewPoints = [sourcePos, ...connectionWaypoints, canvasPos];
            updateConnectionPreview(previewPoints);
          }
        }
      }

      // Handle box selection
      if (isBoxSelecting) {
        updateBoxSelection(canvasPos);
      }
    },
    [
      isPanning,
      lastPointerPosition,
      viewport,
      setViewport,
      setMousePosition,
      isDrawingConnection,
      connectionSourceKks,
      connectionSourcePortId,
      connectionWaypoints,
      getComponent,
      updateConnectionPreview,
      isBoxSelecting,
      updateBoxSelection,
    ]
  );

  // Handle completing a connection
  const handleCompleteConnection = useCallback(
    (targetKks: string, targetPortId: string) => {
      if (!isDrawingConnection || !connectionSourceKks || !connectionSourcePortId) {
        return;
      }

      // Validate the connection
      const validation = connectionManager.validateNewConnection(
        connectionSourceKks,
        connectionSourcePortId,
        targetKks,
        targetPortId
      );

      if (!validation.valid) {
        console.warn('Invalid connection:', validation.reason);
        cancelConnectionDrawing();
        return;
      }

      // Get source and target components for cross-system check
      const sourceComponent = getComponent(connectionSourceKks);
      const targetComponent = getComponent(targetKks);

      if (!sourceComponent || !targetComponent) {
        cancelConnectionDrawing();
        return;
      }

      // Determine connection type
      // Check custom symbols first, then fall back to SymbolRegistry
      const sourceSymbol = customSymbols[sourceComponent.type] || SymbolRegistry.getSymbol(sourceComponent.type);
      const targetSymbol = customSymbols[targetComponent.type] || SymbolRegistry.getSymbol(targetComponent.type);
      const sourcePortDef = sourceSymbol?.ports?.find(
        (p) => p.id === connectionSourcePortId
      );
      const targetPortDef = targetSymbol?.ports?.find((p) => p.id === targetPortId);

      const connectionType =
        sourcePortDef?.allowedConnections?.includes('signal') &&
        targetPortDef?.allowedConnections?.includes('signal')
          ? 'signal'
          : 'pipe';

      // Get user-defined waypoints and complete drawing (clears state)
      const userWaypoints = completeConnectionDrawing();

      // Create the connection with user-defined waypoints using command for undo/redo
      executeCommand(new AddConnectionCommand({
        type: connectionType,
        sourceComponentKks: connectionSourceKks,
        sourcePortId: connectionSourcePortId,
        targetComponentKks: targetKks,
        targetPortId: targetPortId,
        isCrossSystem: sourceComponent.systemKks !== targetComponent.systemKks,
        sourceSystemKks: sourceComponent.systemKks,
        targetSystemKks: targetComponent.systemKks,
        waypoints: userWaypoints, // User-defined waypoints from click-to-add
        routingType: 'orthogonal',
        visible: true,
        locked: false,
        properties: { custom: {} },
        style: {
          strokeColor: connectionType === 'signal' ? '#2563eb' : '#1a1a1a',
          strokeWidth: connectionType === 'signal' ? 1.5 : 2,
          lineType: connectionType === 'signal' ? 'dashed' : 'solid',
        },
      }));
    },
    [
      isDrawingConnection,
      connectionSourceKks,
      connectionSourcePortId,
      connectionManager,
      getComponent,
      executeCommand,
      completeConnectionDrawing,
      cancelConnectionDrawing,
    ]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setLastPointerPosition(null);
    setGuideLines([]);

    // Complete box selection
    if (isBoxSelecting) {
      const box = endBoxSelection();
      if (box && components.length > 0) {
        // Calculate box bounds
        const minX = Math.min(box.start.x, box.end.x);
        const maxX = Math.max(box.start.x, box.end.x);
        const minY = Math.min(box.start.y, box.end.y);
        const maxY = Math.max(box.start.y, box.end.y);

        // Only select if box is large enough (not just a click)
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;
        if (boxWidth > 5 || boxHeight > 5) {
          // Find components within the box
          const selectedKks: string[] = [];
          for (const component of components) {
            const cx = component.position.x;
            const cy = component.position.y;
            const cw = component.size?.width || 60;
            const ch = component.size?.height || 60;

            // Check if component intersects with selection box
            const compMinX = cx;
            const compMaxX = cx + cw;
            const compMinY = cy;
            const compMaxY = cy + ch;

            if (compMaxX >= minX && compMinX <= maxX && compMaxY >= minY && compMinY <= maxY) {
              selectedKks.push(component.kks);
            }
          }

          if (selectedKks.length > 0) {
            // Find connections between selected components
            const connectionIds = findConnectionsBetweenComponents(selectedKks);
            select(selectedKks, connectionIds);
          }
        }
      }
    }
  }, [isBoxSelecting, endBoxSelection, components, select, findConnectionsBetweenComponents]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
    setIsPanning(false);
    setLastPointerPosition(null);
  }, [setMousePosition]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in an input or contentEditable element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Don't capture if inside the description editor modal
      if (e.target instanceof HTMLElement && e.target.closest('[data-description-editor="true"]')) {
        return;
      }

      // Space or Ctrl for pan mode
      if ((e.code === 'Space' || e.key === 'Control') && !e.repeat) {
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }

      // Backspace to remove last waypoint during connection drawing
      if (e.code === 'Backspace' && isDrawingConnection) {
        e.preventDefault();
        removeLastWaypoint();
        return;
      }

      // Escape to cancel current operation
      if (e.code === 'Escape') {
        if (placingComponentType) {
          setPlacingComponentType(null);
          setTool('select');
        } else if (isDrawingConnection) {
          // If there are waypoints, remove the last one; otherwise cancel entirely
          if (connectionWaypoints.length > 0) {
            removeLastWaypoint();
          } else {
            cancelConnectionDrawing();
          }
        } else if (isDrawingBuilding) {
          cancelBuildingDrawing();
        } else {
          clearSelection();
          selectBuilding(null);
        }
        setGuideLines([]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Control') {
        if (containerRef.current && !isPanning) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [clearSelection, placingComponentType, setPlacingComponentType, setTool, isDrawingConnection, cancelConnectionDrawing, isDrawingBuilding, cancelBuildingDrawing, selectBuilding, connectionWaypoints, removeLastWaypoint, isPanning]);

  // Update cursor based on tool
  useEffect(() => {
    if (!containerRef.current) return;

    switch (tool) {
      case 'pan':
        containerRef.current.style.cursor = isPanning ? 'grabbing' : 'grab';
        break;
      case 'select':
        containerRef.current.style.cursor = 'default';
        break;
      case 'component':
        containerRef.current.style.cursor = 'crosshair';
        break;
      case 'pipe':
        containerRef.current.style.cursor = 'crosshair';
        break;
      case 'building':
        containerRef.current.style.cursor = 'crosshair';
        break;
      default:
        containerRef.current.style.cursor = 'default';
    }
  }, [tool, isPanning]);

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: canvasDarkMode ? '#111827' : '#f3f4f6',
      }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.x}
        y={viewport.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        draggable={false}
      >
        {/* Canvas Boundary Layer (shows working area) */}
        <CanvasBoundary
          width={diagramCanvasWidth}
          height={diagramCanvasHeight}
          scale={viewport.scale}
          visible={true}
          darkMode={canvasDarkMode}
        />

        {/* Grid Layer - only visible in edit mode */}
        <GridLayer
          width={width}
          height={height}
          gridSize={gridSize}
          visible={gridVisible && mode === 'draw'}
          scale={viewport.scale}
          offsetX={viewport.x}
          offsetY={viewport.y}
          darkMode={canvasDarkMode}
        />

        {/* Axis Reference Overlay (visual only, non-interactive) - only in edit mode */}
        <AxisOverlay
          viewportWidth={width}
          viewportHeight={height}
          scale={viewport.scale}
          offsetX={viewport.x}
          offsetY={viewport.y}
          cellSize={100}
          showLines={axisLinesVisible}
          visible={axisOverlayVisible && mode === 'draw'}
        />

        {/* Buildings Layer (rendered behind connections and components) */}
        <BuildingsLayer scale={viewport.scale} mode={mode} />

        {/* Connections Layer (rendered below components) */}
        <ConnectionsLayer />

        {/* Components Layer */}
        <ComponentsLayer
          snapEngine={snapEngine}
          onCompleteConnection={handleCompleteConnection}
        />

        {/* Guide Lines Layer (for snap alignment) */}
        <Layer listening={false}>
          {guideLines.map((line, i) => (
            <Line
              key={`guide-${i}`}
              points={
                line.orientation === 'vertical'
                  ? [line.position, line.start, line.position, line.end]
                  : [line.start, line.position, line.end, line.position]
              }
              stroke="#3b82f6"
              strokeWidth={1 / viewport.scale}
              dash={[4 / viewport.scale, 4 / viewport.scale]}
            />
          ))}
        </Layer>

        {/* Interaction Layer (selection box, previews) */}
        <Layer listening={false}>
          {/* Box Selection Rectangle */}
          {isBoxSelecting && boxSelectionStart && boxSelectionEnd && (
            <Rect
              x={Math.min(boxSelectionStart.x, boxSelectionEnd.x)}
              y={Math.min(boxSelectionStart.y, boxSelectionEnd.y)}
              width={Math.abs(boxSelectionEnd.x - boxSelectionStart.x)}
              height={Math.abs(boxSelectionEnd.y - boxSelectionStart.y)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1 / viewport.scale}
              dash={[4 / viewport.scale, 4 / viewport.scale]}
            />
          )}
        </Layer>
      </Stage>

      {/* Empty state message */}
      {!diagram && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#9ca3af',
            pointerEvents: 'none',
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            style={{ margin: '0 auto 16px' }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>No Diagram Open</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Create a new diagram or open an existing one
          </p>
        </div>
      )}

      {/* System KKS Display - shows current system */}
      {diagram && selectedSystemKks && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(37, 99, 235, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'monospace',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span style={{ opacity: 0.8, fontSize: '12px', marginRight: '8px' }}>System:</span>
          {selectedSystemKks}
        </div>
      )}

      {/* Canvas info overlay (for development) */}
      {diagram && components.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#9ca3af',
            pointerEvents: 'none',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            style={{ margin: '0 auto 12px' }}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <p style={{ fontSize: '14px', margin: 0 }}>
            Drag components from the palette to start drawing
          </p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#d1d5db' }}>
            Mode: {mode.toUpperCase()} | Zoom: {Math.round(viewport.scale * 100)}%
          </p>
        </div>
      )}

      {/* KKS Hover Tooltip */}
      <KKSHoverTooltip
        containerRef={containerRef as React.RefObject<HTMLElement>}
        onOpenSystem={onOpenSystem}
        onOpenDescription={(componentKks, viewOnly) => {
          // Select the component and signal to open description
          select([componentKks], []);
          useUIStore.getState().setPendingDescriptionOpen(componentKks, viewOnly);
        }}
      />

      {/* Copy KKS Button - appears when components are selected */}
      <CopyKKSButton
        containerRef={containerRef as React.RefObject<HTMLElement>}
      />
    </div>
  );
};

export default DiagramCanvas;
