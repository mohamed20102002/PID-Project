/**
 * Pump Symbol Definitions
 *
 * Standard P&ID pump symbols following ISA 5.1 standards
 */

import { SymbolDefinition } from '../../types/symbol.types';

/**
 * Centrifugal Pump
 * ISA Symbol: Circle with inlet and outlet
 */
export const centrifugalPump: SymbolDefinition = {
  id: 'pump:centrifugal',
  category: 'pumps',
  name: 'centrifugalPump',
  displayName: 'Centrifugal Pump',
  description: 'Standard centrifugal pump',
  standard: 'ISA',
  kksEquipmentCode: 'AP',

  defaultSize: { width: 50, height: 40 },
  minSize: { width: 35, height: 28 },
  maxSize: { width: 100, height: 80 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Main circle body
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.4 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Discharge nozzle (top)
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.1, x2: 0.5, y2: 0 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // Suction nozzle (left)
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.5, x2: 0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // Flow direction arrow inside
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.35, y: 0.5 },
          { x: 0.55, y: 0.35 },
          { x: 0.55, y: 0.65 },
        ],
      },
      style: { stroke: 'inherit', strokeWidth: 1, fill: 'none' },
    },
  ],

  ports: [
    {
      id: 'suction',
      name: 'Suction',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'discharge',
      name: 'Discharge',
      relativePosition: { x: 0.5, y: 0 },
      direction: 'out',
      defaultAngle: 270,
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
      description: {
        type: 'string',
        label: 'Description',
      },
      flowRate: {
        type: 'unit-value',
        label: 'Flow Rate',
        units: ['gpm', 'm³/h', 'L/min'],
        defaultUnit: 'gpm',
      },
      head: {
        type: 'unit-value',
        label: 'Head',
        units: ['ft', 'm', 'psi'],
        defaultUnit: 'ft',
      },
      power: {
        type: 'unit-value',
        label: 'Motor Power',
        units: ['hp', 'kW'],
        defaultUnit: 'hp',
      },
      speed: {
        type: 'number',
        label: 'Speed (RPM)',
        defaultValue: 3600,
      },
    },
  },
};

/**
 * Positive Displacement Pump
 * ISA Symbol: Circle with internal lines
 */
export const pdPump: SymbolDefinition = {
  id: 'pump:pd',
  category: 'pumps',
  name: 'pdPump',
  displayName: 'PD Pump',
  description: 'Positive displacement pump',
  standard: 'ISA',
  kksEquipmentCode: 'AP',

  defaultSize: { width: 50, height: 40 },
  minSize: { width: 35, height: 28 },
  maxSize: { width: 100, height: 80 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Main circle body
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.4 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Suction nozzle (left)
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.5, x2: 0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // Discharge nozzle (right)
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.5, x2: 1, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // Internal lines (PD indicator)
    {
      type: 'line',
      data: { x1: 0.3, y1: 0.3, x2: 0.7, y2: 0.3 },
      style: { stroke: 'inherit', strokeWidth: 1.5 },
    },
    {
      type: 'line',
      data: { x1: 0.3, y1: 0.5, x2: 0.7, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 1.5 },
    },
    {
      type: 'line',
      data: { x1: 0.3, y1: 0.7, x2: 0.7, y2: 0.7 },
      style: { stroke: 'inherit', strokeWidth: 1.5 },
    },
  ],

  ports: [
    {
      id: 'suction',
      name: 'Suction',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'discharge',
      name: 'Discharge',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
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
      description: {
        type: 'string',
        label: 'Description',
      },
      pumpType: {
        type: 'select',
        label: 'Pump Type',
        options: [
          { value: 'reciprocating', label: 'Reciprocating' },
          { value: 'diaphragm', label: 'Diaphragm' },
          { value: 'gear', label: 'Gear' },
          { value: 'screw', label: 'Screw' },
          { value: 'progcavity', label: 'Progressive Cavity' },
        ],
        defaultValue: 'reciprocating',
      },
      flowRate: {
        type: 'unit-value',
        label: 'Flow Rate',
        units: ['gpm', 'm³/h', 'L/min'],
        defaultUnit: 'gpm',
      },
    },
  },
};

/**
 * Vacuum Pump
 * ISA Symbol: Circle with V inside
 */
export const vacuumPump: SymbolDefinition = {
  id: 'pump:vacuum',
  category: 'pumps',
  name: 'vacuumPump',
  displayName: 'Vacuum Pump',
  description: 'Vacuum pump or ejector',
  standard: 'ISA',
  kksEquipmentCode: 'AP',

  defaultSize: { width: 50, height: 40 },
  minSize: { width: 35, height: 28 },
  maxSize: { width: 100, height: 80 },
  resizable: true,
  aspectRatioLocked: true,

  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,

  paths: [
    // Main circle body
    {
      type: 'circle',
      data: { cx: 0.5, cy: 0.5, r: 0.4 },
      style: { stroke: 'inherit', strokeWidth: 2, fill: 'inherit' },
    },
    // Suction nozzle
    {
      type: 'line',
      data: { x1: 0.1, y1: 0.5, x2: 0, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // Discharge nozzle
    {
      type: 'line',
      data: { x1: 0.9, y1: 0.5, x2: 1, y2: 0.5 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    // V letter inside
    {
      type: 'line',
      data: { x1: 0.35, y1: 0.3, x2: 0.5, y2: 0.7 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
    {
      type: 'line',
      data: { x1: 0.5, y1: 0.7, x2: 0.65, y2: 0.3 },
      style: { stroke: 'inherit', strokeWidth: 2 },
    },
  ],

  ports: [
    {
      id: 'suction',
      name: 'Suction',
      relativePosition: { x: 0, y: 0.5 },
      direction: 'in',
      defaultAngle: 180,
      allowedConnections: ['pipe'],
    },
    {
      id: 'discharge',
      name: 'Discharge',
      relativePosition: { x: 1, y: 0.5 },
      direction: 'out',
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
      description: {
        type: 'string',
        label: 'Description',
      },
      capacity: {
        type: 'unit-value',
        label: 'Capacity',
        units: ['cfm', 'm³/h'],
        defaultUnit: 'cfm',
      },
      ultimateVacuum: {
        type: 'unit-value',
        label: 'Ultimate Vacuum',
        units: ['mbar', 'torr', 'inHg'],
        defaultUnit: 'mbar',
      },
    },
  },
};


  //Export all pump definitions

  export const pumpSymbols = {
    centrifugalPump,
    pdPump,
    vacuumPump,
  };

  export default pumpSymbols;



