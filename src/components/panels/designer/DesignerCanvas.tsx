/**
 * Designer Canvas Component
 *
 * Konva-based drawing surface for the Visual Component Designer.
 * Features:
 * - Grid overlay with configurable spacing
 * - Rulers on top and left edges
 * - Mouse event handling for all drawing tools
 * - Real-time preview of shapes being drawn
 * - Coordinate conversion (pixels ↔ relative 0-1)
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Line, Rect, Circle as KonvaCircle, Group, Text } from 'react-konva';
import { useDesignerStore, DESIGN_AREA_SIZE } from '../../../store/designerStore';
import type { Point } from '../../../types';
import type { SymbolPath, PathStyle } from '../../../types/symbol.types';

interface DesignerCanvasProps {
  width?: number;
  height?: number;
}

// Calculate design area offset (centered on canvas)
const getDesignAreaOffset = (canvasWidth: number, canvasHeight: number): Point => ({
  x: (canvasWidth - DESIGN_AREA_SIZE) / 2,
  y: (canvasHeight - DESIGN_AREA_SIZE) / 2,
});

// Coordinate conversion utilities (design area relative 0-1 ↔ canvas pixels)
const pixelToRelative = (pixel: Point, designAreaOffset: Point): Point => ({
  x: (pixel.x - designAreaOffset.x) / DESIGN_AREA_SIZE,
  y: (pixel.y - designAreaOffset.y) / DESIGN_AREA_SIZE,
});

const relativeToPixel = (relative: Point, designAreaOffset: Point): Point => ({
  x: relative.x * DESIGN_AREA_SIZE + designAreaOffset.x,
  y: relative.y * DESIGN_AREA_SIZE + designAreaOffset.y,
});

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  width = 4000,
  height = 4000,
}) => {
  const {
    activeTool,
    paths,
    ports,
    centerPoint,
    gridVisible,
    gridSize,
    addPath,
    addPort,
    setCenterPoint,
    selectedPathIndex,
    selectPath,
    selectedPathIndices,
    selectPaths,
    clearSelection,
    moveSelectedPaths,
    zoom,
    panOffset,
    setZoom,
    setPanOffset,
  } = useDesignerStore();

  const stageRef = useRef<any>(null);

  // Calculate design area offset (centered on canvas)
  const designAreaOffset = useMemo(
    () => getDesignAreaOffset(width, height),
    [width, height]
  );

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [ctrlPressed, setCtrlPressed] = useState(false);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  // Measure tool state
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);

  // Selection rectangle state
  const [selectionRect, setSelectionRect] = useState<{
    start: Point;
    end: Point;
  } | null>(null);

  // Dragging selected items state
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);

  // Snap settings
  const SNAP_THRESHOLD = 8; // pixels
  const snapToGrid = true;
  const ANGLE_SNAP_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]; // degrees

  // Get all snap points from existing paths and ports (including edges, centers, and midpoints)
  const getSnapPoints = useCallback((): Point[] => {
    const snapPoints: Point[] = [];

    // Add points from polygon being drawn (if any)
    if (polygonPoints.length > 0) {
      // Add all vertices
      polygonPoints.forEach((p) => snapPoints.push(p));

      // Add edge midpoints
      for (let i = 0; i < polygonPoints.length - 1; i++) {
        const p1 = polygonPoints[i];
        const p2 = polygonPoints[i + 1];
        snapPoints.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
      }

      // Add center of polygon (if 3+ points)
      if (polygonPoints.length >= 3) {
        const avgX = polygonPoints.reduce((sum, p) => sum + p.x, 0) / polygonPoints.length;
        const avgY = polygonPoints.reduce((sum, p) => sum + p.y, 0) / polygonPoints.length;
        snapPoints.push({ x: avgX, y: avgY });
      }
    }

    // Add points from existing paths
    paths.forEach((path) => {
      if (path.type === 'line') {
        const data = path.data as { x1: number; y1: number; x2: number; y2: number };
        const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
        const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);
        // Endpoints
        snapPoints.push(p1, p2);
        // Midpoint
        snapPoints.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
      } else if (path.type === 'rect') {
        const data = path.data as { x: number; y: number; width: number; height: number };
        const topLeft = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
        const bottomRight = relativeToPixel({ x: data.x + data.width, y: data.y + data.height }, designAreaOffset);
        // Corners
        snapPoints.push(topLeft);
        snapPoints.push({ x: bottomRight.x, y: topLeft.y });
        snapPoints.push({ x: topLeft.x, y: bottomRight.y });
        snapPoints.push(bottomRight);
        // Center
        snapPoints.push({ x: (topLeft.x + bottomRight.x) / 2, y: (topLeft.y + bottomRight.y) / 2 });
        // Edge midpoints
        snapPoints.push({ x: (topLeft.x + bottomRight.x) / 2, y: topLeft.y }); // Top
        snapPoints.push({ x: (topLeft.x + bottomRight.x) / 2, y: bottomRight.y }); // Bottom
        snapPoints.push({ x: topLeft.x, y: (topLeft.y + bottomRight.y) / 2 }); // Left
        snapPoints.push({ x: bottomRight.x, y: (topLeft.y + bottomRight.y) / 2 }); // Right
      } else if (path.type === 'circle') {
        const data = path.data as { cx: number; cy: number; r: number };
        const center = relativeToPixel({ x: data.cx, y: data.cy }, designAreaOffset);
        const radius = data.r * DESIGN_AREA_SIZE;
        // Center
        snapPoints.push(center);
        // Cardinal points (N, S, E, W)
        snapPoints.push({ x: center.x, y: center.y - radius });
        snapPoints.push({ x: center.x, y: center.y + radius });
        snapPoints.push({ x: center.x + radius, y: center.y });
        snapPoints.push({ x: center.x - radius, y: center.y });
      } else if (path.type === 'polygon') {
        const data = path.data as { points: Point[] };
        const pixelPoints = data.points.map((p) => relativeToPixel(p, designAreaOffset));
        // Vertices
        pixelPoints.forEach((p) => snapPoints.push(p));
        // Edge midpoints
        for (let i = 0; i < pixelPoints.length; i++) {
          const p1 = pixelPoints[i];
          const p2 = pixelPoints[(i + 1) % pixelPoints.length];
          snapPoints.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
        }
      }
    });

    // Add ports
    ports.forEach((port) => {
      snapPoints.push(relativeToPixel(port.relativePosition, designAreaOffset));
    });

    return snapPoints;
  }, [paths, ports, designAreaOffset, polygonPoints]);

  // Snap point to grid or nearby points
  const snapPoint = useCallback((point: Point): Point => {
    let snappedPoint = { ...point };

    // First, try to snap to existing points
    const snapPoints = getSnapPoints();
    for (const snapPt of snapPoints) {
      const dx = Math.abs(point.x - snapPt.x);
      const dy = Math.abs(point.y - snapPt.y);
      if (dx < SNAP_THRESHOLD && dy < SNAP_THRESHOLD) {
        return snapPt;
      }
    }

    // Then snap to grid
    if (snapToGrid && gridVisible) {
      snappedPoint.x = Math.round(point.x / gridSize) * gridSize;
      snappedPoint.y = Math.round(point.y / gridSize) * gridSize;
    }

    return snappedPoint;
  }, [gridSize, gridVisible, getSnapPoints]);

  // Apply angle snapping when Ctrl is pressed
  const applyAngleSnapping = useCallback((start: Point, end: Point): Point => {
    if (!ctrlPressed || !start) return end;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return end;

    // Calculate current angle in degrees
    let currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (currentAngle < 0) currentAngle += 360;

    // Find nearest snap angle
    let nearestAngle = ANGLE_SNAP_ANGLES[0];
    let minDiff = Math.abs(currentAngle - nearestAngle);

    for (const snapAngle of ANGLE_SNAP_ANGLES) {
      const diff = Math.abs(currentAngle - snapAngle);
      if (diff < minDiff) {
        minDiff = diff;
        nearestAngle = snapAngle;
      }
    }

    // Convert back to radians and calculate new endpoint
    const angleRad = nearestAngle * (Math.PI / 180);
    return {
      x: start.x + distance * Math.cos(angleRad),
      y: start.y + distance * Math.sin(angleRad),
    };
  }, [ctrlPressed]);

  // Apply orthogonal constraint (axis-aligned) when Shift is pressed
  const applyOrthogonalConstraint = useCallback((start: Point, end: Point): Point => {
    if (!shiftPressed || !start) return end;

    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);

    // Snap to horizontal or vertical based on which is closer
    if (dx > dy) {
      return { x: end.x, y: start.y }; // Horizontal
    } else {
      return { x: start.x, y: end.y }; // Vertical
    }
  }, [shiftPressed]);

  // Check if a path is inside selection rectangle
  const isPathInSelection = useCallback((pathIndex: number, rect: { start: Point; end: Point }): boolean => {
    const path = paths[pathIndex];
    if (!path) return false;

    const minX = Math.min(rect.start.x, rect.end.x);
    const maxX = Math.max(rect.start.x, rect.end.x);
    const minY = Math.min(rect.start.y, rect.end.y);
    const maxY = Math.max(rect.start.y, rect.end.y);

    if (path.type === 'line') {
      const data = path.data as { x1: number; y1: number; x2: number; y2: number };
      const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
      const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);
      return (
        (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
        (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY)
      );
    } else if (path.type === 'rect') {
      const data = path.data as { x: number; y: number; width: number; height: number };
      const topLeft = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
      const bottomRight = relativeToPixel({ x: data.x + data.width, y: data.y + data.height }, designAreaOffset);
      return !(bottomRight.x < minX || topLeft.x > maxX || bottomRight.y < minY || topLeft.y > maxY);
    } else if (path.type === 'circle') {
      const data = path.data as { cx: number; cy: number; r: number };
      const center = relativeToPixel({ x: data.cx, y: data.cy }, designAreaOffset);
      const radius = data.r * DESIGN_AREA_SIZE;
      return center.x + radius >= minX && center.x - radius <= maxX &&
             center.y + radius >= minY && center.y - radius <= maxY;
    } else if (path.type === 'polygon') {
      const data = path.data as { points: Array<{ x: number; y: number }> };
      return data.points.some((p) => {
        const pixel = relativeToPixel(p, designAreaOffset);
        return pixel.x >= minX && pixel.x <= maxX && pixel.y >= minY && pixel.y <= maxY;
      });
    }

    return false;
  }, [paths, designAreaOffset]);

  // Get mouse position relative to stage (accounting for zoom and pan)
  const getMousePos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return null;

    // Account for zoom and pan
    const rawPos = {
      x: (pointerPos.x - panOffset.x) / zoom,
      y: (pointerPos.y - panOffset.y) / zoom,
    };

    // Clamp to canvas bounds
    const clampedPos = {
      x: Math.max(0, Math.min(width, rawPos.x)),
      y: Math.max(0, Math.min(height, rawPos.y)),
    };

    // Apply snapping
    return snapPoint(clampedPos);
  }, [width, height, snapPoint, zoom, panOffset]);

  // Handle mouse click (click-to-place mode)
  const handleMouseDown = useCallback(() => {
    const pos = getMousePos();
    if (!pos) return;

    if (activeTool === 'select') {
      // Check if clicking on a selected shape to start dragging
      const clickedOnSelected = selectedPathIndices.some((index) => {
        const path = paths[index];
        if (!path) return false;
        // Simple click detection - can be improved
        return isPathInSelection(index, { start: pos, end: { x: pos.x + 5, y: pos.y + 5 } });
      });

      if (clickedOnSelected) {
        // Start dragging selection
        setIsDraggingSelection(true);
        setDragStartPoint(pos);
      } else {
        // Start selection rectangle
        setSelectionRect({ start: pos, end: pos });
        clearSelection();
      }
    } else if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle') {
      if (!isDrawing) {
        // First click: start drawing
        setIsDrawing(true);
        setStartPoint(pos);
        setCurrentPoint(pos);
      } else {
        // Second click: finalize shape
        if (!startPoint || !currentPoint) return;

        const relativeStart = pixelToRelative(startPoint, designAreaOffset);
        const relativeEnd = pixelToRelative(currentPoint, designAreaOffset);

        const defaultStyle: PathStyle = {
          stroke: 'inherit',  // Use 'inherit' so symbols respond to hover/selection colors
          strokeWidth: 2,
          fill: 'transparent',
        };

        if (activeTool === 'line') {
          const path: SymbolPath = {
            type: 'line',
            data: {
              x1: relativeStart.x,
              y1: relativeStart.y,
              x2: relativeEnd.x,
              y2: relativeEnd.y,
            },
            style: defaultStyle,
          };
          addPath(path);
        } else if (activeTool === 'rectangle') {
          const x = Math.min(relativeStart.x, relativeEnd.x);
          const y = Math.min(relativeStart.y, relativeEnd.y);
          const w = Math.abs(relativeEnd.x - relativeStart.x);
          const h = Math.abs(relativeEnd.y - relativeStart.y);

          const path: SymbolPath = {
            type: 'rect',
            data: { x, y, width: w, height: h },
            style: defaultStyle,
          };
          addPath(path);
        } else if (activeTool === 'circle') {
          // First click is center, second click is edge point
          const cx = relativeStart.x;
          const cy = relativeStart.y;
          const dx = relativeEnd.x - relativeStart.x;
          const dy = relativeEnd.y - relativeStart.y;
          const radius = Math.sqrt(dx * dx + dy * dy);

          const path: SymbolPath = {
            type: 'circle',
            data: { cx, cy, r: radius },
            style: defaultStyle,
          };
          addPath(path);
        }

        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
      }
    } else if (activeTool === 'polygon') {
      setPolygonPoints((prev) => [...prev, pos]);
    } else if (activeTool === 'port') {
      // Add port immediately
      const relativePos = pixelToRelative(pos, designAreaOffset);
      const portId = `port-${Date.now()}`;
      addPort({
        id: portId,
        name: `Port ${ports.length + 1}`,
        relativePosition: relativePos,
        direction: 'bidirectional',
        defaultAngle: 0,
        allowedConnections: ['pipe'],
      });
    } else if (activeTool === 'centerpoint') {
      // Set center point for alignment
      const relativePos = pixelToRelative(pos, designAreaOffset);
      setCenterPoint(relativePos);
    } else if (activeTool === 'measure') {
      // Measure tool: click twice to measure distance
      if (!measureStart) {
        setMeasureStart(pos);
        setMeasureEnd(pos);
      } else {
        setMeasureEnd(pos);
      }
    }
  }, [activeTool, getMousePos, width, height, addPort, setCenterPoint, ports.length, isDrawing, startPoint, currentPoint, addPath, measureStart]);

  // Handle mouse move
  const handleMouseMove = useCallback(() => {
    const pos = getMousePos();
    if (!pos) return;

    if (activeTool === 'select') {
      if (selectionRect) {
        // Update selection rectangle
        setSelectionRect({ ...selectionRect, end: pos });
      } else if (isDraggingSelection && dragStartPoint) {
        // Drag selected items
        const dx = pos.x - dragStartPoint.x;
        const dy = pos.y - dragStartPoint.y;
        moveSelectedPaths(dx, dy);
        setDragStartPoint(pos);
      }
    } else if (isDrawing && (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle')) {
      let constrainedPos = pos;

      // Apply angle snapping when Ctrl is pressed
      if (ctrlPressed && startPoint && (activeTool === 'line')) {
        constrainedPos = applyAngleSnapping(startPoint, pos);
      }
      // Apply orthogonal constraint when Shift is pressed
      else if (shiftPressed && startPoint && (activeTool === 'line')) {
        constrainedPos = applyOrthogonalConstraint(startPoint, pos);
      }

      setCurrentPoint(constrainedPos);
    } else if (activeTool === 'polygon' && polygonPoints.length > 0) {
      const lastPoint = polygonPoints[polygonPoints.length - 1];
      let constrainedPos = pos;

      // Apply angle snapping when Ctrl is pressed
      if (ctrlPressed) {
        constrainedPos = applyAngleSnapping(lastPoint, pos);
      }
      // Apply orthogonal constraint when Shift is pressed
      else if (shiftPressed) {
        constrainedPos = applyOrthogonalConstraint(lastPoint, pos);
      }

      setCurrentPoint(constrainedPos);
    } else if (activeTool === 'measure' && measureStart) {
      // Update measure end point
      setMeasureEnd(pos);
    } else {
      // Update current point for preview even when not drawing
      setCurrentPoint(pos);
    }
  }, [isDrawing, activeTool, polygonPoints, getMousePos, startPoint, applyOrthogonalConstraint, applyAngleSnapping, ctrlPressed, shiftPressed, measureStart]);


  // Handle polygon double-click to complete
  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'polygon' && polygonPoints.length >= 3) {
      const relativePoints = polygonPoints.map((p) => pixelToRelative(p, designAreaOffset));

      const path: SymbolPath = {
        type: 'polygon',
        data: { points: relativePoints },
        style: {
          stroke: 'inherit',  // Use 'inherit' so symbols respond to hover/selection colors
          strokeWidth: 2,
          fill: 'transparent',
        },
      };
      addPath(path);
      setPolygonPoints([]);
      setCurrentPoint(null);
    }
  }, [activeTool, polygonPoints, designAreaOffset, addPath]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldZoom = zoom;
    const pointer = stage.getPointerPosition();

    const scaleBy = 1.1;
    const newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));

    // Adjust pan offset to zoom towards mouse position
    const mousePointTo = {
      x: (pointer.x - panOffset.x) / oldZoom,
      y: (pointer.y - panOffset.y) / oldZoom,
    };

    const newOffset = {
      x: pointer.x - mousePointTo.x * clampedZoom,
      y: pointer.y - mousePointTo.y * clampedZoom,
    };

    setZoom(clampedZoom);
    setPanOffset(newOffset);
  }, [zoom, panOffset, setZoom, setPanOffset]);

  // Middle mouse button pan handler
  const handleStageMouseDown = useCallback((e: any) => {
    if (e.evt.button === 1) { // Middle mouse button
      e.evt.preventDefault();
      setIsPanning(true);
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        setLastPanPoint(pos);
      }
    } else {
      handleMouseDown();
    }
  }, [handleMouseDown]);

  const handleStageMouseMove = useCallback((e: any) => {
    if (isPanning && lastPanPoint) {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      const dx = pos.x - lastPanPoint.x;
      const dy = pos.y - lastPanPoint.y;

      setPanOffset({
        x: panOffset.x + dx,
        y: panOffset.y + dy,
      });

      setLastPanPoint(pos);
    } else {
      handleMouseMove();
    }
  }, [isPanning, lastPanPoint, panOffset, setPanOffset, handleMouseMove]);

  const handleStageMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
    }

    // Handle selection rectangle finalization
    if (activeTool === 'select' && selectionRect) {
      // Find all paths inside selection rectangle
      const selectedIndices: number[] = [];
      paths.forEach((_, index) => {
        if (isPathInSelection(index, selectionRect)) {
          selectedIndices.push(index);
        }
      });
      selectPaths(selectedIndices);
      setSelectionRect(null);
    }

    // Stop dragging selection
    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      setDragStartPoint(null);
    }
  }, [isPanning, activeTool, selectionRect, isDraggingSelection, paths, isPathInSelection, selectPaths]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel drawing
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        setPolygonPoints([]);
        setMeasureStart(null);
        setMeasureEnd(null);
      } else if (e.key === 'Enter' && activeTool === 'polygon' && polygonPoints.length >= 3) {
        // Complete polygon with Enter key
        const relativePoints = polygonPoints.map((p) => pixelToRelative(p, designAreaOffset));
        const path: SymbolPath = {
          type: 'polygon',
          data: { points: relativePoints },
          style: {
            stroke: 'inherit',  // Use 'inherit' so symbols respond to hover/selection colors
            strokeWidth: 2,
            fill: 'transparent',
          },
        };
        addPath(path);
        setPolygonPoints([]);
        setCurrentPoint(null);
      } else if (e.key === 'Shift') {
        setShiftPressed(true);
      } else if (e.key === 'Control') {
        setCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      } else if (e.key === 'Control') {
        setCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, polygonPoints, designAreaOffset, addPath]);

  // Render a path on the canvas
  const renderPath = (path: SymbolPath, index: number) => {
    const isSelected = selectedPathIndex === index;
    // Handle 'inherit' stroke by showing as black in designer canvas
    const baseStroke = path.style.stroke === 'inherit' ? '#000000' : (path.style.stroke || '#000000');
    const strokeColor = isSelected ? '#2563eb' : baseStroke;
    const strokeWidth = path.style.strokeWidth || 2;

    if (path.type === 'line') {
      const data = path.data as { x1: number; y1: number; x2: number; y2: number };
      const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
      const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);
      return (
        <Line
          key={`path-${index}`}
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          onClick={() => selectPath(index)}
          listening={activeTool === 'select'}
        />
      );
    } else if (path.type === 'rect') {
      const data = path.data as { x: number; y: number; width: number; height: number };
      const topLeft = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
      const bottomRight = relativeToPixel({ x: data.x + data.width, y: data.y + data.height }, designAreaOffset);
      return (
        <Rect
          key={`path-${index}`}
          x={topLeft.x}
          y={topLeft.y}
          width={bottomRight.x - topLeft.x}
          height={bottomRight.y - topLeft.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={path.style.fill === 'inherit' ? 'transparent' : path.style.fill}
          onClick={() => selectPath(index)}
          listening={activeTool === 'select'}
        />
      );
    } else if (path.type === 'circle') {
      const data = path.data as { cx: number; cy: number; r: number };
      const center = relativeToPixel({ x: data.cx, y: data.cy }, designAreaOffset);
      const radius = data.r * DESIGN_AREA_SIZE;
      return (
        <KonvaCircle
          key={`path-${index}`}
          x={center.x}
          y={center.y}
          radius={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={path.style.fill === 'inherit' ? 'transparent' : path.style.fill}
          onClick={() => selectPath(index)}
          listening={activeTool === 'select'}
        />
      );
    } else if (path.type === 'polygon') {
      const data = path.data as { points: Point[] };
      const points = data.points.flatMap((p) => {
        const pixel = relativeToPixel(p, designAreaOffset);
        return [pixel.x, pixel.y];
      });
      return (
        <Line
          key={`path-${index}`}
          points={points}
          closed
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={path.style.fill === 'inherit' ? 'transparent' : path.style.fill}
          onClick={() => selectPath(index)}
          listening={activeTool === 'select'}
        />
      );
    }

    return null;
  };

  // Render preview of shape being drawn
  const renderPreview = () => {
    if (!isDrawing || !startPoint || !currentPoint) return null;

    const previewStyle = {
      stroke: '#2563eb',
      strokeWidth: 2,
      dash: [5, 5],
    };

    if (activeTool === 'line') {
      return (
        <Line
          points={[startPoint.x, startPoint.y, currentPoint.x, currentPoint.y]}
          {...previewStyle}
        />
      );
    } else if (activeTool === 'rectangle') {
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);
      const w = Math.abs(currentPoint.x - startPoint.x);
      const h = Math.abs(currentPoint.y - startPoint.y);
      return <Rect x={x} y={y} width={w} height={h} {...previewStyle} fill="transparent" />;
    } else if (activeTool === 'circle') {
      // First click is center, current mouse is edge
      const cx = startPoint.x;
      const cy = startPoint.y;
      const dx = currentPoint.x - startPoint.x;
      const dy = currentPoint.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return (
        <>
          <KonvaCircle x={cx} y={cy} radius={radius} {...previewStyle} fill="transparent" />
          {/* Center crosshair */}
          <Line points={[cx - 5, cy, cx + 5, cy]} stroke="#2563eb" strokeWidth={1} />
          <Line points={[cx, cy - 5, cx, cy + 5]} stroke="#2563eb" strokeWidth={1} />
        </>
      );
    }

    return null;
  };

  // Render polygon preview
  const renderPolygonPreview = () => {
    if (activeTool !== 'polygon' || polygonPoints.length === 0) return null;

    const allPoints = currentPoint ? [...polygonPoints, currentPoint] : polygonPoints;
    const points = allPoints.flatMap((p) => [p.x, p.y]);

    return (
      <>
        <Line
          points={points}
          stroke="#2563eb"
          strokeWidth={2}
          dash={[5, 5]}
        />
        {polygonPoints.map((p, i) => (
          <KonvaCircle
            key={`polygon-point-${i}`}
            x={p.x}
            y={p.y}
            radius={4}
            fill="#2563eb"
          />
        ))}
      </>
    );
  };

  // Render measure tool
  const renderMeasure = () => {
    if (activeTool !== 'measure' || !measureStart) return null;

    const endPoint = measureEnd || measureStart;
    const dx = endPoint.x - measureStart.x;
    const dy = endPoint.y - measureStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const midX = (measureStart.x + endPoint.x) / 2;
    const midY = (measureStart.y + endPoint.y) / 2;

    return (
      <Group>
        {/* Measurement line */}
        <Line
          points={[measureStart.x, measureStart.y, endPoint.x, endPoint.y]}
          stroke="#f59e0b"
          strokeWidth={2}
          dash={[5, 5]}
        />
        {/* Start point */}
        <KonvaCircle
          x={measureStart.x}
          y={measureStart.y}
          radius={5}
          fill="#f59e0b"
        />
        {/* End point */}
        <KonvaCircle
          x={endPoint.x}
          y={endPoint.y}
          radius={5}
          fill="#f59e0b"
        />
        {/* Length label */}
        <Rect
          x={midX - 40}
          y={midY - 20}
          width={80}
          height={24}
          fill="white"
          stroke="#f59e0b"
          strokeWidth={2}
          cornerRadius={4}
        />
        <Text
          x={midX - 35}
          y={midY - 14}
          text={`${length.toFixed(1)}px`}
          fontSize={12}
          fill="#f59e0b"
          fontStyle="bold"
        />
      </Group>
    );
  };

  // Render selection rectangle
  const renderSelectionRect = () => {
    if (!selectionRect) return null;

    const minX = Math.min(selectionRect.start.x, selectionRect.end.x);
    const minY = Math.min(selectionRect.start.y, selectionRect.end.y);
    const width = Math.abs(selectionRect.end.x - selectionRect.start.x);
    const height = Math.abs(selectionRect.end.y - selectionRect.start.y);

    return (
      <Rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[5, 5]}
        fill="rgba(59, 130, 246, 0.1)"
      />
    );
  };

  // Render selected paths highlight
  const renderSelectedHighlight = () => {
    return selectedPathIndices.map((index) => {
      const path = paths[index];
      if (!path) return null;

      const highlightStyle = {
        stroke: '#3b82f6',
        strokeWidth: 3,
        dash: [5, 5],
        fill: 'transparent',
      };

      if (path.type === 'line') {
        const data = path.data as { x1: number; y1: number; x2: number; y2: number };
        const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
        const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);
        return (
          <Line
            key={`highlight-${index}`}
            points={[p1.x, p1.y, p2.x, p2.y]}
            {...highlightStyle}
          />
        );
      } else if (path.type === 'rect') {
        const data = path.data as { x: number; y: number; width: number; height: number };
        const topLeft = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
        const bottomRight = relativeToPixel({ x: data.x + data.width, y: data.y + data.height }, designAreaOffset);
        return (
          <Rect
            key={`highlight-${index}`}
            x={topLeft.x}
            y={topLeft.y}
            width={bottomRight.x - topLeft.x}
            height={bottomRight.y - topLeft.y}
            {...highlightStyle}
          />
        );
      } else if (path.type === 'circle') {
        const data = path.data as { cx: number; cy: number; r: number };
        const center = relativeToPixel({ x: data.cx, y: data.cy }, designAreaOffset);
        const radius = data.r * DESIGN_AREA_SIZE;
        return (
          <KonvaCircle
            key={`highlight-${index}`}
            x={center.x}
            y={center.y}
            radius={radius}
            {...highlightStyle}
          />
        );
      } else if (path.type === 'polygon') {
        const data = path.data as { points: Array<{ x: number; y: number }> };
        const points = data.points.flatMap((p) => {
          const pixel = relativeToPixel(p, designAreaOffset);
          return [pixel.x, pixel.y];
        });
        return (
          <Line
            key={`highlight-${index}`}
            points={points}
            closed
            {...highlightStyle}
          />
        );
      }

      return null;
    });
  };

  // Render guiding lines (alignment guides)
  const renderGuidingLines = () => {
    if (!currentPoint) return null;

    const snapPoints = getSnapPoints();
    const guides: JSX.Element[] = [];
    const GUIDE_THRESHOLD = 2; // pixels

    // Check for horizontal and vertical alignments
    snapPoints.forEach((snapPt, idx) => {
      // Vertical alignment (same x)
      if (Math.abs(currentPoint.x - snapPt.x) < GUIDE_THRESHOLD) {
        guides.push(
          <Line
            key={`guide-v-${idx}`}
            points={[snapPt.x, 0, snapPt.x, height]}
            stroke="#ff6b9d"
            strokeWidth={1}
            dash={[4, 4]}
            opacity={0.6}
          />
        );
      }

      // Horizontal alignment (same y)
      if (Math.abs(currentPoint.y - snapPt.y) < GUIDE_THRESHOLD) {
        guides.push(
          <Line
            key={`guide-h-${idx}`}
            points={[0, snapPt.y, width, snapPt.y]}
            stroke="#ff6b9d"
            strokeWidth={1}
            dash={[4, 4]}
            opacity={0.6}
          />
        );
      }
    });

    return <>{guides}</>;
  };

  // Helper to calculate angle in degrees from horizontal (0-360)
  const calculateAngle = (dx: number, dy: number): number => {
    let angle = Math.atan2(-dy, dx) * (180 / Math.PI); // -dy because canvas Y is inverted
    if (angle < 0) angle += 360;
    return angle;
  };

  // Find if a point connects to an existing line endpoint and return the connected line's direction
  const findConnectedLineAngle = (point: Point): number | null => {
    const threshold = SNAP_THRESHOLD;

    for (const path of paths) {
      if (path.type === 'line') {
        const data = path.data as { x1: number; y1: number; x2: number; y2: number };
        const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
        const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);

        // Check if point is near p1 (start of existing line)
        const dist1 = Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);
        if (dist1 < threshold) {
          // Return angle of existing line going from p1 to p2
          return calculateAngle(p2.x - p1.x, p2.y - p1.y);
        }

        // Check if point is near p2 (end of existing line)
        const dist2 = Math.sqrt((point.x - p2.x) ** 2 + (point.y - p2.y) ** 2);
        if (dist2 < threshold) {
          // Return angle of existing line going from p2 to p1 (reversed direction)
          return calculateAngle(p1.x - p2.x, p1.y - p2.y);
        }
      }
    }
    return null;
  };

  // Calculate angle between two angles (0-180 degrees)
  const angleBetween = (angle1: number, angle2: number): number => {
    let diff = Math.abs(angle1 - angle2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  };

  // Render dimension/length display with angle
  const renderDimensions = () => {
    if (!isDrawing && activeTool !== 'polygon') return null;

    if (activeTool === 'line' && startPoint && currentPoint) {
      const dx = currentPoint.x - startPoint.x;
      const dy = currentPoint.y - startPoint.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const currentLineAngle = calculateAngle(dx, dy);
      const midX = (startPoint.x + currentPoint.x) / 2;
      const midY = (startPoint.y + currentPoint.y) / 2;

      // Check if start point connects to an existing line
      const connectedAngle = findConnectedLineAngle(startPoint);
      let displayAngle: number;
      let isRelativeAngle = false;

      if (connectedAngle !== null) {
        // Show angle between current line and connected line
        displayAngle = angleBetween(currentLineAngle, connectedAngle);
        isRelativeAngle = true;
      } else {
        // Show angle from X axis
        displayAngle = currentLineAngle;
      }

      return (
        <Group>
          {/* Length at midpoint */}
          <Text
            x={midX + 5}
            y={midY - 15}
            text={`${length.toFixed(1)}px`}
            fontSize={10}
            fill="#2563eb"
            fontStyle="bold"
          />
          {/* Angle at start point */}
          <Text
            x={startPoint.x + 8}
            y={startPoint.y + 5}
            text={`${displayAngle.toFixed(1)}°`}
            fontSize={10}
            fill={isRelativeAngle ? "#059669" : "#9333ea"}
            fontStyle="bold"
          />
        </Group>
      );
    } else if (activeTool === 'rectangle' && startPoint && currentPoint) {
      const w = Math.abs(currentPoint.x - startPoint.x);
      const h = Math.abs(currentPoint.y - startPoint.y);
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);

      return (
        <Group>
          {/* Width label */}
          <Text
            x={x + w / 2 - 20}
            y={y - 15}
            text={`${w.toFixed(0)}px`}
            fontSize={10}
            fill="#2563eb"
            fontStyle="bold"
          />
          {/* Height label */}
          <Text
            x={x + w + 5}
            y={y + h / 2 - 5}
            text={`${h.toFixed(0)}px`}
            fontSize={10}
            fill="#2563eb"
            fontStyle="bold"
          />
        </Group>
      );
    } else if (activeTool === 'circle' && startPoint && currentPoint) {
      // First click is center, current mouse is edge
      const cx = startPoint.x;
      const cy = startPoint.y;
      const dx = currentPoint.x - startPoint.x;
      const dy = currentPoint.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      return (
        <Group>
          <Text
            x={cx + radius + 5}
            y={cy - 7}
            text={`r=${radius.toFixed(1)}px`}
            fontSize={10}
            fill="#2563eb"
            fontStyle="bold"
          />
          {/* Center marker */}
          <Line
            points={[cx - 5, cy, cx + 5, cy]}
            stroke="#2563eb"
            strokeWidth={1}
          />
          <Line
            points={[cx, cy - 5, cx, cy + 5]}
            stroke="#2563eb"
            strokeWidth={1}
          />
        </Group>
      );
    } else if (activeTool === 'polygon' && polygonPoints.length > 0 && currentPoint) {
      const lastPoint = polygonPoints[polygonPoints.length - 1];
      const dx = currentPoint.x - lastPoint.x;
      const dy = currentPoint.y - lastPoint.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const currentLineAngle = calculateAngle(dx, dy);
      const midX = (lastPoint.x + currentPoint.x) / 2;
      const midY = (lastPoint.y + currentPoint.y) / 2;

      let displayAngle: number | null = null;
      let isRelativeAngle = false;

      if (polygonPoints.length >= 2) {
        // Calculate angle between current segment and previous segment
        const prevPoint = polygonPoints[polygonPoints.length - 2];
        const prevDx = lastPoint.x - prevPoint.x;
        const prevDy = lastPoint.y - prevPoint.y;
        const prevAngle = calculateAngle(prevDx, prevDy);
        displayAngle = angleBetween(currentLineAngle, prevAngle);
        isRelativeAngle = true;
      } else {
        // First segment - check if connecting to existing line
        const connectedAngle = findConnectedLineAngle(polygonPoints[0]);
        if (connectedAngle !== null) {
          displayAngle = angleBetween(currentLineAngle, connectedAngle);
          isRelativeAngle = true;
        } else {
          // Show angle from X axis
          displayAngle = currentLineAngle;
        }
      }

      return (
        <Group>
          {/* Length at midpoint of current segment */}
          <Text
            x={midX + 5}
            y={midY - 12}
            text={`${length.toFixed(1)}px`}
            fontSize={10}
            fill="#2563eb"
            fontStyle="bold"
          />
          {/* Angle at the vertex */}
          {displayAngle !== null && (
            <Text
              x={lastPoint.x + 8}
              y={lastPoint.y + 5}
              text={`${displayAngle.toFixed(1)}°`}
              fontSize={10}
              fill={isRelativeAngle ? "#059669" : "#9333ea"}
              fontStyle="bold"
            />
          )}
        </Group>
      );
    }

    return null;
  };

  // Render visual guide points (snap points)
  const renderGuidePoints = () => {
    const snapPoints = getSnapPoints();

    return (
      <>
        {snapPoints.map((point, idx) => (
          <KonvaCircle
            key={`snap-point-${idx}`}
            x={point.x}
            y={point.y}
            radius={3}
            fill="#9333ea"
            opacity={0.4}
          />
        ))}
      </>
    );
  };

  // Render lengths for existing line paths (shown after drawing)
  const renderLineLengths = () => {
    const lineLengthLabels: React.ReactNode[] = [];

    paths.forEach((path, index) => {
      if (path.type === 'line') {
        const data = path.data as { x1: number; y1: number; x2: number; y2: number };
        const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
        const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        lineLengthLabels.push(
          <Text
            key={`line-length-${index}`}
            x={midX + 5}
            y={midY - 12}
            text={`${length.toFixed(1)}px`}
            fontSize={9}
            fill="#475569"
          />
        );
      }
    });

    return <>{lineLengthLabels}</>;
  };

  // Render X/Y axis guidelines (permanent crosshair lines)
  const renderAxisGuidelines = () => {
    if (!currentPoint) return null;

    return (
      <Group>
        {/* Vertical guideline */}
        <Line
          points={[currentPoint.x, 0, currentPoint.x, height]}
          stroke="#94a3b8"
          strokeWidth={1}
          dash={[5, 5]}
          opacity={0.5}
        />
        {/* Horizontal guideline */}
        <Line
          points={[0, currentPoint.y, width, currentPoint.y]}
          stroke="#94a3b8"
          strokeWidth={1}
          dash={[5, 5]}
          opacity={0.5}
        />
        {/* Coordinates next to cursor */}
        <Text
          x={currentPoint.x + 15}
          y={currentPoint.y + 15}
          text={`${currentPoint.x.toFixed(0)}, ${currentPoint.y.toFixed(0)}`}
          fontSize={10}
          fill="#475569"
          fontStyle="bold"
        />
      </Group>
    );
  };

  // Render coordinate display
  const renderCoordinates = () => {
    if (!currentPoint) return null;

    // Show coordinates when placing first point or during polygon drawing
    const shouldShow =
      (isDrawing && startPoint) ||
      (activeTool === 'polygon' && polygonPoints.length >= 0);

    if (!shouldShow) return null;

    const relativePos = pixelToRelative(currentPoint, designAreaOffset);
    const coordText = `X: ${currentPoint.x.toFixed(0)}px, Y: ${currentPoint.y.toFixed(0)}px`;
    const relativeText = `(${(relativePos.x * 100).toFixed(1)}%, ${(relativePos.y * 100).toFixed(1)}%)`;

    // Fixed position at bottom-left corner of canvas
    const labelX = 10;
    const labelY = height - 45;

    return (
      <Group>
        {/* Background - fixed at bottom-left corner */}
        <Rect
          x={labelX}
          y={labelY}
          width={150}
          height={32}
          fill="white"
          stroke="#2563eb"
          strokeWidth={1}
          cornerRadius={4}
          opacity={0.95}
        />
        {/* Pixel coordinates */}
        <Text
          x={labelX + 5}
          y={labelY + 5}
          text={coordText}
          fontSize={11}
          fill="#1f2937"
          fontStyle="bold"
        />
        {/* Relative coordinates */}
        <Text
          x={labelX + 5}
          y={labelY + 19}
          text={relativeText}
          fontSize={9}
          fill="#6b7280"
        />
        {/* Crosshair at cursor position */}
        <Line
          points={[currentPoint.x - 8, currentPoint.y, currentPoint.x + 8, currentPoint.y]}
          stroke="#2563eb"
          strokeWidth={1}
        />
        <Line
          points={[currentPoint.x, currentPoint.y - 8, currentPoint.x, currentPoint.y + 8]}
          stroke="#2563eb"
          strokeWidth={1}
        />
      </Group>
    );
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden" style={{ cursor: 'crosshair' }}>
      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 z-10 text-xs text-gray-600">
        {activeTool === 'select' && (
          <div>
            <div>Drag to select multiple shapes, drag selected shapes to move</div>
            <div className="text-gray-400 mt-0.5">Click shape: select • Drag area: multi-select • Drag shapes: move</div>
          </div>
        )}
        {activeTool === 'line' && (
          <div>
            <div>Click to place start, click again to place end</div>
            <div className="text-gray-400 mt-0.5">Shift: H/V lines • Ctrl: Angles (30°, 45°, 60°, 90°)</div>
          </div>
        )}
        {activeTool === 'rectangle' && (
          <div>
            <div>Click to place first corner, click again for opposite corner</div>
          </div>
        )}
        {activeTool === 'circle' && (
          <div>
            <div>Click to place center, click again to set radius</div>
          </div>
        )}
        {activeTool === 'polygon' && (
          <div>
            <div>Click to add points</div>
            <div className="text-gray-400 mt-0.5">Enter/double-click: finish • Shift: H/V • Ctrl: Angles</div>
          </div>
        )}
        {activeTool === 'port' && 'Click to add a port'}
        {activeTool === 'centerpoint' && 'Click to set the center point for alignment'}
        {activeTool === 'delete' && 'Click shapes to delete them'}
        {activeTool === 'measure' && (
          <div>
            <div>Click to start, click again to measure distance</div>
            <div className="text-gray-400 mt-0.5">Esc: Clear measurement</div>
          </div>
        )}
        {shiftPressed && (
          <div className="mt-1 text-blue-600 font-medium">
            ↔ Axis-aligned mode (90°)
          </div>
        )}
        {ctrlPressed && (
          <div className="mt-1 text-purple-600 font-medium">
            📐 Angle snap mode (30°, 45°, 60°, 90°)
          </div>
        )}
      </div>

      {/* Canvas Size Info */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 z-10 text-xs text-gray-500">
        {width} × {height}px
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-2 rounded-lg shadow-sm border border-gray-200 z-10 flex flex-col gap-1">
        <button
          onClick={() => useDesignerStore.getState().zoomIn()}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <div className="text-center text-xs text-gray-600 font-medium">
          {(zoom * 100).toFixed(0)}%
        </div>
        <button
          onClick={() => useDesignerStore.getState().zoomOut()}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => useDesignerStore.getState().resetZoom()}
          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          title="Reset Zoom"
        >
          1:1
        </button>
      </div>

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        onDblClick={handleDoubleClick}
        className="border border-gray-300"
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
      >
        {/* Grid Layer */}
        {gridVisible && (
          <Layer>
            {/* Vertical grid lines - display every 10px for performance */}
            {Array.from({ length: Math.floor(width / 10) + 1 }, (_, i) => (
              <Line
                key={`v-${i}`}
                points={[i * 10, 0, i * 10, height]}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
            ))}
            {/* Horizontal grid lines - display every 10px for performance */}
            {Array.from({ length: Math.floor(height / 10) + 1 }, (_, i) => (
              <Line
                key={`h-${i}`}
                points={[0, i * 10, width, i * 10]}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
            ))}
          </Layer>
        )}

        {/* Main Drawing Layer */}
        <Layer>
          {/* Design Area Box - shows the 200×200 design area where symbols should be drawn */}
          <Rect
            x={designAreaOffset.x}
            y={designAreaOffset.y}
            width={DESIGN_AREA_SIZE}
            height={DESIGN_AREA_SIZE}
            stroke="#2563eb"
            strokeWidth={2}
            dash={[10, 5]}
            fill="rgba(37, 99, 235, 0.02)"
            listening={false}
          />
          <Text
            x={designAreaOffset.x + DESIGN_AREA_SIZE / 2 - 60}
            y={designAreaOffset.y + DESIGN_AREA_SIZE + 10}
            text={`Design Area: ${DESIGN_AREA_SIZE}×${DESIGN_AREA_SIZE}px`}
            fontSize={12}
            fill="#2563eb"
            fontStyle="bold"
          />

          {/* Render visual guide points */}
          {renderGuidePoints()}

          {/* Render existing paths */}
          {paths.map((path, index) => renderPath(path, index))}

          {/* Render line lengths for existing paths */}
          {renderLineLengths()}

          {/* Render ports */}
          {ports.map((port) => {
            const pos = relativeToPixel(port.relativePosition, designAreaOffset);
            return (
              <Group key={port.id}>
                <KonvaCircle
                  x={pos.x}
                  y={pos.y}
                  radius={6}
                  fill="#10b981"
                  stroke="#059669"
                  strokeWidth={2}
                />
                <Text
                  x={pos.x + 10}
                  y={pos.y - 6}
                  text={port.name}
                  fontSize={10}
                  fill="#374151"
                />
              </Group>
            );
          })}

          {/* Render center point */}
          {centerPoint && (() => {
            const pos = relativeToPixel(centerPoint, designAreaOffset);
            return (
              <Group>
                {/* Crosshair lines */}
                <Line
                  points={[pos.x - 15, pos.y, pos.x - 5, pos.y]}
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <Line
                  points={[pos.x + 5, pos.y, pos.x + 15, pos.y]}
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <Line
                  points={[pos.x, pos.y - 15, pos.x, pos.y - 5]}
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <Line
                  points={[pos.x, pos.y + 5, pos.x, pos.y + 15]}
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                {/* Center dot */}
                <KonvaCircle
                  x={pos.x}
                  y={pos.y}
                  radius={4}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth={2}
                />
                {/* Label */}
                <Text
                  x={pos.x + 12}
                  y={pos.y - 8}
                  text="Center"
                  fontSize={10}
                  fill="#d97706"
                  fontStyle="bold"
                />
              </Group>
            );
          })()}

          {/* Render guiding lines */}
          {renderGuidingLines()}

          {/* Render preview */}
          {renderPreview()}
          {renderPolygonPreview()}
          {renderMeasure()}

          {/* Render selection rectangle */}
          {renderSelectionRect()}

          {/* Render selected paths highlight */}
          {renderSelectedHighlight()}

          {/* Render dimensions */}
          {renderDimensions()}

          {/* Render X/Y axis guidelines */}
          {renderAxisGuidelines()}

          {/* Render coordinate display */}
          {renderCoordinates()}
        </Layer>

        {/* Ruler Layer */}
        <Layer>
          {/* Top ruler */}
          <Rect x={0} y={0} width={width} height={20} fill="#f3f4f6" />
          {Array.from({ length: Math.floor(width / 50) + 1 }, (_, i) => (
            <React.Fragment key={`ruler-h-${i}`}>
              <Line
                points={[i * 50, 20, i * 50, 15]}
                stroke="#6b7280"
                strokeWidth={1}
              />
              <Text
                x={i * 50 + 2}
                y={2}
                text={`${i * 50}`}
                fontSize={10}
                fill="#6b7280"
              />
            </React.Fragment>
          ))}

          {/* Left ruler */}
          <Rect x={0} y={0} width={20} height={height} fill="#f3f4f6" />
          {Array.from({ length: Math.floor(height / 50) + 1 }, (_, i) => (
            <React.Fragment key={`ruler-v-${i}`}>
              <Line
                points={[20, i * 50, 15, i * 50]}
                stroke="#6b7280"
                strokeWidth={1}
              />
              <Text
                x={2}
                y={i * 50 + 2}
                text={`${i * 50}`}
                fontSize={10}
                fill="#6b7280"
                rotation={0}
              />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default DesignerCanvas;
