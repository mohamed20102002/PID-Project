/**
 * P&ID Symbol Type Definitions
 *
 * Defines the structure for P&ID symbols (valves, pumps, tanks, etc.)
 * Symbols are defined declaratively and rendered dynamically.
 */

import { Point, Size, ComponentStyle, PortDirection, ConnectionType } from './diagram.types';

// ============================================================================
// Symbol Definition
// ============================================================================

/**
 * Complete symbol definition
 */
export interface SymbolDefinition {
  id: string;                         // Unique identifier (e.g., "valve:gate")
  category: SymbolCategory;           // Category for organization
  name: string;                       // Internal name
  displayName: string;                // Display name for UI
  description: string;                // Description for tooltip
  standard: SymbolStandard;           // Which standard it follows
  kksEquipmentCode: string;           // Default KKS equipment code (e.g., "AA")

  // KKS behavior
  noKks?: boolean;                    // If true, component auto-generates ID, no KKS required (e.g., corners)

  // Sizing
  defaultSize: Size;
  minSize: Size;
  maxSize: Size;
  resizable: boolean;
  aspectRatioLocked: boolean;

  // Rotation
  rotatable: boolean;
  rotationSteps: number[];            // Allowed rotation angles
  freeRotation: boolean;              // Allow any rotation angle

  // Visual definition
  paths: SymbolPath[];                // SVG-like paths
  ports: PortDefinition[];            // Connection ports
  labels: LabelDefinition[];          // Text labels                         >> un comment this and the (Labels in each component to get it to work)

  // Center point for alignment (relative position 0-1)
  centerPoint?: Point;                // Custom center point for alignment in flowmark canvas

  // Properties
  propertySchema: PropertySchema;     // Editable properties

  // Preview
  thumbnail?: string;                 // Base64 or SVG for palette
}

/**
 * Symbol categories based on KKS Equipment Codes (Sector No. 4)
 *
 * A - Aggregates: AA, AB, AC, AG, AH, AM, AN, AP, AT
 * B - Devices: BB, BN, BP, BQ, BR, BS
 * C - Sensors: CE, CF, CJ, CL, CM, CP, CQ, CS, CT
 */
export type SymbolCategory =
  // A - Aggregates
  | 'AA'  // Fittings, breaking devices
  | 'AB'  // Gateways, hatches, doors
  | 'AC'  // Heat exchangers, heating surfaces
  | 'AG'  // Generator sets
  | 'AH'  // Heaters, coolers, air conditioners
  | 'AM'  // Mixers, stirrers
  | 'AN'  // Compressors, fans
  | 'AP'  // Pumping units
  | 'AT'  // Devices for cleaning, drying, filtering and separating media
  // B - Devices
  | 'BB'  // Storage devices (vessels, containers)
  | 'BN'  // Jet pumps, ejectors, injectors
  | 'BP'  // Restriction devices, flow limiters, throttle washers
  | 'BQ'  // Supports, load-bearing structures, brackets, pipeline penetrations
  | 'BR'  // Pipelines, channels, trays
  | 'BS'  // Silencers
  // C - Sensors (Direct measuring circuits)
  | 'CE'  // Electrical quantities
  | 'CF'  // Flow, mass flow
  | 'CJ'  // Power (mechanical, thermal)
  | 'CL'  // Level (also media separation line)
  | 'CM'  // Humidity
  | 'CP'  // Pressure
  | 'CQ'  // Quality indicators (analyses, properties of substances)
  | 'CS'  // Speed, revolutions, frequency (mechanical), acceleration
  | 'CT'  // Temperature
  // Special categories (outside KKS hierarchy)
  | 'terminals'   // System terminals / cross-system connectors
  | 'corners'     // Pipe corners and bends
  | 'electrical'  // Electrical components
  | 'additional'; // Additional/miscellaneous components

/**
 * Symbol standard
 */
export type SymbolStandard = 'ISA' | 'ISO' | 'DIN' | 'custom';

// ============================================================================
// Symbol Paths (Drawing Primitives)
// ============================================================================

/**
 * Path element for symbol rendering
 */
export interface SymbolPath {
  type: PathType;
  data: PathData;
  style: PathStyle;
}

export type PathType =
  | 'line'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'arc'
  | 'path'
  | 'polygon'
  | 'polyline';

/**
 * Path data varies by type
 */
export type PathData =
  | LineData
  | RectData
  | CircleData
  | EllipseData
  | ArcData
  | PathStringData
  | PolygonData;

export interface LineData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectData {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface CircleData {
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseData {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ArcData {
  x: number;
  y: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}

export interface PathStringData {
  d: string;                          // SVG path data string
}

export interface PolygonData {
  points: Point[];                    // Relative coordinates (0-1)
}

/**
 * Path styling
 */
export interface PathStyle {
  stroke?: string;                    // 'inherit' uses component style
  strokeWidth?: number;
  fill?: string;                      // 'inherit', 'none', or color
  strokeDash?: number[];
  opacity?: number;
}

// ============================================================================
// Port Definitions
// ============================================================================

/**
 * Port definition for symbol
 */
export interface PortDefinition {
  id: string;
  name: string;
  relativePosition: Point;            // Position as ratio (0-1) of size
  direction: PortDirection;
  defaultAngle: number;               // Normal angle in degrees
  allowedConnections: ConnectionType[];
}

// ============================================================================
// Label Definitions
// ============================================================================

/**
 * Label definition for symbol
 */
export interface LabelDefinition {
  id: string;
  relativePosition: Point;            // Position as ratio of size
  anchor: TextAnchor;
  binding: string;                    // Property key to bind (e.g., "kks", "tagNumber")
  style: LabelStyle;
}

export type TextAnchor = 'start' | 'middle' | 'end';

export interface LabelStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontFamily?: string;
  fill?: string;
}

// ============================================================================
// Property Schema
// ============================================================================

/**
 * Schema for component properties
 */
export interface PropertySchema {
  required: string[];
  properties: Record<string, PropertyFieldDefinition>;
  groups?: PropertyGroup[];           // Group properties in UI
}

/**
 * Property field definition
 */
export interface PropertyFieldDefinition {
  type: PropertyFieldType;
  label: string;
  description?: string;
  defaultValue?: unknown;
  placeholder?: string;
  group?: string;                     // Property group ID

  // For select type
  options?: SelectOption[];

  // For number type
  min?: number;
  max?: number;
  step?: number;

  // For unit-value type
  units?: string[];
  defaultUnit?: string;

  // Validation
  required?: boolean;
  pattern?: string;                   // Regex pattern
  patternMessage?: string;            // Error message for pattern
}

export type PropertyFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi-select'
  | 'unit-value'
  | 'color'
  | 'text';                           // Multi-line text

export interface SelectOption {
  value: string;
  label: string;
}

export interface PropertyGroup {
  id: string;
  label: string;
  collapsed?: boolean;
}

// ============================================================================
// Symbol Instance (Runtime)
// ============================================================================

/**
 * Runtime symbol instance with calculated values
 */
export interface SymbolInstance {
  definition: SymbolDefinition;
  position: Point;
  rotation: number;
  scale: Point;
  size: Size;
  style: ComponentStyle;
  absolutePorts: AbsolutePort[];      // Ports with absolute positions
}

/**
 * Port with calculated absolute position
 */
export interface AbsolutePort {
  id: string;
  name: string;
  position: Point;                    // Absolute position on canvas
  direction: PortDirection;
  angle: number;                      // Absolute angle
  connectionId?: string;
  allowedConnections: ConnectionType[];
}

// ============================================================================
// Symbol Registry Types
// ============================================================================

/**
 * Symbol library containing all available symbols
 */
export interface SymbolLibrary {
  builtIn: Record<string, SymbolDefinition>;
  custom: Record<string, SymbolDefinition>;
}

/**
 * Symbol palette category for UI
 */
export interface SymbolPaletteCategory {
  id: string;
  name: string;
  icon?: string;
  symbols: string[];                  // Symbol IDs
  expanded?: boolean;
}
