/**
 * Piping Component Symbol Definitions
 *
 * Includes corners (waypoints), reducers, flanges, and other piping elements
 */

import { SymbolDefinition } from '../../types/symbol.types';

/**
 * Pipe Corner / Waypoint
 * A small circle used as a guiding point for pipe routing
 * Connect: Valve -> Corner1 -> Corner2 -> Component
 */
export const pipeCorner: SymbolDefinition = {
  id: 'piping:corner',
  category: 'piping',
  name: 'pipeCorner',
  displayName: 'Pipe Corner',
  description: 'Routing waypoint for pipe direction changes',
  standard: 'ISA',
  kksEquipmentCode: 'RR',
  noKks: true,  // Corners don't need KKS - auto-generate simple ID

  defaultSize: { width: 12, height: 12 },
  minSize: { width: 8, height: 8 },
  maxSize: { width: 20, height: 20 },
  resizable: false,
  aspectRatioLocked: true,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  paths: [
    // Small filled circle
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.4 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
  ],

  ports: [
    {
      id: 'port1',
      name: 'Port 1',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'port2',
      name: 'Port 2',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
    {
      id: 'port3',
      name: 'Port 3',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe'],
    },
    {
      id: 'port4',
      name: 'Port 4',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 2 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 0, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: [],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
        placeholder: 'Corner point description',
      },
    },
  },
};

/**
 * Pipe Tee - T-junction for pipe branching
 */
export const pipeTee: SymbolDefinition = {
  id: 'piping:tee',
  category: 'piping',
  name: 'pipeTee',
  displayName: 'Pipe Tee',
  description: 'T-junction for pipe branching',
  standard: 'ISA',
  kksEquipmentCode: 'RT',

  defaultSize: { width: 24, height: 24 },
  minSize: { width: 16, height: 16 },
  maxSize: { width: 40, height: 40 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Horizontal line
    {
      type: 'line',
      data: { x1: 0, y1: 0.5, x2: 1, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },
    // Vertical branch down
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.5, x2: 0.5, y2: 1 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },
    // Center dot
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.12 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
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
    {
      id: 'branch',
      name: 'Branch',
      relativePosition: { x: 0.5, y: 1 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.5 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 9, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: [],
    properties: {
      size: {
        type: 'string',
        label: 'Size (Run x Branch)',
        defaultValue: '2" x 2"',
      },
    },
  },
};

/**
 * Reducer - Pipe size reduction
 */
export const pipeReducer: SymbolDefinition = {
  id: 'piping:reducer',
  category: 'piping',
  name: 'pipeReducer',
  displayName: 'Reducer',
  description: 'Concentric pipe reducer',
  standard: 'ISA',
  kksEquipmentCode: 'RD',
  noKks: true,

  defaultSize: { width: 30, height: 20 },
  minSize: { width: 20, height: 14 },
  maxSize: { width: 60, height: 40 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Trapezoid shape
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0, y: 0.15 },
          { x: 1, y: 0.3 },
          { x: 1, y: 0.7 },
          { x: 0, y: 0.85 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
  ],

  ports: [
    {
      id: 'large',
      name: 'Large End',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'small',
      name: 'Small End',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.4 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 9, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: [],
    properties: {
      size: {
        type: 'string',
        label: 'Size',
        defaultValue: '4" x 2"',
        placeholder: 'Large x Small',
      },
      type: {
        type: 'select',
        label: 'Type',
        options: [
          { value: 'concentric', label: 'Concentric' },
          { value: 'eccentric', label: 'Eccentric' },
        ],
        defaultValue: 'concentric',
      },
    },
  },
};

/**
 * Flange - Pipe connection flange
 */
export const flange: SymbolDefinition = {
  id: 'piping:flange',
  category: 'piping',
  name: 'flange',
  displayName: 'Flange',
  description: 'Pipe connection flange',
  standard: 'ISA',
  kksEquipmentCode: 'RF',

  defaultSize: { width: 16, height: 24 },
  minSize: { width: 12, height: 18 },
  maxSize: { width: 24, height: 36 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Vertical line (flange face)
    {
      type: 'line',
      data: { x1: 0.5, y1: 0, x2: 0.5, y2: 1 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },
    // Horizontal pipe stub
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.5, x2: 1, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  ports: [
    {
      id: 'pipe',
      name: 'Pipe',
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
      style: { fontSize: 9, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: [],
    properties: {
      size: {
        type: 'string',
        label: 'Size',
        defaultValue: '2"',
      },
      rating: {
        type: 'select',
        label: 'Rating',
        options: [
          { value: '150', label: '150#' },
          { value: '300', label: '300#' },
          { value: '600', label: '600#' },
          { value: '900', label: '900#' },
        ],
        defaultValue: '150',
      },
    },
  },
};

/**
 * Blind Flange - End cap flange
 */
export const blindFlange: SymbolDefinition = {
  id: 'piping:blind-flange',
  category: 'piping',
  name: 'blindFlange',
  displayName: 'Blind Flange',
  description: 'Pipe end cap/blind flange',
  standard: 'ISA',
  kksEquipmentCode: 'RB',

  defaultSize: { width: 20, height: 24 },
  minSize: { width: 14, height: 18 },
  maxSize: { width: 30, height: 36 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Flange face (thick line)
    {
      type: 'line',
      data: { x1: 0.7, y1: 0, x2: 0.7, y2: 1 },
      style: { stroke: 'inherit', strokeWidth: 4 },
    },
    // Pipe stub
    {
      type: 'line',
      data: { x1: 0, y1: 0.5, x2: 0.7, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.3 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 9, fontWeight: 'normal' },
    },
  ],

  propertySchema: {
    required: [],
    properties: {
      size: {
        type: 'string',
        label: 'Size',
        defaultValue: '2"',
      },
    },
  },
};


export const throttlingDevice: SymbolDefinition = {
  id: 'piping:throttling',
  category: 'piping',
  name: 'throttlingDevice',
  displayName: 'Throttling Device',
  description: 'Fixed throttling device / restriction orifice',
  standard: 'ISA',
  kksEquipmentCode: 'AE',

  defaultSize: { width: 50, height: 40 },
  minSize: { width: 30, height: 24 },
  maxSize: { width: 100, height: 80 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: true,

  paths: [
    // LEFT upper arm
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.15, x2: 0.495, y2: 0.495 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },

    // LEFT lower arm
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.85, x2: 0.495, y2: 0.505 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },

    // RIGHT upper arm
    {
      type: 'line',
      data: { x1: 0.505, y1: 0.495, x2: 0.9, y2: 0.15 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },

    // RIGHT lower arm
    {
      type: 'line',
      data: { x1: 0.505, y1: 0.505, x2: 0.9, y2: 0.85 },
      style: { stroke: 'inherit', strokeWidth: 3 },
    },
  ],

  ports: [
    {
      id: 'center',
      name: 'Center',
      relativePosition: { x: 0.5, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.2 },
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
      type: {
        type: 'select',
        label: 'Throttling Type',
        options: [
          { value: 'orifice', label: 'Orifice Plate' },
          { value: 'restriction', label: 'Restriction Device' },
          { value: 'nozzle', label: 'Flow Nozzle' },
        ],
        defaultValue: 'orifice',
      },
    },
  },
};







// Export all piping definitions
export const pipingSymbols = {
  pipeCorner,
  pipeTee,
  pipeReducer,
  flange,
  throttlingDevice,
  blindFlange,
};

export default pipingSymbols;
