/**
 * Instrument Symbol Definitions
 *
 * Standard P&ID instrument symbols following ISA 5.1 standards
 * Instruments use circles with letter codes inside
 */

import { SymbolDefinition } from '../../types/symbol.types';

/**
 * Create a generic instrument symbol
 * ISA uses circles for field-mounted, squares for panel-mounted
 */
const createInstrumentSymbol = (
  id: string,
  name: string,
  displayName: string,
  description: string,
  letterCode: string,
  kksCode: string
): SymbolDefinition => ({
  id,
  category: 'instruments',
  name,
  displayName,
  description,
  standard: 'ISA',
  kksEquipmentCode: kksCode,

  defaultSize: { width: 36, height: 36 },
  minSize: { width: 24, height: 24 },
  maxSize: { width: 60, height: 60 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  paths: [
    // Circle (field-mounted instrument)
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.45 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
  ],

  ports: [
    {
      id: 'process',
      name: 'Process Connection',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe', 'signal'],
    },
  ],

  labels: [
    {
      id: 'letter-code',
      relativePosition: { x: 0.5, y: 0.55 },
      anchor: 'middle',
      binding: 'letterCode',
      style: { fontSize: 12, fontWeight: 'bold' },
    },
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.35 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 9, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: ['kks'],
    properties: {
      letterCode: {
        type: 'string',
        label: 'Letter Code',
        defaultValue: letterCode,
      },
      description: {
        type: 'string',
        label: 'Description',
      },
      range: {
        type: 'string',
        label: 'Range',
        placeholder: 'e.g., 0-100 psi',
      },
      manufacturer: {
        type: 'string',
        label: 'Manufacturer',
      },
      model: {
        type: 'string',
        label: 'Model',
      },
    },
  },
});

/**
 * Pressure Indicator
 */
export const pressureIndicator: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:PI',
    'pressureIndicator',
    'Pressure Indicator',
    'Local pressure indicator/gauge',
    'PI',
    'CP'
  ),
};

/**
 * Pressure Transmitter
 */
export const pressureTransmitter: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:PT',
    'pressureTransmitter',
    'Pressure Transmitter',
    'Pressure transmitter with signal output',
    'PT',
    'CP'
  ),
  ports: [
    {
      id: 'process',
      name: 'Process Connection',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
    {
      id: 'signal',
      name: 'Signal Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Temperature Indicator
 */
export const temperatureIndicator: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:TI',
    'temperatureIndicator',
    'Temperature Indicator',
    'Local temperature indicator',
    'TI',
    'CT'
  ),
};

/**
 * Temperature Transmitter
 */
export const temperatureTransmitter: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:TT',
    'temperatureTransmitter',
    'Temperature Transmitter',
    'Temperature transmitter with signal output',
    'TT',
    'CT'
  ),
  ports: [
    {
      id: 'process',
      name: 'Process Connection',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
    {
      id: 'signal',
      name: 'Signal Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Flow Indicator
 */
export const flowIndicator: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:FI',
    'flowIndicator',
    'Flow Indicator',
    'Local flow indicator',
    'FI',
    'CF'
  ),
};

/**
 * Flow Transmitter
 */
export const flowTransmitter: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:FT',
    'flowTransmitter',
    'Flow Transmitter',
    'Flow transmitter with signal output',
    'FT',
    'CF'
  ),
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'outlet',
      name: 'Outlet',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
    {
      id: 'signal',
      name: 'Signal Output',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'out',
      defaultAngle: 270,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Level Indicator
 */
export const levelIndicator: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:LI',
    'levelIndicator',
    'Level Indicator',
    'Local level indicator',
    'LI',
    'CL'
  ),
};

/**
 * Level Transmitter
 */
export const levelTransmitter: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:LT',
    'levelTransmitter',
    'Level Transmitter',
    'Level transmitter with signal output',
    'LT',
    'CL'
  ),
  ports: [
    {
      id: 'process',
      name: 'Process Connection',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
    {
      id: 'signal',
      name: 'Signal Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Pressure Controller
 */
export const pressureController: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:PIC',
    'pressureController',
    'Pressure Controller',
    'Pressure indicating controller',
    'PIC',
    'CP'
  ),
  paths: [
    // Double circle for controller
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.45 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.38 },
      style: { stroke: 'inherit', strokeWidth: 1, fill: 'none' },
    },
  ],
  ports: [
    {
      id: 'process',
      name: 'Process Input',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'output',
      name: 'Control Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Temperature Controller
 */
export const temperatureController: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:TIC',
    'temperatureController',
    'Temperature Controller',
    'Temperature indicating controller',
    'TIC',
    'CT'
  ),
  paths: [
    // Double circle for controller
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.45 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.38 },
      style: { stroke: 'inherit', strokeWidth: 1, fill: 'none' },
    },
  ],
  ports: [
    {
      id: 'process',
      name: 'Process Input',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'output',
      name: 'Control Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Flow Controller
 */
export const flowController: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:FIC',
    'flowController',
    'Flow Controller',
    'Flow indicating controller',
    'FIC',
    'CF'
  ),
  paths: [
    // Double circle for controller
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.45 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.38 },
      style: { stroke: 'inherit', strokeWidth: 1, fill: 'none' },
    },
  ],
  ports: [
    {
      id: 'process',
      name: 'Process Input',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'output',
      name: 'Control Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Level Controller
 */
export const levelController: SymbolDefinition = {
  ...createInstrumentSymbol(
    'instrument:LIC',
    'levelController',
    'Level Controller',
    'Level indicating controller',
    'LIC',
    'CL'
  ),
  paths: [
    // Double circle for controller
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.45 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.38 },
      style: { stroke: 'inherit', strokeWidth: 1, fill: 'none' },
    },
  ],
  ports: [
    {
      id: 'process',
      name: 'Process Input',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'in',
      defaultAngle: 90,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'output',
      name: 'Control Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],
};

/**
 * Radiation Monitor
 * Special symbol for nuclear applications
 */
export const radiationMonitor: SymbolDefinition = {
  id: 'instrument:RM',
  category: 'instruments',
  name: 'radiationMonitor',
  displayName: 'Radiation Monitor',
  description: 'Radiation detector/monitor',
  standard: 'ISA',
  kksEquipmentCode: 'CR',

  defaultSize: { width: 40, height: 40 },
  minSize: { width: 28, height: 28 },
  maxSize: { width: 60, height: 60 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  paths: [
    // Circle
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.45 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Radiation symbol (trefoil) - three blades
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.1 },
      style: { stroke: 'inherit', strokeWidth: 1.5, fill: 'inherit' },
    },
    // Top blade
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.45, y: 0.4 },
          { x: 0.5, y: 0.2 },
          { x: 0.55, y: 0.4 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 1.5, fill: 'none' },
    },
    // Bottom-left blade
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.4, y: 0.55 },
          { x: 0.28, y: 0.7 },
          { x: 0.45, y: 0.62 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 1.5, fill: 'none' },
    },
    // Bottom-right blade
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.6, y: 0.55 },
          { x: 0.72, y: 0.7 },
          { x: 0.55, y: 0.62 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 1.5, fill: 'none' },
    },
  ],

  ports: [
    {
      id: 'signal',
      name: 'Signal Output',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.35 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 9, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      radiationType: {
        type: 'select',
        label: 'Radiation Type',
        options: [
          { value: 'gamma', label: 'Gamma' },
          { value: 'neutron', label: 'Neutron' },
          { value: 'alpha', label: 'Alpha' },
          { value: 'beta', label: 'Beta' },
        ],
        defaultValue: 'gamma',
      },
      range: {
        type: 'string',
        label: 'Range',
      },
    },
  },
};

// Export all instrument definitions
export const instrumentSymbols = {
  pressureIndicator,
  pressureTransmitter,
  temperatureIndicator,
  temperatureTransmitter,
  flowIndicator,
  flowTransmitter,
  levelIndicator,
  levelTransmitter,
  pressureController,
  temperatureController,
  flowController,
  levelController,
  radiationMonitor,
};

export default instrumentSymbols;
