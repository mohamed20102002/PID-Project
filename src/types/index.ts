/**
 * Type Definitions Index
 *
 * Re-exports all types for convenient imports
 */

// KKS Types
export type {
  KksUnit,
  KksSystemCode,
  KksEquipmentCode,
  KksCode,
  Plant,
  Unit,
  System,
  Building,
  Floor,
  KksParseResult,
  KksGenerationOptions,
  KksFilter,
} from './kks.types';
export { KKS_MAIN_GROUPS, KKS_EQUIPMENT_TYPES } from './kks.types';

// Diagram Types
export type {
  Point,
  Size,
  Bounds,
  Diagram,
  DiagramMetadata,
  DiagramSettings,
  Component,
  ComponentType,
  ComponentRotation,
  Port,
  PortDirection,
  ComponentProperties,
  PropertyValue,
  ComponentStyle,
  LabelPosition,
  Connection,
  ConnectionType,
  RoutingType,
  ConnectionStyle,
  LineType,
  ConnectionProperties,
  BuildingPolygon,
  Layer,
  Selection,
  SelectionType,
} from './diagram.types';
export {
  DEFAULT_DIAGRAM_SETTINGS,
  DEFAULT_COMPONENT_STYLE,
  DEFAULT_CONNECTION_STYLE,
  DEFAULT_BUILDING_POLYGON_STYLE,
} from './diagram.types';

// Symbol Types
export type {
  SymbolDefinition,
  SymbolCategory,
  SymbolStandard,
  SymbolPath,
  PathType,
  PathData,
  LineData,
  RectData,
  CircleData,
  EllipseData,
  ArcData,
  PathStringData,
  PolygonData,
  PathStyle,
  PortDefinition,
  LabelDefinition,
  TextAnchor,
  LabelStyle,
  PropertySchema,
  PropertyFieldDefinition,
  PropertyFieldType,
  SelectOption,
  PropertyGroup,
  SymbolInstance,
  AbsolutePort,
  SymbolLibrary,
  SymbolPaletteCategory,
} from './symbol.types';
