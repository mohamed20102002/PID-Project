/**
 * Connection Manager
 *
 * Manages pipe connections between components.
 * Uses PortCalculator for 100% accurate port position calculations.
 */

import { Point, Connection, Component, Port } from '../../types';
import { PortDefinition, SymbolDefinition } from '../../types/symbol.types';
import {
  getPortWorldPosition,
  getPortWorldAngle,
  findPort,
  findPortDefinition,
  findNearestPort as findNearestPortUtil,
  getComponentSize,
} from '../geometry/PortCalculator';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionCandidate {
  componentKks: string;
  portId: string;
  portPosition: Point;
  portDefinition: PortDefinition;
  connectionType: 'pipe' | 'signal';
}

export interface ConnectionValidation {
  valid: boolean;
  reason?: string;
}

// ============================================================================
// Re-export from PortCalculator for backwards compatibility
// ============================================================================

export { getPortWorldPosition as getPortAbsolutePosition } from '../geometry/PortCalculator';

// ============================================================================
// Port Angle Calculation
// ============================================================================

/**
 * Get port direction angle adjusted for component rotation
 */
export const getPortAngle = (
  component: Component,
  portDefinition: PortDefinition
): number => {
  const baseAngle = portDefinition.defaultAngle || 0;
  return (baseAngle + component.rotation) % 360;
};

// ============================================================================
// Connection Validation
// ============================================================================

/**
 * Validate if a connection between two ports is allowed
 */
export const validateConnection = (
  sourceComponent: Component,
  sourcePort: Port,
  targetComponent: Component,
  targetPort: Port,
  customSymbols: Record<string, SymbolDefinition>
): ConnectionValidation => {
  // Can't connect to self
  if (sourceComponent.kks === targetComponent.kks) {
    return { valid: false, reason: 'Cannot connect component to itself' };
  }

  // Can't connect same port
  if (
    sourceComponent.kks === targetComponent.kks &&
    sourcePort.id === targetPort.id
  ) {
    return { valid: false, reason: 'Cannot connect port to itself' };
  }

  // Get port definitions for connection type validation
  const sourceSymbol = customSymbols[sourceComponent.type];
  const targetSymbol = customSymbols[targetComponent.type];

  if (!sourceSymbol || !targetSymbol) {
    return { valid: false, reason: 'Invalid component type' };
  }

  const sourcePortDef = sourceSymbol.ports?.find(p => p.id === sourcePort.id);
  const targetPortDef = targetSymbol.ports?.find(p => p.id === targetPort.id);

  if (!sourcePortDef || !targetPortDef) {
    return { valid: false, reason: 'Port definition not found' };
  }

  // Check direction compatibility
  const sourceDir = sourcePortDef.direction;
  const targetDir = targetPortDef.direction;

  if (sourceDir === 'in' && targetDir === 'in') {
    return { valid: false, reason: 'Cannot connect two input ports' };
  }

  if (sourceDir === 'out' && targetDir === 'out') {
    return { valid: false, reason: 'Cannot connect two output ports' };
  }

  // Check connection type compatibility
  const sourceAllowed = sourcePortDef.allowedConnections || ['pipe'];
  const targetAllowed = targetPortDef.allowedConnections || ['pipe'];

  const commonTypes = sourceAllowed.filter(t => targetAllowed.includes(t));
  if (commonTypes.length === 0) {
    return { valid: false, reason: 'Incompatible connection types' };
  }

  return { valid: true };
};

// ============================================================================
// Connection Type Determination
// ============================================================================

/**
 * Determine connection type based on port types
 */
export const determineConnectionType = (
  sourcePortDef: PortDefinition,
  targetPortDef: PortDefinition
): 'pipe' | 'signal' => {
  const sourceAllowed = sourcePortDef.allowedConnections || ['pipe'];
  const targetAllowed = targetPortDef.allowedConnections || ['pipe'];

  if (sourceAllowed.includes('pipe') && targetAllowed.includes('pipe')) {
    return 'pipe';
  }

  if (sourceAllowed.includes('signal') && targetAllowed.includes('signal')) {
    return 'signal';
  }

  return 'pipe';
};

// ============================================================================
// Path Calculation
// ============================================================================

/**
 * Calculate orthogonal path between two points.
 * Path starts and ends EXACTLY at the given positions.
 */
export const calculateOrthogonalPath = (
  start: Point,
  end: Point,
  startAngle: number,
  endAngle: number
): Point[] => {
  const points: Point[] = [start];

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Simple orthogonal routing
  if (Math.abs(dx) > Math.abs(dy)) {
    const midX = start.x + dx / 2;
    points.push({ x: midX, y: start.y });
    points.push({ x: midX, y: end.y });
  } else {
    const midY = start.y + dy / 2;
    points.push({ x: start.x, y: midY });
    points.push({ x: end.x, y: midY });
  }

  points.push(end);
  return points;
};

// ============================================================================
// Port Finding
// ============================================================================

/**
 * Find the nearest port to a given point
 */
export const findNearestPort = (
  point: Point,
  components: Record<string, Component>,
  maxDistance: number = 30
): ConnectionCandidate | null => {
  const result = findNearestPortUtil(point, components, maxDistance);

  if (!result) return null;

  const portDef = findPortDefinition(result.component.type, result.port.id);
  if (!portDef) return null;

  return {
    componentKks: result.component.kks,
    portId: result.port.id,
    portPosition: result.position,
    portDefinition: portDef,
    connectionType: portDef.allowedConnections?.includes('signal') ? 'signal' : 'pipe',
  };
};

// ============================================================================
// Cross-System Detection
// ============================================================================

/**
 * Check if two components belong to different systems
 */
export const isCrossSystemConnection = (
  sourceComponent: Component,
  targetComponent: Component
): boolean => {
  return sourceComponent.systemKks !== targetComponent.systemKks;
};

// ============================================================================
// Connection Manager Class
// ============================================================================

export class ConnectionManager {
  private components: Record<string, Component>;
  private connections: Record<string, Connection>;
  private customSymbols: Record<string, SymbolDefinition>;

  constructor(
    components: Record<string, Component> = {},
    connections: Record<string, Connection> = {},
    customSymbols: Record<string, SymbolDefinition> = {}
  ) {
    this.components = components;
    this.connections = connections;
    this.customSymbols = customSymbols;
  }

  updateData(
    components: Record<string, Component>,
    connections: Record<string, Connection>,
    customSymbols: Record<string, SymbolDefinition>
  ) {
    this.components = components;
    this.connections = connections;
    this.customSymbols = customSymbols;
  }

  /**
   * Get exact world position of a port
   */
  getPortPosition(componentKks: string, portId: string): Point | null {
    const component = this.components[componentKks];
    if (!component) return null;

    const port = findPort(component, portId);
    if (!port) return null;

    return getPortWorldPosition(component, port);
  }

  /**
   * Validate a new connection
   */
  validateNewConnection(
    sourceKks: string,
    sourcePortId: string,
    targetKks: string,
    targetPortId: string
  ): ConnectionValidation {
    const source = this.components[sourceKks];
    const target = this.components[targetKks];

    if (!source || !target) {
      return { valid: false, reason: 'Component not found' };
    }

    const sourcePort = findPort(source, sourcePortId);
    const targetPort = findPort(target, targetPortId);

    if (!sourcePort || !targetPort) {
      return { valid: false, reason: 'Port not found' };
    }

    return validateConnection(source, sourcePort, target, targetPort, this.customSymbols);
  }

  /**
   * Find nearest port to a position
   */
  findNearestPort(point: Point, excludeKks?: string): ConnectionCandidate | null {
    const filtered = { ...this.components };
    if (excludeKks) {
      delete filtered[excludeKks];
    }
    return findNearestPort(point, filtered);
  }

  /**
   * Calculate path between two ports
   */
  calculatePath(
    sourceKks: string,
    sourcePortId: string,
    targetKks: string,
    targetPortId: string
  ): Point[] {
    const source = this.components[sourceKks];
    const target = this.components[targetKks];

    if (!source || !target) return [];

    const sourcePort = findPort(source, sourcePortId);
    const targetPort = findPort(target, targetPortId);

    if (!sourcePort || !targetPort) return [];

    // Get exact port positions
    const startPos = getPortWorldPosition(source, sourcePort);
    const endPos = getPortWorldPosition(target, targetPort);

    // Get port angles
    const sourcePortDef = findPortDefinition(source.type, sourcePortId);
    const targetPortDef = findPortDefinition(target.type, targetPortId);

    const startAngle = sourcePortDef ? getPortAngle(source, sourcePortDef) : 0;
    const endAngle = targetPortDef ? getPortAngle(target, targetPortDef) : 180;

    return calculateOrthogonalPath(startPos, endPos, startAngle, endAngle);
  }
}

export default ConnectionManager;
