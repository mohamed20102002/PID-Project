/**
 * Standard Property Library
 *
 * Comprehensive library of standard properties for P&ID equipment.
 * Properties are organized by equipment category and can be selected
 * when designing symbols.
 */

import type { PropertyFieldDefinition } from '../../types/symbol.types';

// ============================================================================
// Property Categories
// ============================================================================

export interface PropertyTemplate extends PropertyFieldDefinition {
  id: string;
  category: PropertyCategory;
  applicableTo?: string[]; // KKS equipment codes or 'all'
  isCommon?: boolean; // Common properties shown first
}

export type PropertyCategory =
  | 'identification'
  | 'physical'
  | 'process'
  | 'electrical'
  | 'mechanical'
  | 'material'
  | 'safety'
  | 'control'
  | 'performance'
  | 'design'
  | 'operational'
  | 'maintenance';

// ============================================================================
// Common Properties (applicable to most equipment)
// ============================================================================

export const COMMON_PROPERTIES: PropertyTemplate[] = [
  // Identification
  {
    id: 'tagNumber',
    category: 'identification',
    type: 'string',
    label: 'Tag Number',
    description: 'Equipment tag number',
    placeholder: 'e.g., P-101',
    required: true,
    isCommon: true,
  },
  {
    id: 'description',
    category: 'identification',
    type: 'text',
    label: 'Description',
    description: 'Equipment description',
    placeholder: 'Brief description of equipment',
    isCommon: true,
  },
  {
    id: 'manufacturer',
    category: 'identification',
    type: 'string',
    label: 'Manufacturer',
    description: 'Equipment manufacturer',
    isCommon: true,
  },
  {
    id: 'modelNumber',
    category: 'identification',
    type: 'string',
    label: 'Model Number',
    description: 'Manufacturer model number',
    isCommon: true,
  },
  {
    id: 'serialNumber',
    category: 'identification',
    type: 'string',
    label: 'Serial Number',
    description: 'Equipment serial number',
    isCommon: true,
  },

  // Design Parameters
  {
    id: 'designPressure',
    category: 'design',
    type: 'unit-value',
    label: 'Design Pressure',
    description: 'Maximum design pressure',
    units: ['bar', 'psi', 'kPa', 'MPa'],
    defaultUnit: 'bar',
    isCommon: true,
  },
  {
    id: 'designTemperature',
    category: 'design',
    type: 'unit-value',
    label: 'Design Temperature',
    description: 'Maximum design temperature',
    units: ['°C', '°F', 'K'],
    defaultUnit: '°C',
    isCommon: true,
  },

  // Material
  {
    id: 'material',
    category: 'material',
    type: 'string',
    label: 'Material of Construction',
    description: 'Primary material',
    placeholder: 'e.g., SS316L, Carbon Steel',
    isCommon: true,
  },
];

// ============================================================================
// Valve Properties (AA - Fittings, breaking devices)
// ============================================================================

export const VALVE_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'valveType',
    category: 'physical',
    type: 'select',
    label: 'Valve Type',
    description: 'Type of valve',
    options: [
      { value: 'gate', label: 'Gate Valve' },
      { value: 'globe', label: 'Globe Valve' },
      { value: 'ball', label: 'Ball Valve' },
      { value: 'butterfly', label: 'Butterfly Valve' },
      { value: 'check', label: 'Check Valve' },
      { value: 'plug', label: 'Plug Valve' },
      { value: 'diaphragm', label: 'Diaphragm Valve' },
      { value: 'needle', label: 'Needle Valve' },
      { value: 'safety', label: 'Safety/Relief Valve' },
      { value: 'control', label: 'Control Valve' },
    ],
    applicableTo: ['AA'],
  },
  {
    id: 'valveSize',
    category: 'physical',
    type: 'unit-value',
    label: 'Valve Size',
    description: 'Nominal valve size',
    units: ['in', 'mm', 'DN'],
    defaultUnit: 'in',
    applicableTo: ['AA'],
  },
  {
    id: 'cvValue',
    category: 'performance',
    type: 'number',
    label: 'Cv Value',
    description: 'Flow coefficient',
    min: 0,
    applicableTo: ['AA'],
  },
  {
    id: 'pressureRating',
    category: 'design',
    type: 'select',
    label: 'Pressure Rating',
    description: 'ANSI pressure class',
    options: [
      { value: '150', label: 'Class 150' },
      { value: '300', label: 'Class 300' },
      { value: '600', label: 'Class 600' },
      { value: '900', label: 'Class 900' },
      { value: '1500', label: 'Class 1500' },
      { value: '2500', label: 'Class 2500' },
    ],
    applicableTo: ['AA'],
  },
  {
    id: 'actuationType',
    category: 'control',
    type: 'select',
    label: 'Actuation Type',
    description: 'How the valve is operated',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'pneumatic', label: 'Pneumatic' },
      { value: 'electric', label: 'Electric Motor' },
      { value: 'hydraulic', label: 'Hydraulic' },
      { value: 'solenoid', label: 'Solenoid' },
    ],
    applicableTo: ['AA'],
  },
  {
    id: 'failPosition',
    category: 'safety',
    type: 'select',
    label: 'Fail Position',
    description: 'Valve position on failure',
    options: [
      { value: 'FC', label: 'Fail Close (FC)' },
      { value: 'FO', label: 'Fail Open (FO)' },
      { value: 'FL', label: 'Fail Last (FL)' },
    ],
    applicableTo: ['AA'],
  },
  {
    id: 'bodyMaterial',
    category: 'material',
    type: 'string',
    label: 'Body Material',
    description: 'Valve body material',
    placeholder: 'e.g., WCB, CF8M',
    applicableTo: ['AA'],
  },
  {
    id: 'trimMaterial',
    category: 'material',
    type: 'string',
    label: 'Trim Material',
    description: 'Internal trim material',
    applicableTo: ['AA'],
  },
  {
    id: 'seatMaterial',
    category: 'material',
    type: 'string',
    label: 'Seat Material',
    description: 'Valve seat material',
    applicableTo: ['AA'],
  },
  {
    id: 'leakageClass',
    category: 'performance',
    type: 'select',
    label: 'Leakage Class',
    description: 'ANSI/FCI leakage class',
    options: [
      { value: 'I', label: 'Class I' },
      { value: 'II', label: 'Class II' },
      { value: 'III', label: 'Class III' },
      { value: 'IV', label: 'Class IV' },
      { value: 'V', label: 'Class V' },
      { value: 'VI', label: 'Class VI' },
    ],
    applicableTo: ['AA'],
  },
];

// ============================================================================
// Pump Properties (AP - Pumping units)
// ============================================================================

export const PUMP_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'pumpType',
    category: 'physical',
    type: 'select',
    label: 'Pump Type',
    description: 'Type of pump',
    options: [
      { value: 'centrifugal', label: 'Centrifugal' },
      { value: 'positive-displacement', label: 'Positive Displacement' },
      { value: 'reciprocating', label: 'Reciprocating' },
      { value: 'gear', label: 'Gear Pump' },
      { value: 'screw', label: 'Screw Pump' },
      { value: 'diaphragm', label: 'Diaphragm Pump' },
      { value: 'peristaltic', label: 'Peristaltic' },
    ],
    applicableTo: ['AP'],
  },
  {
    id: 'flowRate',
    category: 'performance',
    type: 'unit-value',
    label: 'Flow Rate',
    description: 'Rated flow rate',
    units: ['m³/h', 'L/min', 'gpm', 'L/s'],
    defaultUnit: 'm³/h',
    applicableTo: ['AP'],
  },
  {
    id: 'head',
    category: 'performance',
    type: 'unit-value',
    label: 'Total Head',
    description: 'Total dynamic head',
    units: ['m', 'ft', 'bar', 'psi'],
    defaultUnit: 'm',
    applicableTo: ['AP'],
  },
  {
    id: 'motorPower',
    category: 'electrical',
    type: 'unit-value',
    label: 'Motor Power',
    description: 'Motor rated power',
    units: ['kW', 'HP', 'W'],
    defaultUnit: 'kW',
    applicableTo: ['AP'],
  },
  {
    id: 'efficiency',
    category: 'performance',
    type: 'number',
    label: 'Efficiency',
    description: 'Pump efficiency (%)',
    min: 0,
    max: 100,
    step: 0.1,
    applicableTo: ['AP'],
  },
  {
    id: 'npshr',
    category: 'performance',
    type: 'unit-value',
    label: 'NPSHr',
    description: 'Net Positive Suction Head Required',
    units: ['m', 'ft'],
    defaultUnit: 'm',
    applicableTo: ['AP'],
  },
  {
    id: 'speed',
    category: 'operational',
    type: 'unit-value',
    label: 'Rated Speed',
    description: 'Pump rotational speed',
    units: ['rpm', 'rad/s'],
    defaultUnit: 'rpm',
    applicableTo: ['AP'],
  },
  {
    id: 'impellerDiameter',
    category: 'physical',
    type: 'unit-value',
    label: 'Impeller Diameter',
    description: 'Impeller diameter',
    units: ['mm', 'in'],
    defaultUnit: 'mm',
    applicableTo: ['AP'],
  },
  {
    id: 'suctionSize',
    category: 'physical',
    type: 'unit-value',
    label: 'Suction Size',
    description: 'Suction connection size',
    units: ['in', 'mm', 'DN'],
    defaultUnit: 'in',
    applicableTo: ['AP'],
  },
  {
    id: 'dischargeSize',
    category: 'physical',
    type: 'unit-value',
    label: 'Discharge Size',
    description: 'Discharge connection size',
    units: ['in', 'mm', 'DN'],
    defaultUnit: 'in',
    applicableTo: ['AP'],
  },
  {
    id: 'sealType',
    category: 'mechanical',
    type: 'select',
    label: 'Seal Type',
    description: 'Mechanical seal type',
    options: [
      { value: 'mechanical-single', label: 'Single Mechanical Seal' },
      { value: 'mechanical-double', label: 'Double Mechanical Seal' },
      { value: 'packing', label: 'Packing' },
      { value: 'magnetic', label: 'Magnetic Drive' },
    ],
    applicableTo: ['AP'],
  },
];

// ============================================================================
// Heat Exchanger Properties (AC - Heat exchangers, heating surfaces)
// ============================================================================

export const HEAT_EXCHANGER_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'exchangerType',
    category: 'physical',
    type: 'select',
    label: 'Exchanger Type',
    description: 'Type of heat exchanger',
    options: [
      { value: 'shell-tube', label: 'Shell & Tube' },
      { value: 'plate', label: 'Plate Heat Exchanger' },
      { value: 'air-cooled', label: 'Air Cooled' },
      { value: 'double-pipe', label: 'Double Pipe' },
      { value: 'spiral', label: 'Spiral' },
    ],
    applicableTo: ['AC'],
  },
  {
    id: 'heatDuty',
    category: 'performance',
    type: 'unit-value',
    label: 'Heat Duty',
    description: 'Design heat transfer rate',
    units: ['kW', 'MW', 'BTU/h', 'kcal/h'],
    defaultUnit: 'kW',
    applicableTo: ['AC'],
  },
  {
    id: 'surfaceArea',
    category: 'physical',
    type: 'unit-value',
    label: 'Surface Area',
    description: 'Heat transfer surface area',
    units: ['m²', 'ft²'],
    defaultUnit: 'm²',
    applicableTo: ['AC'],
  },
  {
    id: 'lmtd',
    category: 'design',
    type: 'unit-value',
    label: 'LMTD',
    description: 'Log Mean Temperature Difference',
    units: ['°C', '°F', 'K'],
    defaultUnit: '°C',
    applicableTo: ['AC'],
  },
  {
    id: 'overallHTC',
    category: 'performance',
    type: 'unit-value',
    label: 'Overall HTC',
    description: 'Overall heat transfer coefficient',
    units: ['W/m²K', 'BTU/h·ft²·°F'],
    defaultUnit: 'W/m²K',
    applicableTo: ['AC'],
  },
  {
    id: 'shellSideFluid',
    category: 'process',
    type: 'string',
    label: 'Shell Side Fluid',
    description: 'Fluid on shell side',
    applicableTo: ['AC'],
  },
  {
    id: 'tubeSideFluid',
    category: 'process',
    type: 'string',
    label: 'Tube Side Fluid',
    description: 'Fluid on tube side',
    applicableTo: ['AC'],
  },
  {
    id: 'shellSidePressureDrop',
    category: 'operational',
    type: 'unit-value',
    label: 'Shell Side ΔP',
    description: 'Shell side pressure drop',
    units: ['bar', 'psi', 'kPa'],
    defaultUnit: 'bar',
    applicableTo: ['AC'],
  },
  {
    id: 'tubeSidePressureDrop',
    category: 'operational',
    type: 'unit-value',
    label: 'Tube Side ΔP',
    description: 'Tube side pressure drop',
    units: ['bar', 'psi', 'kPa'],
    defaultUnit: 'bar',
    applicableTo: ['AC'],
  },
];

// ============================================================================
// Vessel/Tank Properties (BB - Storage devices)
// ============================================================================

export const VESSEL_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'vesselType',
    category: 'physical',
    type: 'select',
    label: 'Vessel Type',
    description: 'Type of vessel',
    options: [
      { value: 'vertical', label: 'Vertical Vessel' },
      { value: 'horizontal', label: 'Horizontal Vessel' },
      { value: 'spherical', label: 'Spherical Tank' },
      { value: 'atmospheric', label: 'Atmospheric Tank' },
    ],
    applicableTo: ['BB'],
  },
  {
    id: 'volume',
    category: 'physical',
    type: 'unit-value',
    label: 'Volume',
    description: 'Total vessel volume',
    units: ['m³', 'L', 'gal', 'bbl'],
    defaultUnit: 'm³',
    applicableTo: ['BB'],
  },
  {
    id: 'diameter',
    category: 'physical',
    type: 'unit-value',
    label: 'Diameter',
    description: 'Vessel inside diameter',
    units: ['m', 'mm', 'ft', 'in'],
    defaultUnit: 'm',
    applicableTo: ['BB'],
  },
  {
    id: 'height',
    category: 'physical',
    type: 'unit-value',
    label: 'Height/Length',
    description: 'Vessel height or length',
    units: ['m', 'mm', 'ft', 'in'],
    defaultUnit: 'm',
    applicableTo: ['BB'],
  },
  {
    id: 'workingVolume',
    category: 'operational',
    type: 'unit-value',
    label: 'Working Volume',
    description: 'Normal working volume',
    units: ['m³', 'L', 'gal', 'bbl'],
    defaultUnit: 'm³',
    applicableTo: ['BB'],
  },
  {
    id: 'wallThickness',
    category: 'physical',
    type: 'unit-value',
    label: 'Wall Thickness',
    description: 'Shell wall thickness',
    units: ['mm', 'in'],
    defaultUnit: 'mm',
    applicableTo: ['BB'],
  },
  {
    id: 'corrosionAllowance',
    category: 'design',
    type: 'unit-value',
    label: 'Corrosion Allowance',
    description: 'Corrosion allowance',
    units: ['mm', 'in'],
    defaultUnit: 'mm',
    applicableTo: ['BB'],
  },
];

// ============================================================================
// Sensor Properties (C - Sensors)
// ============================================================================

export const SENSOR_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'sensorType',
    category: 'physical',
    type: 'select',
    label: 'Sensor Type',
    description: 'Type of sensor',
    options: [
      { value: 'temperature', label: 'Temperature' },
      { value: 'pressure', label: 'Pressure' },
      { value: 'flow', label: 'Flow' },
      { value: 'level', label: 'Level' },
      { value: 'analytical', label: 'Analytical' },
    ],
    applicableTo: ['CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT'],
  },
  {
    id: 'measurementRange',
    category: 'performance',
    type: 'string',
    label: 'Measurement Range',
    description: 'Sensor measurement range',
    placeholder: 'e.g., 0-100 bar',
    applicableTo: ['CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT'],
  },
  {
    id: 'accuracy',
    category: 'performance',
    type: 'string',
    label: 'Accuracy',
    description: 'Measurement accuracy',
    placeholder: 'e.g., ±0.5% FS',
    applicableTo: ['CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT'],
  },
  {
    id: 'outputSignal',
    category: 'electrical',
    type: 'select',
    label: 'Output Signal',
    description: 'Sensor output signal type',
    options: [
      { value: '4-20mA', label: '4-20 mA' },
      { value: '0-10V', label: '0-10 V' },
      { value: 'hart', label: 'HART' },
      { value: 'profibus', label: 'Profibus' },
      { value: 'modbus', label: 'Modbus' },
      { value: 'foundation-fieldbus', label: 'Foundation Fieldbus' },
    ],
    applicableTo: ['CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT'],
  },
  {
    id: 'processConnection',
    category: 'physical',
    type: 'string',
    label: 'Process Connection',
    description: 'Process connection type',
    placeholder: 'e.g., 1/2" NPT',
    applicableTo: ['CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT'],
  },
];

// ============================================================================
// Electrical Properties (for electrical components)
// ============================================================================

export const ELECTRICAL_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'voltage',
    category: 'electrical',
    type: 'unit-value',
    label: 'Voltage',
    description: 'Operating voltage',
    units: ['V', 'kV'],
    defaultUnit: 'V',
    applicableTo: ['all'],
  },
  {
    id: 'current',
    category: 'electrical',
    type: 'unit-value',
    label: 'Current',
    description: 'Operating current',
    units: ['A', 'mA'],
    defaultUnit: 'A',
    applicableTo: ['all'],
  },
  {
    id: 'power',
    category: 'electrical',
    type: 'unit-value',
    label: 'Power',
    description: 'Electrical power',
    units: ['W', 'kW', 'MW', 'HP'],
    defaultUnit: 'kW',
    applicableTo: ['all'],
  },
  {
    id: 'frequency',
    category: 'electrical',
    type: 'unit-value',
    label: 'Frequency',
    description: 'Electrical frequency',
    units: ['Hz'],
    defaultUnit: 'Hz',
    applicableTo: ['all'],
  },
  {
    id: 'phases',
    category: 'electrical',
    type: 'select',
    label: 'Phases',
    description: 'Number of phases',
    options: [
      { value: '1', label: 'Single Phase' },
      { value: '3', label: 'Three Phase' },
    ],
    applicableTo: ['all'],
  },
  {
    id: 'ipRating',
    category: 'design',
    type: 'string',
    label: 'IP Rating',
    description: 'Ingress Protection rating',
    placeholder: 'e.g., IP65',
    applicableTo: ['all'],
  },
];

// ============================================================================
// Compressor/Fan Properties (AN - Compressors, fans)
// ============================================================================

export const COMPRESSOR_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'compressorType',
    category: 'physical',
    type: 'select',
    label: 'Type',
    description: 'Compressor/fan type',
    options: [
      { value: 'centrifugal', label: 'Centrifugal' },
      { value: 'reciprocating', label: 'Reciprocating' },
      { value: 'screw', label: 'Screw' },
      { value: 'axial', label: 'Axial' },
    ],
    applicableTo: ['AN'],
  },
  {
    id: 'airFlow',
    category: 'performance',
    type: 'unit-value',
    label: 'Air Flow',
    description: 'Volumetric flow rate',
    units: ['m³/h', 'cfm', 'L/s'],
    defaultUnit: 'm³/h',
    applicableTo: ['AN'],
  },
  {
    id: 'dischargePressure',
    category: 'operational',
    type: 'unit-value',
    label: 'Discharge Pressure',
    description: 'Discharge pressure',
    units: ['bar', 'psi', 'kPa'],
    defaultUnit: 'bar',
    applicableTo: ['AN'],
  },
  {
    id: 'compressionRatio',
    category: 'performance',
    type: 'number',
    label: 'Compression Ratio',
    description: 'Pressure ratio',
    min: 1,
    applicableTo: ['AN'],
  },
];

// ============================================================================
// Piping Properties (BR - Pipelines)
// ============================================================================

export const PIPING_PROPERTIES: PropertyTemplate[] = [
  {
    id: 'pipeSize',
    category: 'physical',
    type: 'unit-value',
    label: 'Pipe Size',
    description: 'Nominal pipe size',
    units: ['in', 'mm', 'DN'],
    defaultUnit: 'in',
    applicableTo: ['BR'],
  },
  {
    id: 'schedule',
    category: 'physical',
    type: 'select',
    label: 'Schedule',
    description: 'Pipe schedule',
    options: [
      { value: '5', label: 'Sch 5' },
      { value: '10', label: 'Sch 10' },
      { value: '20', label: 'Sch 20' },
      { value: '40', label: 'Sch 40' },
      { value: '80', label: 'Sch 80' },
      { value: '160', label: 'Sch 160' },
    ],
    applicableTo: ['BR'],
  },
  {
    id: 'insulation',
    category: 'physical',
    type: 'select',
    label: 'Insulation',
    description: 'Insulation type',
    options: [
      { value: 'none', label: 'No Insulation' },
      { value: 'cold', label: 'Cold Insulation' },
      { value: 'hot', label: 'Hot Insulation' },
      { value: 'personnel', label: 'Personnel Protection' },
    ],
    applicableTo: ['BR'],
  },
  {
    id: 'tracing',
    category: 'physical',
    type: 'select',
    label: 'Heat Tracing',
    description: 'Heat tracing type',
    options: [
      { value: 'none', label: 'No Tracing' },
      { value: 'steam', label: 'Steam Tracing' },
      { value: 'electric', label: 'Electric Tracing' },
    ],
    applicableTo: ['BR'],
  },
];

// ============================================================================
// Property Library - Combined
// ============================================================================

export const PROPERTY_LIBRARY: PropertyTemplate[] = [
  ...COMMON_PROPERTIES,
  ...VALVE_PROPERTIES,
  ...PUMP_PROPERTIES,
  ...HEAT_EXCHANGER_PROPERTIES,
  ...VESSEL_PROPERTIES,
  ...SENSOR_PROPERTIES,
  ...ELECTRICAL_PROPERTIES,
  ...COMPRESSOR_PROPERTIES,
  ...PIPING_PROPERTIES,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get properties applicable to a specific KKS equipment code
 */
export function getPropertiesForEquipment(kksCode: string): PropertyTemplate[] {
  return PROPERTY_LIBRARY.filter(
    (prop) =>
      prop.isCommon ||
      prop.applicableTo?.includes(kksCode) ||
      prop.applicableTo?.includes('all')
  );
}

/**
 * Get properties by category
 */
export function getPropertiesByCategory(category: PropertyCategory): PropertyTemplate[] {
  return PROPERTY_LIBRARY.filter((prop) => prop.category === category);
}

/**
 * Get property by ID
 */
export function getPropertyById(id: string): PropertyTemplate | undefined {
  return PROPERTY_LIBRARY.find((prop) => prop.id === id);
}

/**
 * Get all common properties
 */
export function getCommonProperties(): PropertyTemplate[] {
  return PROPERTY_LIBRARY.filter((prop) => prop.isCommon);
}
