/**
 * Port Calculator
 *
 * SINGLE SOURCE OF TRUTH for all port position calculations.
 * This module ensures 100% accuracy between:
 * - Where ports are visually rendered (BaseSymbol)
 * - Where pipes connect to ports (ConnectionsLayer)
 * - Where connection paths are calculated (ConnectionManager)
 *
 * The calculation matches exactly how Konva transforms work:
 * 1. Port starts at local position: (relX * width, relY * height)
 * 2. Offset is applied: subtract (width/2, height/2) to center the component
 * 3. Rotation is applied around the center
 * 4. Translation to world position
 */

import { Point, Component, Port } from '../../types';
import { SymbolRegistry } from '../../data/symbols/SymbolRegistry';
import { PortDefinition } from '../../types/symbol.types';

/**
 * Get the definitive size for a component.
 * Priority: component.size -> symbol definition -> error
 */
export function getComponentSize(component: Component): { width: number; height: number } {
  // First try component's stored size
  if (component.size?.width && component.size?.height) {
    return { width: component.size.width, height: component.size.height };
  }

  // Fallback to symbol definition
  const definition = SymbolRegistry.getSymbol(component.type);
  if (definition?.defaultSize) {
    return { width: definition.defaultSize.width, height: definition.defaultSize.height };
  }

  // This should never happen - log error
  console.error(`No size found for component type: ${component.type}`);
  return { width: 40, height: 40 };
}

/**
 * Calculate the EXACT world position of a port.
 * This is the definitive calculation used everywhere.
 *
 * @param component - The component the port belongs to
 * @param portRelativePosition - The port's relative position (0-1 normalized)
 * @returns The exact world coordinates where the port center should be
 */
export function calculatePortWorldPosition(
  component: Component,
  portRelativePosition: Point
): Point {
  const size = getComponentSize(component);
  const rotation = component.rotation || 0;

  // Step 1: Calculate port position in component's local space
  // Port relative position is 0-1, multiply by size to get pixel position
  // Then subtract half size because component is centered (offset in Konva)
  const localX = (portRelativePosition.x - 0.5) * size.width;
  const localY = (portRelativePosition.y - 0.5) * size.height;

  // Step 2: Apply rotation around center (0, 0)
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;

  // Step 3: Translate to world position
  return {
    x: component.position.x + rotatedX,
    y: component.position.y + rotatedY,
  };
}

/**
 * Calculate port world position from a Port object (stored on component)
 */
export function getPortWorldPosition(component: Component, port: Port): Point {
  return calculatePortWorldPosition(component, port.position);
}

/**
 * Calculate port world position from a PortDefinition (from symbol)
 */
export function getPortWorldPositionFromDefinition(
  component: Component,
  portDef: PortDefinition
): Point {
  return calculatePortWorldPosition(component, portDef.relativePosition);
}

/**
 * Get port angle in world space (adjusted for component rotation)
 */
export function getPortWorldAngle(component: Component, baseAngle: number): number {
  return (baseAngle + (component.rotation || 0)) % 360;
}

/**
 * Find a port on a component by ID
 */
export function findPort(component: Component, portId: string): Port | undefined {
  return component.ports.find(p => p.id === portId);
}

/**
 * Find a port definition from a symbol
 */
export function findPortDefinition(
  componentType: string,
  portId: string
): PortDefinition | undefined {
  const definition = SymbolRegistry.getSymbol(componentType);
  return definition?.ports?.find(p => p.id === portId);
}

/**
 * Get all port world positions for a component
 */
export function getAllPortWorldPositions(
  component: Component
): Map<string, Point> {
  const positions = new Map<string, Point>();

  for (const port of component.ports) {
    positions.set(port.id, getPortWorldPosition(component, port));
  }

  return positions;
}

/**
 * Calculate distance between a point and a port
 */
export function distanceToPort(
  point: Point,
  component: Component,
  port: Port
): number {
  const portPos = getPortWorldPosition(component, port);
  const dx = point.x - portPos.x;
  const dy = point.y - portPos.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the nearest port to a given world position
 */
export function findNearestPort(
  worldPosition: Point,
  components: Record<string, Component>,
  maxDistance: number = 30,
  excludeComponentKks?: string
): { component: Component; port: Port; distance: number; position: Point } | null {
  let nearest: { component: Component; port: Port; distance: number; position: Point } | null = null;

  for (const component of Object.values(components)) {
    if (excludeComponentKks && component.kks === excludeComponentKks) continue;

    for (const port of component.ports) {
      const portPos = getPortWorldPosition(component, port);
      const dx = worldPosition.x - portPos.x;
      const dy = worldPosition.y - portPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
        nearest = { component, port, distance, position: portPos };
      }
    }
  }

  return nearest;
}
