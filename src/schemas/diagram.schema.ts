/**
 * Diagram Validation Schemas
 *
 * Zod schemas for validating diagram data on save/load.
 * Ensures data integrity and provides helpful error messages.
 */

import { z } from 'zod';

// ============================================================================
// Basic Geometry Schemas
// ============================================================================

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

// ============================================================================
// Property Value Schemas
// ============================================================================

export const PropertyValueSchema = z.object({
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  designValue: z.number().optional(),
});

// ============================================================================
// Component Schemas
// ============================================================================

export const ComponentRotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

export const PortDirectionSchema = z.enum(['in', 'out', 'bidirectional']);

export const ConnectionTypeSchema = z.enum([
  'pipe',
  'signal',
  'electrical',
  'pneumatic',
  'hydraulic',
]);

export const PortSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  position: PointSchema,
  direction: PortDirectionSchema,
  angle: z.number(),
  connectionKks: z.string().optional(),
  connectionId: z.string().optional(),  // Legacy field from old format
  allowedConnectionTypes: z.array(ConnectionTypeSchema),
});

export const LabelPositionSchema = z.enum(['top', 'bottom', 'left', 'right', 'center']);

export const ComponentStyleSchema = z.object({
  strokeColor: z.string(),
  fillColor: z.string(),
  strokeWidth: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fontSize: z.number().positive().optional(),
  fontFamily: z.string().optional(),
  labelPosition: LabelPositionSchema.optional(),
  labelOffset: PointSchema.optional(),
});

export const ComponentPropertiesSchema = z.object({
  tagNumber: z.string().optional(),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  flowRate: PropertyValueSchema.optional(),
  pressure: PropertyValueSchema.optional(),
  temperature: PropertyValueSchema.optional(),
  level: PropertyValueSchema.optional(),
  normalPosition: z.string().optional(),
  failPosition: z.string().optional(),
  custom: z.record(z.string(), PropertyValueSchema).optional(),
}).passthrough();  // Allow additional properties

export const ComponentSchema = z.object({
  kks: z.string().min(1),
  type: z.string().min(1),
  systemKks: z.string(),
  buildingKks: z.string(),
  position: PointSchema,
  rotation: ComponentRotationSchema.optional(),
  scale: PointSchema.optional(),
  size: SizeSchema.optional(),
  ports: z.array(PortSchema).optional(),
  properties: ComponentPropertiesSchema.optional(),
  style: ComponentStyleSchema.optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  layerId: z.string().optional(),
  wrapLabel: z.boolean().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  id: z.string().optional(),
}).passthrough();  // Allow additional properties

// ============================================================================
// Connection Schemas
// ============================================================================

export const LineTypeSchema = z.enum(['solid', 'dashed', 'dotted']);
export const RoutingTypeSchema = z.enum(['straight', 'orthogonal', 'curved', 'manual']);

export const ConnectionStyleSchema = z.object({
  strokeColor: z.string(),
  strokeWidth: z.number().positive(),
  strokeDash: z.array(z.number()).optional(),
  lineType: LineTypeSchema,
  arrowStart: z.boolean().optional(),
  arrowEnd: z.boolean().optional(),
});

export const ConnectionPropertiesSchema = z.object({
  lineNumber: z.string().optional(),
  nominalSize: z.string().optional(),
  schedule: z.string().optional(),
  material: z.string().optional(),
  insulation: z.string().optional(),
  fluidType: z.string().optional(),
  designPressure: PropertyValueSchema.optional(),
  designTemperature: PropertyValueSchema.optional(),
  operatingPressure: PropertyValueSchema.optional(),
  operatingTemperature: PropertyValueSchema.optional(),
  flowRate: PropertyValueSchema.optional(),
  custom: z.record(z.string(), PropertyValueSchema).optional(),
}).passthrough();  // Allow additional properties

export const ConnectionSchema = z.object({
  kks: z.string().min(1),
  type: ConnectionTypeSchema,
  label: z.string().optional(),
  // Support both old ID-based and new KKS-based formats
  sourceComponentId: z.string().min(1).optional(),
  sourceComponentKks: z.string().min(1).optional(),
  sourcePortId: z.string().min(1),
  targetComponentId: z.string().min(1).optional(),
  targetComponentKks: z.string().min(1).optional(),
  targetPortId: z.string().min(1),
  isCrossSystem: z.boolean().optional(),
  sourceSystemKks: z.string().optional(),
  targetSystemKks: z.string().optional(),
  waypoints: z.array(PointSchema).optional(),
  routingType: RoutingTypeSchema.optional(),
  style: ConnectionStyleSchema.optional(),
  properties: ConnectionPropertiesSchema.optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  id: z.string().optional(),
}).passthrough();  // Allow additional properties

// ============================================================================
// Diagram Schemas
// ============================================================================

export const DiagramMetadataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  revision: z.string().optional(),
  facility: z.string().optional(),
  system: z.string().optional(),
  sheetNumber: z.string().optional(),
  totalSheets: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();  // Allow additional properties

export const DiagramSettingsSchema = z.object({
  gridSize: z.number().positive().optional(),
  gridEnabled: z.boolean().optional(),
  snapToGrid: z.boolean().optional(),
  snapTolerance: z.number().positive().optional(),
  canvasWidth: z.number().positive().optional(),
  canvasHeight: z.number().positive().optional(),
  backgroundColor: z.string().optional(),
  defaultPipeStyle: ConnectionStyleSchema.optional(),
  showLabels: z.boolean().optional(),
  showPorts: z.boolean().optional(),
}).passthrough();  // Allow additional properties

// Building polygon schema for diagram areas
export const BuildingPolygonSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  polygon: z.array(PointSchema),
  fillColor: z.string(),
  strokeColor: z.string(),
  strokeWidth: z.number(),
  strokeDash: z.array(z.number()).optional(),
  labelPosition: PointSchema,
  labelVisible: z.boolean(),
  containedItems: z.array(z.string()),
  locked: z.boolean(),
  visible: z.boolean(),
  zIndex: z.number(),
});

export const DiagramSchema = z.object({
  kks: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional(),
  systemKks: z.string(),
  metadata: DiagramMetadataSchema.optional(),
  settings: DiagramSettingsSchema.optional(),
  components: z.record(z.string(), ComponentSchema).optional(),
  connections: z.record(z.string(), ConnectionSchema).optional(),
  buildings: z.record(z.string(), BuildingPolygonSchema).optional(),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
}).passthrough();  // Allow additional properties

// ============================================================================
// KKS Schemas
// ============================================================================

export const KksSystemCodeSchema = z.object({
  mainGroup: z.string().length(1),
  subGroup1: z.string().length(1),
  subGroup2: z.string().length(1),
  number: z.string().length(2),
});

export const FloorSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  elevation: z.number().optional(),
});

export const BuildingSchema = z.object({
  kks: z.string().min(1),
  name: z.string(),
  abbreviation: z.string().optional(),
  floors: z.array(FloorSchema),
});

export const SafetyClassSchema = z.enum(['A', 'B', 'C', 'NNS', 'N/A']);
export const SeismicClassSchema = z.enum(['S1', 'S2', 'S3', 'NS', 'N/A']);
export const SystemTypeSchema = z.enum(['NOS', 'SS']);

export const SystemConnectionSchema = z.object({
  targetSystemKks: z.string(),
  connectionType: z.string().optional(),
  description: z.string().optional(),
});

export const SystemSchema = z.object({
  kks: z.string().min(1),
  code: KksSystemCodeSchema,
  name: z.string(),
  description: z.string().optional(),
  unitKks: z.string(),
  color: z.string().optional(),
  diagrams: z.array(z.string()),
  safetyClass: SafetyClassSchema.optional(),
  seismicClass: SeismicClassSchema.optional(),
  systemTypes: z.array(SystemTypeSchema).optional(),
  connectedSystems: z.array(SystemConnectionSchema).optional(),
});

export const UnitSchema = z.object({
  kks: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  systems: z.record(z.string(), SystemSchema),
});

export const PlantSchema = z.object({
  kks: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  units: z.record(z.string(), UnitSchema),
  buildings: z.record(z.string(), BuildingSchema),
  createdAt: z.string(),
  modifiedAt: z.string(),
});

// ============================================================================
// File Format Schemas
// ============================================================================

/**
 * Complete save file format
 */
export const SaveFileSchema = z.object({
  version: z.string().optional(),
  application: z.string().optional(),  // Allow any string, not just 'FlowMark'
  exportedAt: z.string().optional(),
  diagram: DiagramSchema,
}).passthrough();  // Allow additional properties

/**
 * Plant file format (includes all units, systems, and diagrams)
 */
export const PlantFileSchema = z.object({
  version: z.string(),
  application: z.literal('FlowMark'),
  exportedAt: z.string(),
  plant: PlantSchema,
  diagrams: z.record(z.string(), DiagramSchema),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SaveFile = z.infer<typeof SaveFileSchema>;
export type PlantFile = z.infer<typeof PlantFileSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate diagram data
 */
export function validateDiagram(data: unknown): {
  success: boolean;
  data?: z.infer<typeof DiagramSchema>;
  errors?: string[];
} {
  const result = DiagramSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}

/**
 * Validate save file data
 */
export function validateSaveFile(data: unknown): {
  success: boolean;
  data?: SaveFile;
  errors?: string[];
} {
  const result = SaveFileSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}

/**
 * Validate plant file data
 */
export function validatePlantFile(data: unknown): {
  success: boolean;
  data?: PlantFile;
  errors?: string[];
} {
  const result = PlantFileSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    ),
  };
}
