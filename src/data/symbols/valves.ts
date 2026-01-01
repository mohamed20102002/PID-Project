/**
 * Valve Symbol Definitions
 *
 * Standard P&ID valve symbols following ISA 5.1 standards
 */

import { SymbolDefinition } from '../../types/symbol.types';

/**
 * Shut off Valve - Standard isolation valve
 * ISA Symbol: Two triangles meeting at apex
 */
export const shutOffValve: SymbolDefinition = {
  id: 'valve:shut-off',
  category: 'valves',
  name: 'shutOffValve',
  displayName: 'Shut-off Valve',
  description: 'Electrically actuated shut-off valve',
  standard: 'ISA',
  kksEquipmentCode: 'AA',

  // Stretched proportions
  defaultSize: { width: 70, height: 40 },
  minSize: { width: 42, height: 24 },
  maxSize: { width: 120, height: 80 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  // =========================
  // Geometry
  // =========================
  paths: [
    // LEFT terminal pin
    {
      type: 'line',
      data: { x1: 0.0, y1: 0.5, x2: 0.25, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // RIGHT terminal pin
    {
      type: 'line',
      data: { x1: 0.75, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // LEFT triangle (outline)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.25, y: 0.18 },
          { x: 0.5, y: 0.5 },
          { x: 0.25, y: 0.82 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // RIGHT triangle (outline)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.75, y: 0.18 },
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.82 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // Stem connecting actuator to valve
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.28, x2: 0.5, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // Actuator circle (higher + bigger)
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.12, r: 0.18 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // AC power symbol inside actuator
    {
      type: 'line',
      data: { x1: 0.42, y1: 0.12, x2: 0.46, y2: 0.08 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.46, y1: 0.08, x2: 0.54, y2: 0.16 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.54, y1: 0.16, x2: 0.58, y2: 0.12 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  // =========================
  // Ports
  // =========================
  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 1.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // Labels
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.25 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 10,
        fontWeight: 'normal',
      },
    },
  ],

  // =========================
  // Properties
  // =========================
  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      size: {
        type: 'string',
        label: 'Nominal Size',
        defaultValue: '2"',
      },
      actuatorType: {
        type: 'select',
        label: 'Actuator Type',
        options: [
          { value: 'electric-ac', label: 'Electric (AC)' },
          { value: 'electric-dc', label: 'Electric (DC)' },
          { value: 'pneumatic', label: 'Pneumatic' },
          { value: 'hydraulic', label: 'Hydraulic' },
        ],
        defaultValue: 'electric-ac',
      },
    },
  },
};

/**
 * Manual Valve - Quarter-turn valve with ball closure
 * ISA Symbol: Two triangles with filled circle at center
 */
export const manualValve: SymbolDefinition = {
  id: 'valve:manual',
  category: 'valves',
  name: 'manualValve',
  displayName: 'Manual Valve',
  description: 'Generic manual operated valve',
  standard: 'ISA',
  kksEquipmentCode: 'AA',

  // Stretched like the reference valve
  defaultSize: { width: 70, height: 40 },
  minSize: { width: 42, height: 24 },
  maxSize: { width: 120, height: 80 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  // =========================
  // Geometry
  // =========================
  paths: [
    // LEFT terminal pin
    {
      type: 'line',
      data: { x1: 0.0, y1: 0.5, x2: 0.25, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // RIGHT terminal pin
    {
      type: 'line',
      data: { x1: 0.75, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // LEFT triangle — outline, pointing RIGHT
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.25, y: 0.18 },
          { x: 0.5, y: 0.5 },
          { x: 0.25, y: 0.82 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // RIGHT triangle — outline, pointing LEFT
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.75, y: 0.18 },
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.82 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },
  ],

  // =========================
  // Ports (terminal ends)
  // =========================
  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 1.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // Label
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.25 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 10,
        fontWeight: 'normal',
      },
    },
  ],

  // =========================
  // Properties
  // =========================
  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      size: {
        type: 'string',
        label: 'Nominal Size',
        defaultValue: '2"',
      },
      operation: {
        type: 'select',
        label: 'Operation Type',
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'lever', label: 'Lever Operated' },
          { value: 'handwheel', label: 'Handwheel' },
        ],
        defaultValue: 'manual',
      },
    },
  },
};




/**
 * Check Valve - One-way flow valve
 * ISA Symbol: Triangle with vertical line
 */
export const checkValve: SymbolDefinition = {
  id: 'valve:check',
  category: 'valves',
  name: 'checkValve',
  displayName: 'Check Valve',
  description: 'Non-return check valve',
  standard: 'ISA',
  kksEquipmentCode: 'AG',

  // 🔥 Wider valve
  defaultSize: { width: 70, height: 40 },
  minSize: { width: 42, height: 24 },
  maxSize: { width: 120, height: 80 },
  resizable: true,
  aspectRatioLocked: false, // allow horizontal stretching

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  // =========================
  // Geometry
  // =========================
  paths: [
    // LEFT terminal pin (longer)
    {
      type: 'line',
      data: { x1: 0.0, y1: 0.5, x2: 0.25, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // RIGHT terminal pin (longer)
    {
      type: 'line',
      data: { x1: 0.75, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // LEFT triangle — unfilled, pointing RIGHT
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.25, y: 0.18 },
          { x: 0.5, y: 0.5 },
          { x: 0.25, y: 0.82 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // RIGHT triangle — filled, pointing LEFT
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.75, y: 0.18 },
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.82 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: '#000000',
      },
    },
  ],

  // =========================
  // Ports (stay at extremes)
  // =========================
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      relativePosition: { x: 0.0, y: 0.5 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'outlet',
      name: 'Outlet',
      relativePosition: { x: 1.0, y: 0.5 },
      direction: 'out',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // Label
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.25 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 10,
        fontWeight: 'normal',
      },
    },
  ],

  // =========================
  // Properties
  // =========================
  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      size: {
        type: 'string',
        label: 'Nominal Size',
        defaultValue: '2"',
      },
      type: {
        type: 'select',
        label: 'Check Valve Type',
        options: [
          { value: 'swing', label: 'Swing Check' },
          { value: 'lift', label: 'Lift Check' },
          { value: 'tilting', label: 'Tilting Disc' },
          { value: 'dual-plate', label: 'Dual Plate' },
        ],
        defaultValue: 'swing',
      },
    },
  },
};





/**
 * Control Valve 1 with stem- Modulating control valve
 * ISA Symbol: Two triangles with diaphragm actuator
 */
export const controlValve: SymbolDefinition = {
  id: 'valve:control',
  category: 'valves',
  name: 'controlValve',
  displayName: 'Control Valve',
  description: 'Control valve with electric actuator (AC)',
  standard: 'ISA',
  kksEquipmentCode: 'AC',

  // SAME SIZE AS MANUAL VALVE
  defaultSize: { width: 70, height: 40 },
  minSize: { width: 42, height: 24 },
  maxSize: { width: 120, height: 80 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // TERMINAL PINS (IDENTICAL)
    {
      type: 'line',
      data: { x1: 0.0, y1: 0.5, x2: 0.25, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.75, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // POLYGON 1 (outline)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.5, y: 0.5 },     // center
          { x: 0.25, y: 0.82 },   // top
          { x: 0.25, y: 0.18 },   // bottom
          { x: 0.5, y: 0.5 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'transparent' },
    },

    // POLYGON 2 (outline)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.82 },
          { x: 0.75, y: 0.5 },
          { x: 0.5, y: 0.5 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'transparent' },
    },

    // POLYGON 3 (FILLED)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.5 },
          { x: 0.75, y: 0.18 },
          { x: 0.5, y: 0.5 },
        ],
      },
      style: { stroke: 'none', fill: '#000000' },
    },

    // STEM (ALREADY CORRECT)
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.28, x2: 0.5, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // ACTUATOR CIRCLE (ALREADY CORRECT)
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.12, r: 0.18 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'transparent' },
    },

    // AC SYMBOL
    {
      type: 'line',
      data: { x1: 0.42, y1: 0.12, x2: 0.46, y2: 0.08 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.46, y1: 0.08, x2: 0.54, y2: 0.16 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.54, y1: 0.16, x2: 0.58, y2: 0.12 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 1.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.25 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 10, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: ['kks'],
    properties: {
      description: { type: 'string', label: 'Description' },
      size: { type: 'string', label: 'Nominal Size', defaultValue: '2"' },
      actuatorType: {
        type: 'select',
        label: 'Actuator Type',
        options: [
          { value: 'electric-ac', label: 'Electric (AC)' },
          { value: 'electric-dc', label: 'Electric (DC)' },
          { value: 'pneumatic', label: 'Pneumatic' },
          { value: 'hydraulic', label: 'Hydraulic' },
        ],
        defaultValue: 'electric-ac',
      },
    },
  },
};



/**
 * control Valve 2 with no stem- Throttling valve
 * ISA Symbol: Two triangles meeting with horizontal line through center
 */
export const controlValveInline: SymbolDefinition = {
  id: 'valve:control-inline',
  category: 'valves',
  name: 'controlValveInline',
  displayName: 'Control Valve (Inline)',
  description: 'Control valve without actuator or stem',
  standard: 'ISA',
  kksEquipmentCode: 'AC',

  // SAME SIZE AS OTHER VALVES
  defaultSize: { width: 70, height: 40 },
  minSize: { width: 42, height: 24 },
  maxSize: { width: 120, height: 80 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // =========================
    // TERMINAL PINS (IDENTICAL)
    // =========================
    {
      type: 'line',
      data: { x1: 0.0, y1: 0.5, x2: 0.25, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.75, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // =========================
    // POLYGON 1 (outline)
    // =========================
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.25, y: 0.82 },
          { x: 0.25, y: 0.18 },
          { x: 0.5, y: 0.5 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // =========================
    // POLYGON 2 (outline)
    // =========================
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.82 },
          { x: 0.75, y: 0.5 },
          { x: 0.5, y: 0.5 },
        ],
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },

    // =========================
    // POLYGON 3 (FILLED)
    // =========================
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.5, y: 0.5 },
          { x: 0.75, y: 0.5 },
          { x: 0.75, y: 0.18 },
          { x: 0.5, y: 0.5 },
        ],
      },
      style: {
        stroke: 'none',
        fill: '#000000',
      },
    },
  ],

  // =========================
  // PORTS (IDENTICAL)
  // =========================
  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 1.0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // LABEL
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.25 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 10,
        fontWeight: 'normal',
      },
    },
  ],

  // =========================
  // PROPERTIES
  // =========================
  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      size: {
        type: 'string',
        label: 'Nominal Size',
        defaultValue: '2"',
      },
    },
  },
};


/**
 * Butterfly Valve
 * ISA Symbol: Two triangles with double line at center
 */
export const butterflyValve: SymbolDefinition = {
  id: 'valve:butterfly',
  category: 'valves',
  name: 'butterflyValve',
  displayName: 'Butterfly Valve',
  description: 'Quarter-turn butterfly valve',
  standard: 'ISA',
  kksEquipmentCode: 'AE',

  defaultSize: { width: 40, height: 40 },
  minSize: { width: 24, height: 24 },
  maxSize: { width: 80, height: 80 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Left triangle
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0, y: 0.15 },
          { x: 0.5, y: 0.5 },
          { x: 0, y: 0.85 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Right triangle
    {
      type: 'polygon',
      data: {
        points: [
          { x: 1, y: 0.15 },
          { x: 0.5, y: 0.5 },
          { x: 1, y: 0.85 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Double vertical lines (butterfly indicator)
    {
      type: 'line',
      data: { x1: 0.45, y1: 0.2, x2: 0.45, y2: 0.8 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.55, y1: 0.2, x2: 0.55, y2: 0.8 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.3 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 10, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      size: {
        type: 'string',
        label: 'Nominal Size',
        defaultValue: '4"',
      },
    },
  },
};

/**
 * Safety/Relief Valve
 * ISA Symbol: Angled symbol with spring
 */
export const safetyValve: SymbolDefinition = {
  id: 'valve:safety',
  category: 'valves',
  name: 'safetyValve',
  displayName: 'Safety/Relief Valve',
  description: 'Pressure relief or safety valve',
  standard: 'ISA',
  kksEquipmentCode: 'AK',

  defaultSize: { width: 40, height: 50 },
  minSize: { width: 30, height: 38 },
  maxSize: { width: 80, height: 100 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Valve body (angled)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.25, y: 0.7 },
          { x: 0.5, y: 0.5 },
          { x: 0.25, y: 0.95 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Outlet
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.5, x2: 0.85, y2: 0.2 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // Arrow at outlet
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.85, y: 0.2 },
          { x: 0.75, y: 0.25 },
          { x: 0.78, y: 0.32 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 1, fill: 'inherit' },
    },
    // Spring (zigzag)
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.35 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.35, x2: 0.6, y2: 0.28 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.6, y1: 0.28, x2: 0.4, y2: 0.21 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.4, y1: 0.21, x2: 0.6, y2: 0.14 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.6, y1: 0.14, x2: 0.4, y2: 0.07 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.4, y1: 0.07, x2: 0.5, y2: 0 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      relativePosition: { x: 0.25, y: 0.825 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.15 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 10, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      size: {
        type: 'string',
        label: 'Inlet x Outlet Size',
        defaultValue: '2" x 3"',
      },
      setPressure: {
        type: 'unit-value',
        label: 'Set Pressure',
        units: ['psi', 'bar', 'kPa'],
        defaultUnit: 'psi',
      },
    },
  },
};

// Export all valve definitions
export const valveSymbols = {
  shutOffValve,
  manualValve,
  checkValve,
  controlValve,
  controlValveInline,
  butterflyValve,
  safetyValve,
};

export default valveSymbols;
