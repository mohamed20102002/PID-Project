/**
 * SnapEngine
 *
 * Handles grid snapping and alignment snapping for components.
 * Provides visual guides when components align with each other.
 */

import { Point, Size, Component } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface SnapResult {
  position: Point;
  snappedX: boolean;
  snappedY: boolean;
  guideLines: GuideLine[];
}

export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

export interface SnapConfig {
  gridSize: number;
  snapToGrid: boolean;
  snapToComponents: boolean;
  snapTolerance: number;
}

// ============================================================================
// SnapEngine Class
// ============================================================================

export class SnapEngine {
  private config: SnapConfig;

  constructor(config: Partial<SnapConfig> = {}) {
    this.config = {
      gridSize: 20,
      snapToGrid: true,
      snapToComponents: true,
      snapTolerance: 10,
      ...config,
    };
  }

  /**
   * Update snap configuration
   */
  updateConfig(config: Partial<SnapConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Snap a position to the grid and/or other components
   */
  snap(
    position: Point,
    size: Size,
    otherComponents: Component[],
    excludeKks?: string
  ): SnapResult {
    let result: SnapResult = {
      position: { ...position },
      snappedX: false,
      snappedY: false,
      guideLines: [],
    };

    // Filter out the component being moved
    const components = excludeKks
      ? otherComponents.filter((c) => c.kks !== excludeKks)
      : otherComponents;

    // Snap to grid first
    if (this.config.snapToGrid) {
      result = this.snapToGrid(result.position, size);
    }

    // Then snap to other components (takes priority if closer)
    if (this.config.snapToComponents && components.length > 0) {
      result = this.snapToComponents(result.position, size, components, result);
    }

    return result;
  }

  /**
   * Snap position to grid lines
   */
  private snapToGrid(position: Point, size: Size): SnapResult {
    const { gridSize, snapTolerance } = this.config;

    // Calculate grid snap positions for all edges
    const leftSnap = Math.round(position.x / gridSize) * gridSize;
    const centerXSnap = Math.round((position.x + size.width / 2) / gridSize) * gridSize - size.width / 2;
    const rightSnap = Math.round((position.x + size.width) / gridSize) * gridSize - size.width;

    const topSnap = Math.round(position.y / gridSize) * gridSize;
    const centerYSnap = Math.round((position.y + size.height / 2) / gridSize) * gridSize - size.height / 2;
    const bottomSnap = Math.round((position.y + size.height) / gridSize) * gridSize - size.height;

    // Find the closest X snap
    const xOptions = [
      { pos: leftSnap, dist: Math.abs(position.x - leftSnap) },
      { pos: centerXSnap, dist: Math.abs(position.x - centerXSnap) },
      { pos: rightSnap, dist: Math.abs(position.x - rightSnap) },
    ];
    const bestX = xOptions.reduce((a, b) => (a.dist < b.dist ? a : b));

    // Find the closest Y snap
    const yOptions = [
      { pos: topSnap, dist: Math.abs(position.y - topSnap) },
      { pos: centerYSnap, dist: Math.abs(position.y - centerYSnap) },
      { pos: bottomSnap, dist: Math.abs(position.y - bottomSnap) },
    ];
    const bestY = yOptions.reduce((a, b) => (a.dist < b.dist ? a : b));

    return {
      position: {
        x: bestX.dist < snapTolerance ? bestX.pos : position.x,
        y: bestY.dist < snapTolerance ? bestY.pos : position.y,
      },
      snappedX: bestX.dist < snapTolerance,
      snappedY: bestY.dist < snapTolerance,
      guideLines: [],
    };
  }

  /**
   * Snap to other components for alignment
   */
  private snapToComponents(
    position: Point,
    size: Size,
    others: Component[],
    currentResult: SnapResult
  ): SnapResult {
    const { snapTolerance } = this.config;
    const guideLines: GuideLine[] = [];

    let snappedPosition = { ...currentResult.position };
    let snappedX = currentResult.snappedX;
    let snappedY = currentResult.snappedY;

    // Calculate edges of the dragging component
    const left = position.x;
    const right = position.x + size.width;
    const centerX = position.x + size.width / 2;
    const top = position.y;
    const bottom = position.y + size.height;
    const centerY = position.y + size.height / 2;

    for (const other of others) {
      const oLeft = other.position.x;
      const oRight = other.position.x + other.size.width;
      const oCenterX = other.position.x + other.size.width / 2;
      const oTop = other.position.y;
      const oBottom = other.position.y + other.size.height;
      const oCenterY = other.position.y + other.size.height / 2;

      // Check vertical alignment (X snapping)
      if (!snappedX) {
        // Left to left
        if (Math.abs(left - oLeft) < snapTolerance) {
          snappedPosition.x = oLeft;
          snappedX = true;
          guideLines.push({
            orientation: 'vertical',
            position: oLeft,
            start: Math.min(top, oTop) - 20,
            end: Math.max(bottom, oBottom) + 20,
          });
        }
        // Left to right
        else if (Math.abs(left - oRight) < snapTolerance) {
          snappedPosition.x = oRight;
          snappedX = true;
          guideLines.push({
            orientation: 'vertical',
            position: oRight,
            start: Math.min(top, oTop) - 20,
            end: Math.max(bottom, oBottom) + 20,
          });
        }
        // Center to center
        else if (Math.abs(centerX - oCenterX) < snapTolerance) {
          snappedPosition.x = oCenterX - size.width / 2;
          snappedX = true;
          guideLines.push({
            orientation: 'vertical',
            position: oCenterX,
            start: Math.min(top, oTop) - 20,
            end: Math.max(bottom, oBottom) + 20,
          });
        }
        // Right to right
        else if (Math.abs(right - oRight) < snapTolerance) {
          snappedPosition.x = oRight - size.width;
          snappedX = true;
          guideLines.push({
            orientation: 'vertical',
            position: oRight,
            start: Math.min(top, oTop) - 20,
            end: Math.max(bottom, oBottom) + 20,
          });
        }
        // Right to left
        else if (Math.abs(right - oLeft) < snapTolerance) {
          snappedPosition.x = oLeft - size.width;
          snappedX = true;
          guideLines.push({
            orientation: 'vertical',
            position: oLeft,
            start: Math.min(top, oTop) - 20,
            end: Math.max(bottom, oBottom) + 20,
          });
        }
      }

      // Check horizontal alignment (Y snapping)
      if (!snappedY) {
        // Top to top
        if (Math.abs(top - oTop) < snapTolerance) {
          snappedPosition.y = oTop;
          snappedY = true;
          guideLines.push({
            orientation: 'horizontal',
            position: oTop,
            start: Math.min(left, oLeft) - 20,
            end: Math.max(right, oRight) + 20,
          });
        }
        // Top to bottom
        else if (Math.abs(top - oBottom) < snapTolerance) {
          snappedPosition.y = oBottom;
          snappedY = true;
          guideLines.push({
            orientation: 'horizontal',
            position: oBottom,
            start: Math.min(left, oLeft) - 20,
            end: Math.max(right, oRight) + 20,
          });
        }
        // Center to center
        else if (Math.abs(centerY - oCenterY) < snapTolerance) {
          snappedPosition.y = oCenterY - size.height / 2;
          snappedY = true;
          guideLines.push({
            orientation: 'horizontal',
            position: oCenterY,
            start: Math.min(left, oLeft) - 20,
            end: Math.max(right, oRight) + 20,
          });
        }
        // Bottom to bottom
        else if (Math.abs(bottom - oBottom) < snapTolerance) {
          snappedPosition.y = oBottom - size.height;
          snappedY = true;
          guideLines.push({
            orientation: 'horizontal',
            position: oBottom,
            start: Math.min(left, oLeft) - 20,
            end: Math.max(right, oRight) + 20,
          });
        }
        // Bottom to top
        else if (Math.abs(bottom - oTop) < snapTolerance) {
          snappedPosition.y = oTop - size.height;
          snappedY = true;
          guideLines.push({
            orientation: 'horizontal',
            position: oTop,
            start: Math.min(left, oLeft) - 20,
            end: Math.max(right, oRight) + 20,
          });
        }
      }

      // Early exit if both snapped
      if (snappedX && snappedY) break;
    }

    return {
      position: snappedPosition,
      snappedX,
      snappedY,
      guideLines,
    };
  }

  /**
   * Snap a single coordinate to the grid
   */
  snapToGridValue(value: number): number {
    const { gridSize } = this.config;
    return Math.round(value / gridSize) * gridSize;
  }

  /**
   * Check if a value is on a grid line
   */
  isOnGrid(value: number): boolean {
    const { gridSize } = this.config;
    return value % gridSize === 0;
  }

  /**
   * Get the nearest grid point to a position
   */
  getNearestGridPoint(position: Point): Point {
    const { gridSize } = this.config;
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }
}

// ============================================================================
// Default Instance
// ============================================================================

export const snapEngine = new SnapEngine();
