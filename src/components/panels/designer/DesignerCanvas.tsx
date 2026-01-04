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
    labels,
    centerPoint,
    gridVisible,
    gridSize,
    lineLengthMode,
    lineLengthValue,
    setLineLengthMode,
    setLineLengthValue,
    addPath,
    updatePath,
    addPort,
    addLabel,
    updateLabel,
    setCenterPoint,
    selectedPathIndex,
    selectPath,
    selectedPathIndices,
    selectPaths,
    selectedLabelId,
    selectLabel,
    rotateSelectedLabel,
    setSelectedLabelRotation,
    clearSelection,
    moveSelectedPaths,
    rotateSelectedPath,
    setSelectedPathRotation,
    zoom,
    panOffset,
    setZoom,
    setPanOffset,
  } = useDesignerStore();

  const stageRef = useRef<any>(null);

  // Original centered offset (used as reference for center point coordinates)
  const originalCenteredOffset = useMemo(
    () => getDesignAreaOffset(width, height),
    [width, height]
  );

  // Keep design area offset centered for coordinate calculations
  const designAreaOffset = useMemo(() => {
    return originalCenteredOffset;
  }, [originalCenteredOffset]);

  // Calculate visual boundary position (what the user sees)
  // This shifts to center on the center point, but doesn't affect coordinates
  const visualBoundaryOffset = useMemo(() => {
    if (centerPoint) {
      const pixelPos = relativeToPixel(centerPoint, designAreaOffset);
      return {
        x: pixelPos.x - (DESIGN_AREA_SIZE / 2),
        y: pixelPos.y - (DESIGN_AREA_SIZE / 2),
      };
    }
    return designAreaOffset;
  }, [centerPoint, designAreaOffset]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);

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
      } else if (path.type === 'arc') {
        const data = path.data as { x: number; y: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
        const center = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
        const outerRadius = data.outerRadius * DESIGN_AREA_SIZE;
        // Center
        snapPoints.push(center);
        // Arc endpoints
        const startAngleRad = data.startAngle * (Math.PI / 180);
        const endAngleRad = data.endAngle * (Math.PI / 180);
        snapPoints.push({
          x: center.x + outerRadius * Math.cos(startAngleRad),
          y: center.y + outerRadius * Math.sin(startAngleRad),
        });
        snapPoints.push({
          x: center.x + outerRadius * Math.cos(endAngleRad),
          y: center.y + outerRadius * Math.sin(endAngleRad),
        });
        // Midpoint of arc
        const midAngleRad = (data.startAngle + (data.endAngle - data.startAngle) / 2) * (Math.PI / 180);
        snapPoints.push({
          x: center.x + outerRadius * Math.cos(midAngleRad),
          y: center.y + outerRadius * Math.sin(midAngleRad),
        });
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
    // Skip snapping when Alt is pressed (for precise point selection)
    if (altPressed) {
      return point;
    }

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
  }, [gridSize, gridVisible, getSnapPoints, altPressed]);

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

  // Apply length constraint when lineLengthMode is enabled
  const applyLengthConstraint = useCallback((start: Point, end: Point): Point => {
    if (!lineLengthMode || !start) return end;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    if (currentDistance < 1) return end;

    // Calculate angle and set endpoint at exact distance
    const angle = Math.atan2(dy, dx);
    return {
      x: start.x + lineLengthValue * Math.cos(angle),
      y: start.y + lineLengthValue * Math.sin(angle),
    };
  }, [lineLengthMode, lineLengthValue]);

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
    } else if (path.type === 'arc') {
      const data = path.data as { x: number; y: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
      const center = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
      const outerRadius = data.outerRadius * DESIGN_AREA_SIZE;
      // Simple bounding box check for arc
      return center.x + outerRadius >= minX && center.x - outerRadius <= maxX &&
             center.y + outerRadius >= minY && center.y - outerRadius <= maxY;
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
    } else if (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arc') {
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
        } else if (activeTool === 'arc') {
          // First click is center, second click defines radius and direction
          // Draw a 180-degree arc (semicircle) oriented toward the click direction
          const cx = relativeStart.x;
          const cy = relativeStart.y;
          const dx = relativeEnd.x - relativeStart.x;
          const dy = relativeEnd.y - relativeStart.y;
          const outerRadius = Math.sqrt(dx * dx + dy * dy);

          // Calculate angle from center to second click (in degrees)
          let clickAngle = Math.atan2(dy, dx) * (180 / Math.PI);

          // Create a 180-degree arc centered on the click direction
          // This means the arc extends 90° on each side of the click angle
          const startAngle = clickAngle - 90;
          const endAngle = clickAngle + 90;

          const path: SymbolPath = {
            type: 'arc',
            data: {
              x: cx,
              y: cy,
              innerRadius: 0,
              outerRadius: outerRadius,
              startAngle: startAngle,
              endAngle: endAngle,
            },
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
        name: `port${ports.length + 1}`,
        relativePosition: relativePos,
        direction: 'bidirectional',
        defaultAngle: 0,
        allowedConnections: ['pipe'],
      });
    } else if (activeTool === 'label') {
      // Add label immediately
      const relativePos = pixelToRelative(pos, designAreaOffset);
      const labelId = `label-${Date.now()}`;
      addLabel({
        id: labelId,
        relativePosition: relativePos,
        anchor: 'middle',
        binding: 'kks',
        visible: true,
        style: {
          fontSize: 12,
          fontWeight: 'normal',
        },
      });
    } else if (activeTool === 'centerpoint') {
      // Set center point - convert to relative coordinates within design area
      const relativePos = pixelToRelative(pos, originalCenteredOffset);
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
  }, [activeTool, getMousePos, width, height, addPort, setCenterPoint, ports.length, isDrawing, startPoint, currentPoint, addPath, measureStart, originalCenteredOffset]);

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
    } else if (isDrawing && (activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'arc')) {
      let constrainedPos = pos;

      if (activeTool === 'line' && startPoint) {
        // Apply constraints in order: angle snap, orthogonal, then length
        // Apply angle snapping when Ctrl is pressed
        if (ctrlPressed) {
          constrainedPos = applyAngleSnapping(startPoint, constrainedPos);
        }
        // Apply orthogonal constraint when Shift is pressed
        else if (shiftPressed) {
          constrainedPos = applyOrthogonalConstraint(startPoint, constrainedPos);
        }

        // Apply length constraint (can be combined with angle/orthogonal)
        if (lineLengthMode) {
          constrainedPos = applyLengthConstraint(startPoint, constrainedPos);
        }
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
  }, [isDrawing, activeTool, polygonPoints, getMousePos, startPoint, applyOrthogonalConstraint, applyAngleSnapping, applyLengthConstraint, ctrlPressed, shiftPressed, lineLengthMode, measureStart]);


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

      // Track Alt key state using altKey property (more reliable)
      setAltPressed(e.altKey);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      } else if (e.key === 'Control') {
        setCtrlPressed(false);
      }

      // Track Alt key state using altKey property (more reliable)
      setAltPressed(e.altKey);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, polygonPoints, designAreaOffset, addPath]);

  // Render a path on the canvas
  // Helper to get center point of a path for rotation
  const getPathCenter = (path: SymbolPath): Point => {
    if (path.type === 'line') {
      const data = path.data as { x1: number; y1: number; x2: number; y2: number };
      const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
      const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    } else if (path.type === 'rect') {
      const data = path.data as { x: number; y: number; width: number; height: number };
      const center = relativeToPixel({ x: data.x + data.width / 2, y: data.y + data.height / 2 }, designAreaOffset);
      return center;
    } else if (path.type === 'circle' || path.type === 'arc') {
      const data = path.data as { cx?: number; cy?: number; x?: number; y?: number };
      const cx = data.cx !== undefined ? data.cx : data.x!;
      const cy = data.cy !== undefined ? data.cy : data.y!;
      return relativeToPixel({ x: cx, y: cy }, designAreaOffset);
    } else if (path.type === 'polygon') {
      const data = path.data as { points: Point[] };
      const points = data.points.map(p => relativeToPixel(p, designAreaOffset));
      const sumX = points.reduce((sum, p) => sum + p.x, 0);
      const sumY = points.reduce((sum, p) => sum + p.y, 0);
      return { x: sumX / points.length, y: sumY / points.length };
    }
    return { x: 0, y: 0 };
  };

  const renderPath = (path: SymbolPath, index: number) => {
    const isSelected = selectedPathIndex === index;
    // Handle 'inherit' stroke by showing as black in designer canvas
    const baseStroke = path.style.stroke === 'inherit' ? '#000000' : (path.style.stroke || '#000000');
    const strokeColor = isSelected ? '#2563eb' : baseStroke;
    const strokeWidth = path.style.strokeWidth || 2;
    const rotation = path.rotation || 0;
    const center = getPathCenter(path);

    const renderShape = () => {
      if (path.type === 'line') {
        const data = path.data as { x1: number; y1: number; x2: number; y2: number };
        const p1 = relativeToPixel({ x: data.x1, y: data.y1 }, designAreaOffset);
        const p2 = relativeToPixel({ x: data.x2, y: data.y2 }, designAreaOffset);
        return (
          <Line
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      } else if (path.type === 'rect') {
        const data = path.data as { x: number; y: number; width: number; height: number };
        const topLeft = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
        const bottomRight = relativeToPixel({ x: data.x + data.width, y: data.y + data.height }, designAreaOffset);
        return (
          <Rect
            x={topLeft.x}
            y={topLeft.y}
            width={bottomRight.x - topLeft.x}
            height={bottomRight.y - topLeft.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill={path.style.fill === 'inherit' ? 'transparent' : path.style.fill}
          />
        );
      } else if (path.type === 'circle') {
        const data = path.data as { cx: number; cy: number; r: number };
        const center = relativeToPixel({ x: data.cx, y: data.cy }, designAreaOffset);
        const radius = data.r * DESIGN_AREA_SIZE;
        return (
          <KonvaCircle
            x={center.x}
            y={center.y}
            radius={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill={path.style.fill === 'inherit' ? 'transparent' : path.style.fill}
          />
        );
      } else if (path.type === 'arc') {
        const data = path.data as { x: number; y: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
        const center = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
        const outerRadius = data.outerRadius * DESIGN_AREA_SIZE;
        const innerRadius = data.innerRadius * DESIGN_AREA_SIZE;

        // Draw arc using Line with calculated points
        const arcPoints: number[] = [];
        const segments = 50;

        for (let i = 0; i <= segments; i++) {
          const angle = (data.startAngle + (data.endAngle - data.startAngle) * (i / segments)) * (Math.PI / 180);
          arcPoints.push(center.x + outerRadius * Math.cos(angle));
          arcPoints.push(center.y + outerRadius * Math.sin(angle));
        }

        // If there's an inner radius (ring/donut arc), add return path
        if (innerRadius > 0) {
          for (let i = segments; i >= 0; i--) {
            const angle = (data.startAngle + (data.endAngle - data.startAngle) * (i / segments)) * (Math.PI / 180);
            arcPoints.push(center.x + innerRadius * Math.cos(angle));
            arcPoints.push(center.y + innerRadius * Math.sin(angle));
          }
        }

        return (
          <Line
            points={arcPoints}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill={innerRadius > 0 && path.style.fill !== 'transparent' ? (path.style.fill === 'inherit' ? 'transparent' : path.style.fill) : 'transparent'}
            closed={innerRadius > 0}
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
            points={points}
            closed
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill={path.style.fill === 'inherit' ? 'transparent' : path.style.fill}
          />
        );
      }

      return null;
    };

    // Wrap shape in Group with rotation and drag support
    return (
      <Group
        key={`path-${index}`}
        x={center.x}
        y={center.y}
        rotation={rotation}
        offsetX={center.x}
        offsetY={center.y}
        draggable={false}  // Shapes use multi-select drag, not individual drag
        onMouseDown={(e) => {
          e.cancelBubble = true;
          if (activeTool === 'select') {
            selectPath(index);
          }
        }}
        listening={activeTool === 'select'}
      >
        {renderShape()}
      </Group>
    );
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
    } else if (activeTool === 'arc') {
      // First click is center, current mouse defines radius and direction
      // Preview a 180-degree arc (semicircle) oriented toward the mouse
      const cx = startPoint.x;
      const cy = startPoint.y;
      const dx = currentPoint.x - startPoint.x;
      const dy = currentPoint.y - startPoint.y;
      const radius = Math.sqrt(dx * dx + dy * dy);

      // Calculate angle from center to mouse (in degrees)
      let clickAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Create a 180-degree arc centered on the mouse direction
      const startAngle = clickAngle - 90;
      const endAngle = clickAngle + 90;

      // Draw arc using Line with calculated points
      const arcPoints: number[] = [];
      const segments = 50;

      for (let i = 0; i <= segments; i++) {
        const angle = (startAngle + (endAngle - startAngle) * (i / segments)) * (Math.PI / 180);
        arcPoints.push(cx + radius * Math.cos(angle));
        arcPoints.push(cy + radius * Math.sin(angle));
      }

      // Normalize angle to 0-360 range for display
      let displayAngle = clickAngle;
      if (displayAngle < 0) displayAngle += 360;

      return (
        <>
          <Line points={arcPoints} {...previewStyle} fill="transparent" />
          {/* Center crosshair */}
          <Line points={[cx - 5, cy, cx + 5, cy]} stroke="#2563eb" strokeWidth={1} />
          <Line points={[cx, cy - 5, cx, cy + 5]} stroke="#2563eb" strokeWidth={1} />
          {/* Direction indicator - line from center to mouse */}
          <Line points={[cx, cy, currentPoint.x, currentPoint.y]} stroke="#2563eb" strokeWidth={1} dash={[3, 3]} />
          {/* Angle display */}
          <Text
            x={currentPoint.x + 10}
            y={currentPoint.y - 20}
            text={`${Math.round(displayAngle)}°`}
            fontSize={14}
            fontStyle="bold"
            fill="#2563eb"
            padding={4}
          />
          {/* Angle arc range display near center */}
          <Text
            x={cx + 10}
            y={cy + 10}
            text={`Arc: ${Math.round(startAngle)}° to ${Math.round(endAngle)}°`}
            fontSize={12}
            fill="#059669"
            padding={4}
          />
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
      } else if (path.type === 'arc') {
        const data = path.data as { x: number; y: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
        const center = relativeToPixel({ x: data.x, y: data.y }, designAreaOffset);
        const outerRadius = data.outerRadius * DESIGN_AREA_SIZE;
        const innerRadius = data.innerRadius * DESIGN_AREA_SIZE;

        // Draw arc using Line with calculated points
        const arcPoints: number[] = [];
        const segments = 50;

        for (let i = 0; i <= segments; i++) {
          const angle = (data.startAngle + (data.endAngle - data.startAngle) * (i / segments)) * (Math.PI / 180);
          arcPoints.push(center.x + outerRadius * Math.cos(angle));
          arcPoints.push(center.y + outerRadius * Math.sin(angle));
        }

        if (innerRadius > 0) {
          for (let i = segments; i >= 0; i--) {
            const angle = (data.startAngle + (data.endAngle - data.startAngle) * (i / segments)) * (Math.PI / 180);
            arcPoints.push(center.x + innerRadius * Math.cos(angle));
            arcPoints.push(center.y + innerRadius * Math.sin(angle));
          }
        }

        return (
          <Line
            key={`highlight-${index}`}
            points={arcPoints}
            closed={innerRadius > 0}
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

  // Render snap status indicator
  const renderSnapStatus = () => {
    if (!altPressed) return null;

    // Show "SNAP OFF" indicator when Alt is pressed
    const labelX = 10;
    const labelY = 10; // Top-left corner

    return (
      <Group>
        <Rect
          x={labelX}
          y={labelY}
          width={90}
          height={24}
          fill="#ef4444"
          cornerRadius={4}
          opacity={0.9}
        />
        <Text
          x={labelX + 10}
          y={labelY + 6}
          text="SNAP OFF"
          fontSize={12}
          fill="white"
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
    const snapText = altPressed ? ' [SNAP OFF]' : '';

    // Fixed position at bottom-left corner of canvas
    const labelX = 10;
    const labelY = height - 45;

    return (
      <Group>
        {/* Background - fixed at bottom-left corner */}
        <Rect
          x={labelX}
          y={labelY}
          width={altPressed ? 220 : 150}
          height={32}
          fill={altPressed ? "#ef4444" : "white"}
          stroke={altPressed ? "#991b1b" : "#2563eb"}
          strokeWidth={2}
          cornerRadius={4}
          opacity={0.95}
        />
        {/* Pixel coordinates */}
        <Text
          x={labelX + 5}
          y={labelY + 5}
          text={coordText + snapText}
          fontSize={11}
          fill={altPressed ? "white" : "#1f2937"}
          fontStyle="bold"
        />
        {/* Relative coordinates */}
        <Text
          x={labelX + 5}
          y={labelY + 19}
          text={relativeText}
          fontSize={9}
          fill={altPressed ? "#fee2e2" : "#6b7280"}
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
            <div>Click to select shapes and labels</div>
            <div className="text-gray-400 mt-0.5">Use position inputs (bottom-left) to move selected label</div>
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

      {/* Line Length Controls */}
      {activeTool === 'line' && (
        <div className="absolute top-20 right-4 bg-white/90 backdrop-blur-sm px-3 py-3 rounded-lg shadow-sm border border-gray-200 z-10">
          <div className="text-xs font-semibold text-gray-700 mb-2">Precise Length</div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lineLengthMode}
                onChange={(e) => setLineLengthMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Enable</span>
            </label>
          </div>
          {lineLengthMode && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={lineLengthValue}
                onChange={(e) => setLineLengthValue(parseFloat(e.target.value) || 1)}
                min="1"
                max="1000"
                step="1"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
          )}
          {lineLengthMode && startPoint && currentPoint && (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              Length: {Math.round(lineLengthValue)}px
            </div>
          )}
        </div>
      )}

      {/* Rotation Controls - for Shapes */}
      {selectedPathIndex !== null && paths[selectedPathIndex] && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-3 rounded-lg shadow-sm border border-gray-200 z-10">
          <div className="text-xs font-semibold text-gray-700 mb-2">Rotate Shape</div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => rotateSelectedPath(-90)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Rotate -90°"
            >
              ↶ 90°
            </button>
            <button
              onClick={() => rotateSelectedPath(90)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Rotate +90°"
            >
              ↷ 90°
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.round(paths[selectedPathIndex].rotation || 0)}
              onChange={(e) => setSelectedPathRotation(parseFloat(e.target.value) || 0)}
              min="-360"
              max="360"
              step="15"
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">°</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Current: {Math.round(paths[selectedPathIndex].rotation || 0)}°
          </div>
        </div>
      )}

      {/* Label Controls */}
      {selectedLabelId && labels.find(l => l.id === selectedLabelId) && (() => {
        const selectedLabel = labels.find(l => l.id === selectedLabelId)!;
        const currentPos = selectedLabel.relativePosition;

        return (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-3 rounded-lg shadow-sm border border-gray-200 z-10 max-w-xs">
            <div className="text-xs font-semibold text-gray-700 mb-3">Label Settings</div>

            {/* Position */}
            <div className="mb-3">
              <div className="text-xs text-gray-600 mb-1">Position</div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">X:</span>
                  <input
                    type="number"
                    value={currentPos.x.toFixed(3)}
                    onChange={(e) => {
                      const newX = parseFloat(e.target.value) || 0;
                      updateLabel(selectedLabelId, {
                        relativePosition: { x: newX, y: currentPos.y }
                      });
                    }}
                    step="0.01"
                    min="0"
                    max="1"
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Y:</span>
                  <input
                    type="number"
                    value={currentPos.y.toFixed(3)}
                    onChange={(e) => {
                      const newY = parseFloat(e.target.value) || 0;
                      updateLabel(selectedLabelId, {
                        relativePosition: { x: currentPos.x, y: newY }
                      });
                    }}
                    step="0.01"
                    min="0"
                    max="1"
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="mb-3">
              <div className="text-xs text-gray-600 mb-1">Rotation</div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => rotateSelectedLabel(-90)}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Rotate -90°"
                >
                  ↶ 90°
                </button>
                <button
                  onClick={() => rotateSelectedLabel(90)}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title="Rotate +90°"
                >
                  ↷ 90°
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={Math.round(selectedLabel.rotation || 0)}
                  onChange={(e) => setSelectedLabelRotation(parseFloat(e.target.value) || 0)}
                  min="-360"
                  max="360"
                  step="15"
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">°</span>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLabel.visible !== false}
                  onChange={(e) => {
                    updateLabel(selectedLabelId, { visible: e.target.checked });
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">Only show when selected</span>
              </label>
              <div className="text-xs text-gray-400 mt-1">
                {selectedLabel.visible !== false
                  ? 'Label shows only when symbol is selected in diagram'
                  : 'Label always visible in diagram'}
              </div>
            </div>
          </div>
        );
      })()}

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
          {/* Design Area Box - shows the 400×400 design area where symbols should be drawn */}
          <Rect
            x={visualBoundaryOffset.x}
            y={visualBoundaryOffset.y}
            width={DESIGN_AREA_SIZE}
            height={DESIGN_AREA_SIZE}
            stroke="#2563eb"
            strokeWidth={2}
            dash={[10, 5]}
            fill="rgba(37, 99, 235, 0.02)"
            listening={false}
          />
          <Text
            x={visualBoundaryOffset.x + DESIGN_AREA_SIZE / 2 - 60}
            y={visualBoundaryOffset.y + DESIGN_AREA_SIZE + 10}
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

          {/* Render labels */}
          {labels.map((label) => {
            const pos = relativeToPixel(label.relativePosition, designAreaOffset);
            const isSelected = selectedLabelId === label.id;
            const rotation = label.rotation || 0;
            const displayText = label.binding || 'Label';

            return (
              <Group
                key={label.id}
                x={pos.x}
                y={pos.y}
                rotation={rotation}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  if (activeTool === 'select') {
                    selectLabel(label.id);
                  }
                }}
                listening={activeTool === 'select'}
              >
                <Text
                  x={0}
                  y={0}
                  text={displayText}
                  fontSize={label.style.fontSize}
                  fontStyle={label.style.fontWeight === 'bold' ? 'bold' : 'normal'}
                  fill={isSelected ? '#2563eb' : (label.style.fill || '#000000')}
                  align={label.anchor}
                />
                {isSelected && (
                  <Rect
                    x={-5}
                    y={-5}
                    width={displayText.length * 7 + 10}
                    height={label.style.fontSize + 10}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dash={[5, 5]}
                    fill="transparent"
                  />
                )}
              </Group>
            );
          })}

          {/* Render center point */}
          {centerPoint && (() => {
            // Convert center point from relative to pixel coordinates
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

          {/* Render snap status indicator */}
          {renderSnapStatus()}
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
