/**
 * P&ID Diagram Type Definitions
 *
 * Core types for the diagram data model including components,
 * connections, and diagram structure.
 */

import { KksCode } from './kks.types';

// ============================================================================
// Basic Geometry Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Diagram Structure
// ============================================================================

/**
 * Complete diagram definition
 */
export interface Diagram {
  kks: string;                        // Diagram identifier
  name: string;                       // Diagram title
  version: string;                    // Schema version
  systemKks: string;                  // Parent system KKS
  metadata: DiagramMetadata;
  settings: DiagramSettings;
  components: Record<string, Component>;
  connections: Record<string, Connection>; // Keyed by connection.id (not kks)
  buildings: Record<string, BuildingPolygon>; // Building/area polygons
  createdAt: string;                  // ISO timestamp
  modifiedAt: string;                 // ISO timestamp
}

/**
 * Diagram metadata
 */
export interface DiagramMetadata {
  title: string;
  description?: string;
  author: string;
  revision: string;
  facility?: string;
  system?: string;
  sheetNumber?: string;
  totalSheets?: number;
  tags: string[];
}

/**
 * Diagram canvas and behavior settings
 */
export interface DiagramSettings {
  gridSize: number;                   // Grid cell size in pixels
  gridEnabled: boolean;               // Show grid
  snapToGrid: boolean;                // Enable grid snapping
  snapTolerance: number;              // Snap distance threshold
  canvasWidth: number;                // Canvas width in pixels
  canvasHeight: number;               // Canvas height in pixels
  backgroundColor: string;            // Canvas background color
  defaultPipeStyle: ConnectionStyle;  // Default style for new pipes
  showLabels: boolean;                // Show component labels
  showPorts: boolean;                 // Show connection ports
}

// ============================================================================
// Component Types
// ============================================================================

/**
 * P&ID Component (equipment, instrument, etc.)
 */
export interface Component {
  kks: string;                        // Full KKS code
  type: ComponentType;                // Component type identifier
  systemKks: string;                  // System this component belongs to
  buildingKks: string;                // Building/location code
  position: Point;                    // Position on canvas
  rotation: ComponentRotation;        // Rotation angle
  scale: Point;                       // Scale factor (default 1,1)
  size: Size;                         // Component dimensions
  ports: Port[];                      // Connection ports
  properties: ComponentProperties;    // Component metadata
  style: ComponentStyle;              // Visual styling
  locked: boolean;                    // Prevent editing
  visible: boolean;                   // Visibility toggle
  layerId?: string;                   // Layer assignment
}

/**
 * Component type identifier
 * Format: "category:type" (e.g., "valve:gate", "pump:centrifugal")
 */
export type ComponentType = string;

/**
 * Standard rotation angles in degrees
 */
export type ComponentRotation = 0 | 90 | 180 | 270;

/**
 * Connection port on a component
 */
export interface Port {
  id: string;                         // Unique port identifier
  name: string;                       // Port name (e.g., "inlet", "outlet")
  position: Point;                    // Position relative to component origin
  direction: PortDirection;           // Flow direction
  angle: number;                      // Normal angle for pipe routing
  connectionId?: string;              // Connected pipe ID (if connected)
  allowedConnectionTypes: ConnectionType[];
}

/**
 * Port flow direction
 */
export type PortDirection = 'in' | 'out' | 'bidirectional';

/**
 * Component properties (metadata)
 */
export interface ComponentProperties {
  // Identification
  tagNumber?: string;
  description?: string;
  manufacturer?: string;
  model?: string;

  // Process properties
  flowRate?: PropertyValue;
  pressure?: PropertyValue;
  temperature?: PropertyValue;
  level?: PropertyValue;

  // Status
  normalPosition?: string;            // For valves: "open", "closed", "throttled"
  failPosition?: string;              // For valves: "fail open", "fail closed"

  // Custom properties
  custom: Record<string, PropertyValue>;
}

/**
 * Property value with optional unit and range
 */
export interface PropertyValue {
  value: number | string | boolean;
  unit?: string;
  min?: number;
  max?: number;
  designValue?: number;
}

/**
 * Component visual styling
 */
export interface ComponentStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  fontFamily?: string;
  labelPosition?: LabelPosition;
  labelOffset?: Point;
}

export type LabelPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

// ============================================================================
// Connection Types
// ============================================================================

/**
 * Connection between components (pipe, signal line, etc.)
 */
export interface Connection {
  id: string;                         // Unique internal ID (auto-generated)
  kks: string;                        // Connection KKS code (can be duplicate, used for display/search)
  type: ConnectionType;               // Connection type
  label?: string;                     // Display label (e.g., "PL-101")

  // Source endpoint
  sourceComponentKks: string;
  sourcePortId: string;

  // Target endpoint
  targetComponentKks: string;
  targetPortId: string;

  // Cross-system connection info
  isCrossSystem: boolean;
  sourceSystemKks?: string;
  targetSystemKks?: string;

  // Routing
  waypoints: Point[];                 // Path control points
  routingType: RoutingType;           // How path is calculated

  // Styling
  style: ConnectionStyle;

  // Properties
  properties: ConnectionProperties;

  locked: boolean;
  visible: boolean;
}

/**
 * Connection type
 */
export type ConnectionType =
  | 'pipe'                            // Process piping
  | 'signal'                          // Instrument signal
  | 'electrical'                      // Electrical connection
  | 'pneumatic'                       // Pneumatic line
  | 'hydraulic';                      // Hydraulic line

/**
 * Pipe routing algorithm
 */
export type RoutingType = 'straight' | 'orthogonal' | 'curved' | 'manual';

/**
 * Connection visual styling
 */
export interface ConnectionStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDash?: number[];              // Dash pattern [dash, gap]
  lineType: LineType;
  arrowStart?: boolean;               // Show arrow at start
  arrowEnd?: boolean;                 // Show arrow at end
}

export type LineType = 'solid' | 'dashed' | 'dotted';

/**
 * Connection properties (for pipes)
 */
export interface ConnectionProperties {
  lineNumber?: string;
  nominalSize?: string;               // e.g., "4 inch", "DN100"
  schedule?: string;                  // Pipe schedule
  material?: string;                  // Pipe material
  insulation?: string;                // Insulation type
  fluidType?: string;                 // Process fluid

  // Process conditions
  designPressure?: PropertyValue;
  designTemperature?: PropertyValue;
  operatingPressure?: PropertyValue;
  operatingTemperature?: PropertyValue;
  flowRate?: PropertyValue;

  custom: Record<string, PropertyValue>;
}

// ============================================================================
// Building Polygon Types
// ============================================================================

/**
 * Building/Area polygon on the diagram
 * Used to define physical building boundaries or logical areas
 * Named BuildingPolygon to distinguish from KKS Building (location code)
 */
export interface BuildingPolygon {
  id: string;                         // Unique building identifier
  name: string;                       // Building name/label text
  polygon: Point[];                   // Polygon vertices (closed automatically)
  fillColor: string;                  // Fill color (with alpha, e.g., "rgba(200, 220, 255, 0.3)")
  strokeColor: string;                // Border color
  strokeWidth: number;                // Border width
  strokeDash?: number[];              // Border dash pattern (e.g., [5, 5] for dashed, undefined for solid)
  labelPosition: Point;               // Label anchor point (auto-positioned below first vertex)
  labelVisible: boolean;              // Show/hide label
  containedItems: string[];           // KKS codes of contained components (for reference)
  locked: boolean;                    // Prevent editing
  visible: boolean;                   // Visibility toggle
  zIndex: number;                     // Drawing order (lower = behind)
}

/**
 * Default building polygon style
 */
export const DEFAULT_BUILDING_POLYGON_STYLE = {
  fillColor: 'rgba(200, 220, 255, 0.2)',
  strokeColor: '#64748b',
  strokeWidth: 1,
  labelVisible: true,
};

// ============================================================================
// Layer Types
// ============================================================================

/**
 * Drawing layer for organization
 */
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
  color?: string;                     // Layer indicator color
}

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Current selection state
 */
export interface Selection {
  componentKks: string[];
  connectionIds: string[];  // Changed from connectionKks to connectionIds
  type: SelectionType;
}

export type SelectionType = 'none' | 'single' | 'multiple';

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_DIAGRAM_SETTINGS: DiagramSettings = {
  gridSize: 20,
  gridEnabled: true,
  snapToGrid: true,
  snapTolerance: 10,
  canvasWidth: 3000,
  canvasHeight: 2000,
  backgroundColor: '#ffffff',
  defaultPipeStyle: {
    strokeColor: '#000000',
    strokeWidth: 2,
    lineType: 'solid',
  },
  showLabels: true,
  showPorts: false,
};

export const DEFAULT_COMPONENT_STYLE: ComponentStyle = {
  strokeColor: '#000000',
  fillColor: '#ffffff',
  strokeWidth: 2,
  opacity: 1,
  fontSize: 12,
  labelPosition: 'bottom',
};

export const DEFAULT_CONNECTION_STYLE: ConnectionStyle = {
  strokeColor: '#000000',
  strokeWidth: 2,
  lineType: 'solid',
};
