/**
 * System Terminal Symbol Definitions
 *
 * Terminals are cross-reference connectors that link to other systems/diagrams.
 * They show where a pipe or signal continues in another system.
 */

import { SymbolDefinition } from '../../types/symbol.types';

/**
 * System Terminal / Off-Page Connector
 * A rectangle that links to another system's terminal
 * Used to show connections that continue in other diagrams
 */
// export const systemTerminal: SymbolDefinition = {
//   id: 'terminals:system-terminal',
//   category: 'terminals',
//   name: 'systemTerminal',
//   displayName: 'System Terminal',
//   description: 'Cross-reference connector to another system diagram',
//   standard: 'ISA',
//   kksEquipmentCode: 'XT',

//   defaultSize: { width: 140, height: 40 },
//   minSize: { width: 140, height: 40 },
//   maxSize: { width: 140, height: 40 },
//   resizable: true,
//   aspectRatioLocked: false,

//   rotatable: true,
//   rotationSteps: [0,90,270],
//   freeRotation: true,

//   paths: [
//     // Main rectangle with slightly rounded corners
//     {
//       type: 'rect',
//       data: { x: 0.05, y: 0.1, width: 0.9, height: 0.8, rx: 0.05, ry: 0.1 },
//       style: { stroke: 'inherit', strokeWidth: 2, fill: '#033cf7ff' },
//     },
//     // Double border effect (inner rectangle)
//     {
//       type: 'rect',
//       data: { x: 0.1, y: 0.2, width: 0.8, height: 0.6, rx: 0.03, ry: 0.06 },
//       style: { stroke: 'inherit', strokeWidth: 1, fill: '#8ca8d9dc' },
//     },
//   ],

//   ports: [
//     {
//       id: 'left',
//       name: 'Left',
//       relativePosition: { x: 0.1, y: 0.5 },
//       direction: 'bidirectional',
//       defaultAngle: 180,
//       allowedConnections: ['pipe', 'signal'],
//     },
//     {
//       id: 'right',
//       name: 'Right',
//       relativePosition: { x: 0.9, y: 0.5 },
//       direction: 'bidirectional',
//       defaultAngle: 0,
//       allowedConnections: ['pipe', 'signal'],
//     },
//     {
//       id: 'top',
//       name: 'Top',
//       relativePosition: { x: 0.5, y: 0 },
//       direction: 'bidirectional',
//       defaultAngle: 270,
//       allowedConnections: ['pipe', 'signal'],
//     },
//     {
//       id: 'bottom',
//       name: 'Bottom',
//       relativePosition: { x: 0.5, y: 1 },
//       direction: 'bidirectional',
//       defaultAngle: 90,
//       allowedConnections: ['pipe', 'signal'],
//     },
//   ],

//   labels: [
//     // Main KKS label in center
//     {
//       id: 'main-label',
//       relativePosition: { x: 0.5, y: 0.5 },
//       anchor: 'middle',
//       binding: 'kks',
//       style: { fontSize: 10, fontWeight: 'bold' },
//     },
//     // Target system label below
//     {
//       id: 'target-label',
//       relativePosition: { x: 0.5, y: 1.3 },
//       anchor: 'middle',
//       binding: 'targetSystemKks',
//       style: { fontSize: 9, fontWeight: 'normal', fill: '#6366f1' },
//     },
//   ],

//   propertySchema: {
//     required: ['targetSystemKks'],
//     properties: {
//       // Terminal description
//       description: {
//         type: 'string',
//         label: 'Description',
//         placeholder: 'e.g., To Cooling System',
//       },
//       // Target system this terminal links to
//       targetSystemKks: {
//         type: 'string',
//         label: 'Target System KKS',
//         placeholder: 'e.g., 10KBC',
//       },
//       // Target terminal KKS in the other system (for bidirectional linking)
//       targetTerminalKks: {
//         type: 'string',
//         label: 'Target Terminal KKS',
//         placeholder: 'e.g., 10KBC-XT001',
//       },
//       // Flow direction configuration for each port
//       leftPortDirection: {
//         type: 'select',
//         label: 'Left Port Direction',
//         options: [
//           { value: 'none', label: 'Not Used' },
//           { value: 'in', label: 'Input (arrow in)' },
//           { value: 'out', label: 'Output (arrow out)' },
//           { value: 'both', label: 'Bidirectional' },
//         ],
//         defaultValue: 'none',
//       },
//       rightPortDirection: {
//         type: 'select',
//         label: 'Right Port Direction',
//         options: [
//           { value: 'none', label: 'Not Used' },
//           { value: 'in', label: 'Input (arrow in)' },
//           { value: 'out', label: 'Output (arrow out)' },
//           { value: 'both', label: 'Bidirectional' },
//         ],
//         defaultValue: 'out',
//       },
//       topPortDirection: {
//         type: 'select',
//         label: 'Top Port Direction',
//         options: [
//           { value: 'none', label: 'Not Used' },
//           { value: 'in', label: 'Input (arrow in)' },
//           { value: 'out', label: 'Output (arrow out)' },
//           { value: 'both', label: 'Bidirectional' },
//         ],
//         defaultValue: 'none',
//       },
//       bottomPortDirection: {
//         type: 'select',
//         label: 'Bottom Port Direction',
//         options: [
//           { value: 'none', label: 'Not Used' },
//           { value: 'in', label: 'Input (arrow in)' },
//           { value: 'out', label: 'Output (arrow out)' },
//           { value: 'both', label: 'Bidirectional' },
//         ],
//         defaultValue: 'none',
//       },
//       // Line number that continues through this terminal
//       lineNumber: {
//         type: 'string',
//         label: 'Line Number',
//         placeholder: 'e.g., 2"-KBC-001',
//       },
//       // Medium flowing through
//       medium: {
//         type: 'string',
//         label: 'Medium',
//         placeholder: 'e.g., Steam, Water',
//       },
//     },
//   },
// };

export const systemTerminal: SymbolDefinition = {
  id: 'terminals:system-terminal',
  category: 'terminals',
  name: 'systemTerminal',
  displayName: 'System Terminal',
  description: 'Cross-reference connector to another system diagram',
  standard: 'ISA',
  kksEquipmentCode: 'XT',

  defaultSize: { width: 140, height: 40 },
  minSize: { width: 140, height: 40 },
  maxSize: { width: 140, height: 40 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: true,
  rotationSteps: [0, 90, 270],
  freeRotation: true,

  // =========================
  // Geometry (ONE BOX ONLY)
  // =========================
  paths: [
    {
      type: 'rect',
      data: {
        x: 0.05,
        y: 0.15,
        width: 0.9,
        height: 0.7,
        rx: 0.06,
        ry: 0.12,
      },
      style: {
        stroke: 'inherit',
        strokeWidth: 2.5, // 🔥 thicker border
        fill: '#8ca8d9dc',
      },
    },
  ],

  // =========================
  // Ports
  // =========================
  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.05, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 0.95, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'top',
      name: 'Top',
      relativePosition: { x: 0.5, y: 0.15 },
      direction: 'bidirectional',
      defaultAngle: 270,
      allowedConnections: ['pipe', 'signal'],
    },
    {
      id: 'bottom',
      name: 'Bottom',
      relativePosition: { x: 0.5, y: 0.85 },
      direction: 'bidirectional',
      defaultAngle: 90,
      allowedConnections: ['pipe', 'signal'],
    },
  ],

  // =========================
  // Labels
  // =========================
  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.5 },
      anchor: 'middle',
      binding: 'kks',
      style: {
        fontSize: 13,
        fontWeight: 'bold',
      },
    },
    {
      id: 'target-label',
      relativePosition: { x: 0.5, y: 1.12 },
      anchor: 'middle',
      binding: 'targetSystemKks',
      style: {
        fontSize: 9,
        fontWeight: 'normal',
        fill: '#6366f1',
      },
    },
  ],

  // =========================
  // Properties
  // =========================
  propertySchema: {
    required: ['targetSystemKks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
        placeholder: 'e.g., To Cooling System',
      },

      targetSystemKks: {
        type: 'string',
        label: 'Target System KKS',
        placeholder: 'e.g., 10KBC',
      },

      targetTerminalKks: {
        type: 'string',
        label: 'Target Terminal KKS',
        placeholder: 'e.g., 10KBC-XT001',
      },

      leftPortDirection: {
        type: 'select',
        label: 'Left Port Direction',
        options: [
          { value: 'none', label: 'Not Used' },
          { value: 'in', label: 'Input' },
          { value: 'out', label: 'Output' },
          { value: 'both', label: 'Bidirectional' },
        ],
        defaultValue: 'none',
      },

      rightPortDirection: {
        type: 'select',
        label: 'Right Port Direction',
        options: [
          { value: 'none', label: 'Not Used' },
          { value: 'in', label: 'Input' },
          { value: 'out', label: 'Output' },
          { value: 'both', label: 'Bidirectional' },
        ],
        defaultValue: 'none',
      },

      topPortDirection: {
        type: 'select',
        label: 'Top Port Direction',
        options: [
          { value: 'none', label: 'Not Used' },
          { value: 'in', label: 'Input' },
          { value: 'out', label: 'Output' },
          { value: 'both', label: 'Bidirectional' },
        ],
        defaultValue: 'none',
      },

      bottomPortDirection: {
        type: 'select',
        label: 'Bottom Port Direction',
        options: [
          { value: 'none', label: 'Not Used' },
          { value: 'in', label: 'Input' },
          { value: 'out', label: 'Output' },
          { value: 'both', label: 'Bidirectional' },
        ],
        defaultValue: 'none',
      },

      lineNumber: {
        type: 'string',
        label: 'Line Number',
        placeholder: 'e.g., 2\"-KBC-001',
      },

      medium: {
        type: 'string',
        label: 'Medium',
        placeholder: 'e.g., Steam, Water',
      },
    },
  },
};





/**
 * Signal Terminal - For instrument/signal cross-references
 */
export const signalTerminal: SymbolDefinition = {
  id: 'terminals:signal-terminal',
  category: 'terminals',
  name: 'signalTerminal',
  displayName: 'Signal Terminal',
  description: 'Cross-reference connector for instrument signals',
  standard: 'ISA',
  kksEquipmentCode: 'XS',

  defaultSize: { width: 60, height: 30 },
  minSize: { width: 40, height: 20 },
  maxSize: { width: 120, height: 60 },
  resizable: true,
  aspectRatioLocked: false,

  rotatable: false,
  rotationSteps: [0],
  freeRotation: false,

  paths: [
    // Diamond/hexagon shape for signals
    {
      type: 'polygon',
      data: {
        points: [
          { x: 0.15, y: 0.5 },
          { x: 0.3, y: 0.1 },
          { x: 0.7, y: 0.1 },
          { x: 0.85, y: 0.5 },
          { x: 0.7, y: 0.9 },
          { x: 0.3, y: 0.9 },
        ],
      },
      style: { stroke: '#2563eb', strokeWidth: 2, fill: '#dbeafe' },
    },
  ],

  ports: [
    {
      id: 'left',
      name: 'Left',
      relativePosition: { x: 0.15, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 180,
      allowedConnections: ['signal'],
    },
    {
      id: 'right',
      name: 'Right',
      relativePosition: { x: 0.85, y: 0.5 },
      direction: 'bidirectional',
      defaultAngle: 0,
      allowedConnections: ['signal'],
    },
  ],

  labels: [
    {
      id: 'main-label',
      relativePosition: { x: 0.5, y: 0.5 },
      anchor: 'middle',
      binding: 'kks',
      style: { fontSize: 8, fontWeight: 'bold' },
    },
    {
      id: 'target-label',
      relativePosition: { x: 0.5, y: 1.4 },
      anchor: 'middle',
      binding: 'targetSystemKks',
      style: { fontSize: 8, fontWeight: 'normal', fill: '#2563eb' },
    },
  ],

  propertySchema: {
    required: ['targetSystemKks'],
    properties: {
      description: {
        type: 'string',
        label: 'Description',
        placeholder: 'Signal description',
      },
      targetSystemKks: {
        type: 'string',
        label: 'Target System KKS',
        placeholder: 'e.g., 10KBC',
      },
      targetTerminalKks: {
        type: 'string',
        label: 'Target Terminal KKS',
        placeholder: 'e.g., 10KBC-XS001',
      },
      signalType: {
        type: 'select',
        label: 'Signal Type',
        options: [
          { value: 'analog', label: 'Analog (4-20mA)' },
          { value: 'digital', label: 'Digital' },
          { value: 'fieldbus', label: 'Fieldbus' },
          { value: 'hart', label: 'HART' },
        ],
        defaultValue: 'analog',
      },
      leftPortDirection: {
        type: 'select',
        label: 'Left Port Direction',
        options: [
          { value: 'none', label: 'Not Used' },
          { value: 'in', label: 'Input' },
          { value: 'out', label: 'Output' },
          { value: 'both', label: 'Bidirectional' },
        ],
        defaultValue: 'in',
      },
      rightPortDirection: {
        type: 'select',
        label: 'Right Port Direction',
        options: [
          { value: 'none', label: 'Not Used' },
          { value: 'in', label: 'Input' },
          { value: 'out', label: 'Output' },
          { value: 'both', label: 'Bidirectional' },
        ],
        defaultValue: 'out',
      },
    },
  },
};

// Export all terminal definitions
export const terminalSymbols = {
  systemTerminal,
  signalTerminal,
};

export default terminalSymbols;
