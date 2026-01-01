/**
 * Vessel and Tank Symbol Definitions
 *
 * Standard P&ID vessel symbols following ISA 5.1 standards
 */

import { SymbolDefinition } from '../../types/symbol.types';

/**
 * Vertical Tank
 * ISA Symbol: Vertical rectangle with rounded ends
 */
export const verticalTank: SymbolDefinition = {
  id: 'vessel:tank-vertical',
  category: 'vessels',
  name: 'verticalTank',
  displayName: 'Tank',
  description: 'storage tank',
  standard: 'ISA',
  kksEquipmentCode: 'BB',

  defaultSize: { width: 300, height: 180 },
  minSize: { width: 150, height: 90 },
  maxSize: { width: 600, height: 360 },

  resizable: true,
  aspectRatioLocked: false,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  paths: [
    // Main rectangular body
    {
      type: 'rect',
      data: { x: 0.2, y: 0.05, width: 0.6, height: 0.75 },
      style: { stroke: 'inherit', strokeWidth: 2.5, fill: 'inherit' },
    },

    // Bottom collector (triangle)
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.2, y: 0.8 },
          { x: 0.8, y: 0.8 },
          { x: 0.5, y: 1.0 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2.5, fill: 'inherit' },
    },
  ],


  ports: [
    {
      id: 'top',
      name: 'Top',
      relativePosition: { x: 0.5, y: 0.05 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe'],
    },
    {
      id: 'bottom',
      name: 'Bottom',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: .2, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 0.8, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.5 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 12, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      volume: {
        type: 'unit-value',
        label: 'Volume',
        units: ['gal', 'L', 'm³', 'bbl'],
        defaultUnit: 'gal',
      },
      material: {
        type: 'select',
        label: 'Material',
        options: [
          { value: 'CS', label: 'Carbon Steel' },
          { value: 'SS304', label: 'Stainless Steel 304' },
          { value: 'SS316', label: 'Stainless Steel 316' },
          { value: 'FRP', label: 'Fiberglass' },
        ],
        defaultValue: 'CS',
      },
      designPressure: {
        type: 'unit-value',
        label: 'Design Pressure',
        units: ['psi', 'bar', 'kPa'],
        defaultUnit: 'psi',
      },
    },
  },
};

/**
 * Horizontal Tank
 * ISA Symbol: Horizontal rectangle with rounded ends
 */
// old tank design by claude
// export const horizontalTank: SymbolDefinition = {
//   id: 'vessel:tank-horizontal',
//   category: 'vessels',
//   name: 'horizontalTank',
//   displayName: 'Horizontal Tank',
//   description: 'Horizontal storage tank',
//   standard: 'ISA',
//   kksEquipmentCode: 'BB',

//   defaultSize: { width: 70, height: 40 },
//   minSize: { width: 50, height: 28 },
//   maxSize: { width: 140, height: 80 },
//   resizable: true,
//   aspectRatioLocked: false,

//   rotatable: false,
//   rotationSteps: [0],
//   freeRotation: false,

//   paths: [
//     // Main shell
//     {
//       type: 'rect',
//       data: { x: 0.18, y: 0.25, width: 0.64, height: 0.5, cornerRadius: 0.08 },
//       style: { stroke: 'inherit', strokeWidth: 2.5, fill: 'inherit' },
//     },

//     // Left dished head
//     {
//       type: 'ellipse',
//       data: { cx: 0.18, cy: 0.5, rx: 0.1, ry: 0.25 },
//       style: { stroke: 'inherit', strokeWidth: 2.5, fill: 'inherit' },
//     },

//     // Right dished head
//     {
//       type: 'ellipse',
//       data: { cx: 0.82, cy: 0.5, rx: 0.1, ry: 0.25 },
//       style: { stroke: 'inherit', strokeWidth: 2.5, fill: 'inherit' },
//     },

//     // Stiffening rings
//     {
//       type: 'line',
//       data: { x1: 0.28, y1: 0.3, x2: 0.28, y2: 0.7 },
//       style: { stroke: 'inherit', strokeWidth: 1.5 },
//     },
//     {
//       type: 'line',
//       data: { x1: 0.72, y1: 0.3, x2: 0.72, y2: 0.7 },
//       style: { stroke: 'inherit', strokeWidth: 1.5 },
//     },

//     // Manway (top)
//     {
//       type: 'ellipse',
//       data: { cx: 0.5, cy: 0.25, rx: 0.06, ry: 0.04 },
//       style: { stroke: 'inherit', strokeWidth: 1.8, fill: 'none' },
//     },

//     // Saddle supports
//     {
//       type: 'rect',
//       data: { x: 0.25, y: 0.75, width: 0.08, height: 0.15 },
//       style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
//     },
//     {
//       type: 'rect',
//       data: { x: 0.67, y: 0.75, width: 0.08, height: 0.15 },
//       style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
//     },
//   ],

//   ports: [
//     {
//       id: 'top',
//       name: 'Top',
//       relativePosition: { x: 0.5, y: 0.15 },
//       direction: 'bidirectional',
//       defaultAngle: 270,
//       allowedConnections: ['pipe'],
//     },
//     {
//       id: 'left',
//       name: 'Left',
//       relativePosition: { x: 0.07, y: 0.5 },
//       direction: 'bidirectional',
//       defaultAngle: 180,
//       allowedConnections: ['pipe'],
//     },
//     {
//       id: 'right',
//       name: 'Right',
//       relativePosition: { x: 0.93, y: 0.5 },
//       direction: 'bidirectional',
//       defaultAngle: 0,
//       allowedConnections: ['pipe'],
//     },
//   ],

//   labels: [
//     {
//       id: 'main-label',
//       relativePosition: { x: 0.5, y: 1.2 },
//       anchor: 'middle',
//       binding: 'kks',
//       style: { fontSize: 10, fontWeight: 'normal' },
//     },
//   ],

//   propertySchema: {
//     required: ['kks'],
//     properties: {
//       description: {
//         type: 'string',
//         label: 'Description',
//       },
//       volume: {
//         type: 'unit-value',
//         label: 'Volume',
//         units: ['gal', 'L', 'm³', 'bbl'],
//         defaultUnit: 'gal',
//       },
//     },
//   },
// };


/**
 * Cube Heat Exchanger
 * ISA-style compact heat exchanger
 * Square body with internal broken heat-transfer line
 */

export const plateHeatExchanger: SymbolDefinition = {
  id: 'vessel:heat-exchanger-cube',
  category: 'vessels',
  name: 'plateHeatExchanger',
  displayName: 'Heat Exchanger',
  description: 'Compact / cube heat exchanger',
  standard: 'ISA',
  kksEquipmentCode: 'CA',

  // Size (canvas units)
  defaultSize: { width: 120, height: 120 },
  minSize: { width: 60, height: 60 },
  maxSize: { width: 300, height: 300 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  // Geometry (normalized 0–1)
  paths: [
    // =========================
    // Main cube body
    // =========================
    {
      type: 'rect',
      data: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2.5,
        fill: 'inherit',
      },
    },

    // =========================
    // Internal heat-transfer line
    // Using your exact coordinates (scaled)
    // (0,50) -> (50,88) -> (50,13) -> (100,50)
    // =========================

    // Internal heat-transfer line (EXACT fit to cube)
    // Segment 1: (0,50) → (50,88)
    {
      type: 'line',
      data: { x1: 0.10, y1: 0.50, x2: 0.50, y2: 0.804 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // Segment 2: (50,88) → (50,13)
    {
      type: 'line',
      data: { x1: 0.50, y1: 0.804, x2: 0.50, y2: 0.204 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // Segment 3: (50,13) → (100,50)
    {
      type: 'line',
      data: { x1: 0.50, y1: 0.204, x2: 0.90, y2: 0.50 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },


    // =========================
    // Nozzle stubs (pipe alignment)
    // =========================

    // Left stub
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.5, x2: 0.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Right stub
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Top stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.1, x2: 0.5, y2: 0.0 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Bottom stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.9, x2: 0.5, y2: 1.0 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },
  ],

  // =========================
  // Ports (true boundary)
  // =========================
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
    {
      id: 'top',
      name: 'Top',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe'],
    },
    {
      id: 'bottom',
      name: 'Bottom',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // Label
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.5 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 12,
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
      heatDuty: {
        type: 'unit-value',
        label: 'Heat Duty',
        units: ['kW', 'MW', 'BTU/hr'],
        defaultUnit: 'kW',
      },
      area: {
        type: 'unit-value',
        label: 'Heat Transfer Area',
        units: ['m²', 'ft²'],
        defaultUnit: 'm²',
      },
    },
  },
};



/**
 * Pressure Vessel
 * ISA Symbol: Vertical vessel with dished heads
 */
export const pressureVessel: SymbolDefinition = {
  id: 'vessel:pressure',
  category: 'vessels',
  name: 'pressureVessel',
  displayName: 'Pressure Vessel',
  description: 'Pressure vessel or reactor',
  standard: 'ISA',
  kksEquipmentCode: 'BC',

  defaultSize: { width: 50, height: 70 },
  minSize: { width: 35, height: 50 },
  maxSize: { width: 100, height: 140 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  paths: [
    // Vessel body
    {
      type: 'rect',
      data: { x: 0.15, y: 0.15, width: 0.7, height: 0.7 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Top dished head
    {
      type: 'ellipse',
      data: { cx: 0.5, cy: 0.15, rx: 0.35, ry: 0.1 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Bottom dished head
    {
      type: 'ellipse',
      data: { cx: 0.5, cy: 0.85, rx: 0.35, ry: 0.1 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Top nozzle
    {
      type: 'rect',
      data: { x: 0.4, y: 0, width: 0.2, height: 0.08 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Bottom nozzle
    {
      type: 'rect',
      data: { x: 0.4, y: 0.92, width: 0.2, height: 0.08 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
  ],

  ports: [
    {
      id: 'top',
      name: 'Top',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe'],
    },
    {
      id: 'bottom',
      name: 'Bottom',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.15, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 0.85, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.12 },
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
      volume: {
        type: 'unit-value',
        label: 'Volume',
        units: ['gal', 'L', 'm³'],
        defaultUnit: 'gal',
      },
      designPressure: {
        type: 'unit-value',
        label: 'Design Pressure',
        units: ['psi', 'bar', 'kPa'],
        defaultUnit: 'psi',
      },
      designTemperature: {
        type: 'unit-value',
        label: 'Design Temperature',
        units: ['°F', '°C', 'K'],
        defaultUnit: '°F',
      },
    },
  },
};

/**
 * Heat Exchanger (Shell & Tube)
 * ISA Symbol: Circle with internal lines
 */
// the default old design created by claude
// export const heatExchanger: SymbolDefinition = {
//   id: 'vessel:heat-exchanger',
//   category: 'vessels',
//   name: 'heatExchanger',
//   displayName: 'Heat Exchanger',
//   description: 'Shell and tube heat exchanger',
//   standard: 'ISA',
//   kksEquipmentCode: 'CA',

//   defaultSize: { width: 80, height: 40 },
//   minSize: { width: 56, height: 28 },
//   maxSize: { width: 160, height: 80 },
//   resizable: true,
//   aspectRatioLocked: true,

//   rotatable: true,
//   rotationSteps: [0, 90, 180, 270],
//   freeRotation: false,

//   paths: [
//     // Shell (main circle/ellipse)
//     {
//       type: 'ellipse',
//       data: { cx: 0.5, cy: 0.5, rx: 0.45, ry: 0.4 },
//       style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
//     },
//     // Shell inlet nozzle (left top)
//     {
//       type: 'line',
//       data: { x1: 0.1, y1: 0.25, x2: 0, y2: 0.25 },
//       style: { stroke: 'inherit', strokeWidth: 2 },
//     },
//     // Shell outlet nozzle (right bottom)
//     {
//       type: 'line',
//       data: { x1: 0.9, y1: 0.75, x2: 1, y2: 0.75 },
//       style: { stroke: 'inherit', strokeWidth: 2 },
//     },
//     // Tube side inlet (left)
//     {
//       type: 'line',
//       data: { x1: 0.05, y1: 0.5, x2: 0, y2: 0.5 },
//       style: { stroke: 'inherit', strokeWidth: 2 },
//     },
//     // Tube side outlet (right)
//     {
//       type: 'line',
//       data: { x1: 0.95, y1: 0.5, x2: 1, y2: 0.5 },
//       style: { stroke: 'inherit', strokeWidth: 2 },
//     },
//     // Internal tubes representation
//     {
//       type: 'line',
//       data: { x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5 },
//       style: { stroke: 'inherit', strokeWidth: 1.5 },
//     },
//     {
//       type: 'line',
//       data: { x1: 0.25, y1: 0.35, x2: 0.75, y2: 0.35 },
//       style: { stroke: 'inherit', strokeWidth: 1 },
//     },
//     {
//       type: 'line',
//       data: { x1: 0.25, y1: 0.65, x2: 0.75, y2: 0.65 },
//       style: { stroke: 'inherit', strokeWidth: 1 },
//     },
//   ],

//   ports: [
//     {
//       id: 'shell-in',
//       name: 'Shell Inlet',
//       relativePosition: { x: 0, y: 0.25 },
//       direction: 'in',
//       defaultAngle: 180,
//       allowedConnections: ['pipe'],
//     },
//     {
//       id: 'shell-out',
//       name: 'Shell Outlet',
//       relativePosition: { x: 1, y: 0.75 },
//       direction: 'out',
//       defaultAngle: 0,
//       allowedConnections: ['pipe'],
//     },
//     {
//       id: 'tube-in',
//       name: 'Tube Inlet',
//       relativePosition: { x: 0, y: 0.5 },
//       direction: 'in',
//       defaultAngle: 180,
//       allowedConnections: ['pipe'],
//     },
//     {
//       id: 'tube-out',
//       name: 'Tube Outlet',
//       relativePosition: { x: 1, y: 0.5 },
//       direction: 'out',
//       defaultAngle: 0,
//       allowedConnections: ['pipe'],
//     },
//   ],

//   labels: [
//     {
//       id: 'main-label',
//       relativePosition: { x: 0.5, y: 1.2 },
//       anchor: 'middle',
//       binding: 'kks',
//       style: { fontSize: 10, fontWeight: 'normal' },
//     },
//   ],

//   propertySchema: {
//     required: ['kks'],
//     properties: {
//       description: {
//         type: 'string',
//         label: 'Description',
//       },
//       heatDuty: {
//         type: 'unit-value',
//         label: 'Heat Duty',
//         units: ['BTU/hr', 'kW', 'MW'],
//         defaultUnit: 'BTU/hr',
//       },
//       area: {
//         type: 'unit-value',
//         label: 'Surface Area',
//         units: ['ft²', 'm²'],
//         defaultUnit: 'ft²',
//       },
//       tema: {
//         type: 'string',
//         label: 'TEMA Type',
//         placeholder: 'e.g., AES, BEM',
//       },
//     },
//   },
// };


/**
 * Heat Exchanger
 * ISA-style simplified symbol:
 * Square body with full diagonal heat exchange line
 */

export const heatExchanger: SymbolDefinition = {
  id: 'vessel:heat-exchanger',
  category: 'vessels',
  name: 'heatExchanger',
  displayName: 'Heat Exchanger',
  description: 'Generic heat exchanger',
  standard: 'ISA',
  kksEquipmentCode: 'CA',

  // Size control
  defaultSize: { width: 120, height: 120 },
  minSize: { width: 60, height: 60 },
  maxSize: { width: 300, height: 300 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  // Geometry (normalized 0–1)
  paths: [
    // Main square body
    {
      type: 'rect',
      data: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2.5,
        fill: 'inherit',
      },
    },

    // Diagonal heat exchange line (corner to corner)
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.1, x2: 0.1, y2: 0.9 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
      },
    },

    // ---- Nozzle stubs (VERY IMPORTANT) ----

    // Left stub
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.5, x2: 0.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Right stub
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.5, x2: 1.0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Top stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.1, x2: 0.5, y2: 0.0 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Bottom stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.9, x2: 0.5, y2: 1.0 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },
  ],


  // Ports (snapped close to square edges)
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
    {
      id: 'top',
      name: 'Top',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe'],
    },
    {
      id: 'bottom',
      name: 'Bottom',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
  ],

  // Label centered
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.5 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 12,
        fontWeight: 'normal',
      },
    },
  ],


  // Properties
  propertySchema: {
    required: ['kks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
      },
      heatDuty: {
        type: 'unit-value',
        label: 'Heat Duty',
        units: ['BTU/hr', 'kW', 'MW'],
        defaultUnit: 'kW',
      },
      area: {
        type: 'unit-value',
        label: 'Heat Transfer Area',
        units: ['m²', 'ft²'],
        defaultUnit: 'm²',
      },
    },
  },
};


/**
 * Cube Heat Exchanger – Dual Right Ports
 * ISA-style compact heat exchanger
 */

export const cubeHeatExchangerDualRight: SymbolDefinition = {
  id: 'vessel:heat-exchanger-cube-dual-right',
  category: 'vessels',
  name: 'cubeHeatExchangerDualRight',
  displayName: 'Heat Exchanger',
  description: 'Compact heat exchanger with dual right-side connections',
  standard: 'ISA',
  kksEquipmentCode: 'CA',

  // Size
  defaultSize: { width: 120, height: 120 },
  minSize: { width: 60, height: 60 },
  maxSize: { width: 300, height: 300 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  // =========================
  // Geometry (0–1 normalized)
  // =========================
  paths: [
    // Main cube body
    {
      type: 'rect',
      data: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2.5,
        fill: 'inherit',
      },
    },

    // =========================
    // Internal heat-transfer polyline
    // Using EXACT mapped coordinates
    // =========================

    // Segment 1: (100,75) → (25,75)
    {
      type: 'line',
      data: { x1: 0.90, y1: 0.70, x2: 0.30, y2: 0.70 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // Segment 2: (25,75) → (50,50)
    {
      type: 'line',
      data: { x1: 0.30, y1: 0.70, x2: 0.50, y2: 0.50 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // Segment 3: (50,50) → (25,25)
    {
      type: 'line',
      data: { x1: 0.50, y1: 0.50, x2: 0.30, y2: 0.30 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // Segment 4: (25,25) → (100,25)
    {
      type: 'line',
      data: { x1: 0.30, y1: 0.30, x2: 0.90, y2: 0.30 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },

    // =========================
    // Nozzle stubs (perfect pipe fit)
    // =========================

    // Right upper stub (point 1)
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.70, x2: 1.0, y2: 0.70 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Right lower stub (point 5)
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.30, x2: 1.0, y2: 0.30 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Top stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.1, x2: 0.5, y2: 0.0 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },

    // Bottom stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.9, x2: 0.5, y2: 1.0 },
      style: { stroke: 'inherit', strokeWidth: 2.5 },
    },
  ],

  // =========================
  // Ports
  // =========================
  ports: [
    {
      id: 'right-top',
      name: 'Right Top',
      relativePosition: { x: 1, y: 0.70 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
    {
      id: 'right-bottom',
      name: 'Right Bottom',
      relativePosition: { x: 1, y: 0.30 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
    {
      id: 'top',
      name: 'Top',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe'],
    },
    {
      id: 'bottom',
      name: 'Bottom',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // Label
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.2 }, // above first internal point (y = 0.70)
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 12,
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
      heatDuty: {
        type: 'unit-value',
        label: 'Heat Duty',
        units: ['kW', 'MW', 'BTU/hr'],
        defaultUnit: 'kW',
      },
      area: {
        type: 'unit-value',
        label: 'Heat Transfer Area',
        units: ['m²', 'ft²'],
        defaultUnit: 'm²',
      },
    },
  },
};


/**
 * Reactor Vessel
 * ISA Symbol: Vessel with internal stirrer
 */
export const reactor: SymbolDefinition = {
  id: 'vessel:reactor',
  category: 'vessels',
  name: 'reactor',
  displayName: 'Reactor',
  description: 'Reactor with concentric zones',
  standard: 'ISA',
  kksEquipmentCode: 'BD',

  // 3× bigger
  defaultSize: { width: 480, height: 480 },
  minSize: { width: 300, height: 300 },
  maxSize: { width: 960, height: 960 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  // =========================
  // Geometry
  // =========================
  paths: [
    // Outer circle — transparent (does not hide pipes)
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.4 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2.5,
        fill: 'transparent',
      },
    },

    // Inner circle — transparent
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.25 },
      style: {
        stroke: 'inherit',
        strokeWidth: 2,
        fill: 'transparent',
      },
    },
  ],

  // =========================
  // Ports (ALL have name now)
  // =========================
  ports: [
    {
      id: 'outer-30',
      name: 'Outer 30°',
      relativePosition: { x: 0.846, y: 0.3 },
      direction: 'bidirectional',
      defaultAngle: 30,
      allowedConnections: ['pipe'],
    },
    {
      id: 'outer-150',
      name: 'Outer 150°',
      relativePosition: { x: 0.154, y: 0.3 },
      direction: 'bidirectional',
      defaultAngle: 150,
      allowedConnections: ['pipe'],
    },
    {
      id: 'outer-210',
      name: 'Outer 210°',
      relativePosition: { x: 0.154, y: 0.7 },
      direction: 'bidirectional',
      defaultAngle: 210,
      allowedConnections: ['pipe'],
    },
    {
      id: 'outer-330',
      name: 'Outer 330°',
      relativePosition: { x: 0.846, y: 0.7 },
      direction: 'bidirectional',
      defaultAngle: 330,
      allowedConnections: ['pipe'],
    },

    {
      id: 'inner-30',
      name: 'Inner 30°',
      relativePosition: { x: 0.717, y: 0.375 },
      direction: 'bidirectional',
      defaultAngle: 30,
      allowedConnections: ['pipe'],
    },
    {
      id: 'inner-150',
      name: 'Inner 150°',
      relativePosition: { x: 0.283, y: 0.375 },
      direction: 'bidirectional',
      defaultAngle: 150,
      allowedConnections: ['pipe'],
    },
    {
      id: 'inner-210',
      name: 'Inner 210°',
      relativePosition: { x: 0.283, y: 0.625 },
      direction: 'bidirectional',
      defaultAngle: 210,
      allowedConnections: ['pipe'],
    },
    {
      id: 'inner-330',
      name: 'Inner 330°',
      relativePosition: { x: 0.717, y: 0.625 },
      direction: 'bidirectional',
      defaultAngle: 330,
      allowedConnections: ['pipe'],
    },
  ],

  // =========================
  // Label
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.5 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 18,
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
      volume: {
        type: 'unit-value',
        label: 'Volume',
        units: ['m³', 'L'],
        defaultUnit: 'm³',
      },
    },
  },
};



// Export all vessel definitions
export const vesselSymbols = {
  verticalTank,
  //horizontalTank,
  plateHeatExchanger,
  cubeHeatExchangerDualRight,
  pressureVessel,
  heatExchanger,
  reactor,
};

export default vesselSymbols;
