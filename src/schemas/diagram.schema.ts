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
  allowedConnectionTypes: z.array(ConnectionTypeSchema),
});

export const LabelPositionSchema = z.enum(['top', 'bottom', 'left', 'right', 'center']);

export const ComponentStyleSchema = z.object({
  strokeColor: z.string(),
  fillColor: z.string(),
  strokeWidth: z.number().positive(),
  opacity: z.number().min(0).max(1),
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
  custom: z.record(z.string(), PropertyValueSchema),
});

export const ComponentSchema = z.object({
  kks: z.string().min(1),
  type: z.string().min(1),
  systemKks: z.string(),
  buildingKks: z.string(),
  position: PointSchema,
  rotation: ComponentRotationSchema,
  scale: PointSchema,
  size: SizeSchema,
  ports: z.array(PortSchema),
  properties: ComponentPropertiesSchema,
  style: ComponentStyleSchema,
  locked: z.boolean(),
  visible: z.boolean(),
  layerId: z.string().optional(),
});

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
  custom: z.record(z.string(), PropertyValueSchema),
});

export const ConnectionSchema = z.object({
  kks: z.string().min(1),
  type: ConnectionTypeSchema,
  label: z.string().optional(),
  sourceComponentKks: z.string().min(1),
  sourcePortId: z.string().min(1),
  targetComponentKks: z.string().min(1),
  targetPortId: z.string().min(1),
  isCrossSystem: z.boolean(),
  sourceSystemKks: z.string().optional(),
  targetSystemKks: z.string().optional(),
  waypoints: z.array(PointSchema),
  routingType: RoutingTypeSchema,
  style: ConnectionStyleSchema,
  properties: ConnectionPropertiesSchema,
  locked: z.boolean(),
  visible: z.boolean(),
});

// ============================================================================
// Diagram Schemas
// ============================================================================

export const DiagramMetadataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  author: z.string(),
  revision: z.string(),
  facility: z.string().optional(),
  system: z.string().optional(),
  sheetNumber: z.string().optional(),
  totalSheets: z.number().positive().optional(),
  tags: z.array(z.string()),
});

export const DiagramSettingsSchema = z.object({
  gridSize: z.number().positive(),
  gridEnabled: z.boolean(),
  snapToGrid: z.boolean(),
  snapTolerance: z.number().positive(),
  canvasWidth: z.number().positive(),
  canvasHeight: z.number().positive(),
  backgroundColor: z.string(),
  defaultPipeStyle: ConnectionStyleSchema,
  showLabels: z.boolean(),
  showPorts: z.boolean(),
});

export const DiagramSchema = z.object({
  kks: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  systemKks: z.string(),
  metadata: DiagramMetadataSchema,
  settings: DiagramSettingsSchema,
  components: z.record(z.string(), ComponentSchema),
  connections: z.record(z.string(), ConnectionSchema),
  createdAt: z.string().datetime({ offset: true }).or(z.string()),
  modifiedAt: z.string().datetime({ offset: true }).or(z.string()),
});

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

export const SystemSchema = z.object({
  kks: z.string().min(1),
  code: KksSystemCodeSchema,
  name: z.string(),
  description: z.string().optional(),
  unitKks: z.string(),
  color: z.string().optional(),
  diagrams: z.array(z.string()),
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
  version: z.string(),
  application: z.literal('FlowMark'),
  exportedAt: z.string(),
  diagram: DiagramSchema,
});

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
