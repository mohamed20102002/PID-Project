/**
 * Buildings Layer Component
 *
 * Renders building polygons on the canvas, including:
 * - Completed building polygons with fill and stroke
 * - Building labels
 * - Preview polygon during drawing
 * - Selection and hover states
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Layer, Line, Text, Circle, Group } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { BuildingPolygon, Point } from '../../types';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore } from '../../store/uiStore';

interface BuildingsLayerProps {
  /** Scale factor for zoom-independent elements */
  scale: number;
  /** Current application mode (draw/view) */
  mode: 'draw' | 'view';
}

interface BuildingShapeProps {
  building: BuildingPolygon;
  isSelected: boolean;
  isHovered: boolean;
  scale: number;
  mode: 'draw' | 'view';
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onLabelDrag: (id: string, position: Point) => void;
  onBuildingDrag: (id: string, delta: Point) => void;
}

/**
 * Single building polygon shape
 */
const BuildingShape: React.FC<BuildingShapeProps> = ({
  building,
  isSelected,
  isHovered,
  scale,
  mode,
  onSelect,
  onHover,
  onLabelDrag,
  onBuildingDrag,
}) => {
  // Safety check
  if (!building || !building.polygon || building.polygon.length < 3) {
    return null;
  }

  // Flatten polygon points for Konva Line
  const points = building.polygon.flatMap((p) => [p.x, p.y]);

  // Calculate label position (center of bounding box or custom position)
  const labelPos = building.labelPosition || (() => {
    const xs = building.polygon.map((p) => p.x);
    const ys = building.polygon.map((p) => p.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  })();

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(building.id);
  };

  const handleMouseEnter = () => {
    onHover(building.id);
  };

  const handleMouseLeave = () => {
    onHover(null);
  };

  const handleLabelDragEnd = (e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const node = e.target;
    onLabelDrag(building.id, { x: node.x(), y: node.y() });
  };

  const handleBuildingDragEnd = (e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const node = e.target;
    const deltaX = node.x();
    const deltaY = node.y();

    // Update building position
    onBuildingDrag(building.id, { x: deltaX, y: deltaY });

    // Reset group position after updating the building
    node.position({ x: 0, y: 0 });
  };

  if (!building.visible) {
    return null;
  }

  const strokeWidth = isSelected ? (building.strokeWidth || 1) + 1 : (building.strokeWidth || 1);
  const strokeColor = isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : (building.strokeColor || '#64748b');

  // Only allow dragging when selected and in edit mode
  const isDraggable = isSelected && mode === 'draw';

  return (
    <Group
      draggable={isDraggable}
      onDragEnd={handleBuildingDragEnd}
    >
      {/* Building polygon - no onClick, selection only via label */}
      <Line
        points={points}
        closed
        fill={building.fillColor || 'rgba(200, 220, 255, 0.2)'}
        stroke={strokeColor}
        strokeWidth={strokeWidth / scale}
        dash={building.strokeDash ? building.strokeDash.map(d => d / scale) : undefined}
        onMouseEnter={mode === 'draw' ? handleMouseEnter : undefined}
        onMouseLeave={mode === 'draw' ? handleMouseLeave : undefined}
        hitStrokeWidth={10 / scale}
        listening={false}
      />

      {/* Building label - only clickable/draggable in edit mode */}
      {building.labelVisible && building.name && (
        <Text
          x={labelPos.x}
          y={labelPos.y}
          text={building.name}
          fontSize={14 / scale}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle="bold"
          fill={isSelected ? '#1d4ed8' : '#374151'}
          align="center"
          verticalAlign="middle"
          offsetX={(building.name.length * 3.5) / scale}
          offsetY={7 / scale}
          draggable={isSelected && mode === 'draw'}
          onDragEnd={mode === 'draw' ? handleLabelDragEnd : undefined}
          onClick={mode === 'draw' ? (e) => {
            e.cancelBubble = true;
            onSelect(building.id);
          } : undefined}
          listening={mode === 'draw'}
        />
      )}

      {/* Selection handles */}
      {isSelected &&
        building.polygon.map((point, index) => (
          <Circle
            key={index}
            x={point.x}
            y={point.y}
            radius={4 / scale}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={1 / scale}
            listening={false}
          />
        ))}

      {/* Label position handle when selected */}
      {isSelected && building.labelVisible && building.name && (
        <Circle
          x={labelPos.x}
          y={labelPos.y}
          radius={6 / scale}
          fill="#22c55e"
          stroke="#ffffff"
          strokeWidth={2 / scale}
          listening={false}
        />
      )}
    </Group>
  );
};

/**
 * Preview shape during building drawing
 */
interface BuildingPreviewProps {
  points: Point[];
  currentMousePos: Point | null;
  scale: number;
}

const BuildingPreview: React.FC<BuildingPreviewProps> = ({
  points,
  currentMousePos,
  scale,
}) => {
  if (!points || points.length < 1) {
    return null;
  }

  // Combine placed points with current mouse position (constrained to 90 degrees)
  const allPoints = [...points];
  if (currentMousePos && points.length > 0) {
    const lastPoint = points[points.length - 1];
    const dx = Math.abs(currentMousePos.x - lastPoint.x);
    const dy = Math.abs(currentMousePos.y - lastPoint.y);

    // Apply 90-degree constraint to preview
    let constrainedPos: Point;
    if (dx > dy) {
      // Horizontal line
      constrainedPos = { x: currentMousePos.x, y: lastPoint.y };
    } else {
      // Vertical line
      constrainedPos = { x: lastPoint.x, y: currentMousePos.y };
    }
    allPoints.push(constrainedPos);
  } else if (currentMousePos) {
    allPoints.push(currentMousePos);
  }

  // Check if we're close to the start point (for closing)
  // Use the constrained position (last point in allPoints) for distance check
  let isNearStart = false;
  if (points.length >= 3 && allPoints.length > points.length) {
    const start = points[0];
    const previewPoint = allPoints[allPoints.length - 1];
    const distance = Math.sqrt(
      Math.pow(previewPoint.x - start.x, 2) +
        Math.pow(previewPoint.y - start.y, 2)
    );
    isNearStart = distance < 20 / scale;
  }

  const flatPoints = allPoints.flatMap((p) => [p.x, p.y]);

  return (
    <Group listening={false}>
      {/* Preview polygon/polyline */}
      <Line
        points={flatPoints}
        closed={allPoints.length >= 3 && isNearStart}
        fill={isNearStart ? 'rgba(200, 220, 255, 0.3)' : 'rgba(200, 220, 255, 0.1)'}
        stroke={isNearStart ? '#3b82f6' : '#64748b'}
        strokeWidth={2 / scale}
        dash={isNearStart ? [] : [8 / scale, 4 / scale]}
        listening={false}
      />

      {/* Vertex points */}
      {points.map((point, index) => (
        <Circle
          key={index}
          x={point.x}
          y={point.y}
          radius={index === 0 && isNearStart ? 8 / scale : 5 / scale}
          fill={index === 0 ? (isNearStart ? '#22c55e' : '#3b82f6') : '#60a5fa'}
          stroke="#ffffff"
          strokeWidth={2 / scale}
          listening={false}
        />
      ))}

      {/* Current mouse position indicator (shows constrained position) */}
      {allPoints.length > points.length && !isNearStart && (
        <Circle
          x={allPoints[allPoints.length - 1].x}
          y={allPoints[allPoints.length - 1].y}
          radius={4 / scale}
          fill="#94a3b8"
          stroke="#ffffff"
          strokeWidth={1 / scale}
          listening={false}
        />
      )}
    </Group>
  );
};

/**
 * Main buildings layer
 */
export const BuildingsLayer: React.FC<BuildingsLayerProps> = ({ scale, mode }) => {
  // Get buildings from diagram store (with fallback for diagrams without buildings)
  const diagram = useDiagramStore((state) => state.diagram);
  const updateBuilding = useDiagramStore((state) => state.updateBuilding);
  const buildings = useMemo(() => {
    if (!diagram || !diagram.buildings) return [];
    return Object.values(diagram.buildings);
  }, [diagram]);

  // Get UI state
  const selectedBuildingId = useUIStore((state) => state.selectedBuildingId);
  const isDrawingBuilding = useUIStore((state) => state.isDrawingBuilding);
  const buildingPreviewPoints = useUIStore((state) => state.buildingPreviewPoints);
  const mousePosition = useUIStore((state) => state.mousePosition);
  const selectBuilding = useUIStore((state) => state.selectBuilding);

  // Local hover state
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Handle label drag
  const handleLabelDrag = useCallback((id: string, position: Point) => {
    updateBuilding(id, { labelPosition: position });
  }, [updateBuilding]);

  // Handle building drag - move entire polygon
  const handleBuildingDrag = useCallback((id: string, delta: Point) => {
    const building = buildings.find(b => b.id === id);
    if (!building) return;

    // Update all polygon points by the delta
    const newPolygon = building.polygon.map(point => ({
      x: point.x + delta.x,
      y: point.y + delta.y,
    }));

    // Update label position if it exists
    const newLabelPosition = building.labelPosition ? {
      x: building.labelPosition.x + delta.x,
      y: building.labelPosition.y + delta.y,
    } : undefined;

    updateBuilding(id, {
      polygon: newPolygon,
      labelPosition: newLabelPosition,
    });
  }, [buildings, updateBuilding]);

  // Sort buildings by zIndex
  const sortedBuildings = useMemo(() => {
    return [...buildings].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [buildings]);

  return (
    <Layer listening={!isDrawingBuilding}>
      {/* Render completed buildings */}
      {sortedBuildings.map((building) => (
        <BuildingShape
          key={building.id}
          building={building}
          isSelected={selectedBuildingId === building.id}
          isHovered={hoveredId === building.id}
          scale={scale}
          mode={mode}
          onSelect={selectBuilding}
          onHover={setHoveredId}
          onLabelDrag={handleLabelDrag}
          onBuildingDrag={handleBuildingDrag}
        />
      ))}

      {/* Render preview during drawing */}
      {isDrawingBuilding && buildingPreviewPoints && buildingPreviewPoints.length > 0 && (
        <BuildingPreview
          points={buildingPreviewPoints}
          currentMousePos={mousePosition}
          scale={scale}
        />
      )}
    </Layer>
  );
};

export default BuildingsLayer;
