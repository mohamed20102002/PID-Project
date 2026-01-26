/**
 * Visual Component Designer Store
 *
 * Manages state for the visual component designer including:
 * - Active drawing tool
 * - Drawn paths, ports, and labels
 * - Symbol metadata and configuration
 * - Undo/redo history
 * - Auto-save drafts to localStorage
 */

import { create } from 'zustand';
import type {
  SymbolDefinition,
  SymbolPath,
  PortDefinition,
  LabelDefinition,
  SymbolCategory,
  SymbolStandard,
  Size,
  PropertySchema,
} from '../types/symbol.types';

// ============================================================================
// Types
// ============================================================================

export type DrawingTool = 'select' | 'line' | 'rectangle' | 'circle' | 'arc' | 'polygon' | 'port' | 'label' | 'centerpoint' | 'delete' | 'measure';

export interface DesignerMetadata {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SymbolCategory;
  standard: SymbolStandard;
  kksEquipmentCode: string;
  noKks: boolean;
  allowDuplicateKks: boolean;
  hideLabel: boolean;
}

export interface DesignerSizing {
  defaultSize: Size;
  minSize: Size;
  maxSize: Size;
  resizable: boolean;
  aspectRatioLocked: boolean;
}

export interface DesignerBehavior {
  rotatable: boolean;
  rotationSteps: number[];
  freeRotation: boolean;
}

export interface DesignerSnapshot {
  paths: SymbolPath[];
  ports: PortDefinition[];
  labels: LabelDefinition[];
}

export interface DesignerState {
  // Tool state
  activeTool: DrawingTool;

  // Drawing state
  paths: SymbolPath[];
  ports: PortDefinition[];
  labels: LabelDefinition[];
  centerPoint: { x: number; y: number } | null;  // Custom center point for alignment

  // Line precision controls
  lineLengthMode: boolean;  // Whether to use precise length
  lineLengthValue: number;  // Target length in pixels

  // Symbol configuration
  metadata: DesignerMetadata;
  sizing: DesignerSizing;
  behavior: DesignerBehavior;
  propertySchema: PropertySchema;

  // Selection state
  selectedPathIndex: number | null;
  selectedPathIndices: number[]; // Multiple selection
  selectedPortId: string | null;
  selectedLabelId: string | null;

  // Canvas settings
  gridSize: number;
  gridVisible: boolean;
  canvasSize: Size;
  zoom: number;
  panOffset: { x: number; y: number };

  // History for undo/redo
  history: DesignerSnapshot[];
  historyIndex: number;

  // Actions
  setActiveTool: (tool: DrawingTool) => void;

  // Line precision actions
  setLineLengthMode: (enabled: boolean) => void;
  setLineLengthValue: (value: number) => void;

  // Path actions
  addPath: (path: SymbolPath) => void;
  updatePath: (index: number, updates: Partial<SymbolPath>) => void;
  deletePath: (index: number) => void;
  selectPath: (index: number | null) => void;
  selectPaths: (indices: number[]) => void;
  clearSelection: () => void;
  moveSelectedPaths: (dx: number, dy: number) => void;
  rotateSelectedPath: (angle: number) => void;  // Rotate by angle (in degrees)
  setSelectedPathRotation: (angle: number) => void;  // Set absolute rotation

  // Port actions
  addPort: (port: PortDefinition) => void;
  updatePort: (id: string, updates: Partial<PortDefinition>) => void;
  deletePort: (id: string) => void;
  selectPort: (id: string | null) => void;

  // Label actions
  addLabel: (label: LabelDefinition) => void;
  updateLabel: (id: string, updates: Partial<LabelDefinition>) => void;
  deleteLabel: (id: string) => void;
  selectLabel: (id: string | null) => void;
  rotateSelectedLabel: (angle: number) => void;  // Rotate by angle (in degrees)
  setSelectedLabelRotation: (angle: number) => void;  // Set absolute rotation

  // Center point actions
  setCenterPoint: (point: { x: number; y: number }) => void;
  clearCenterPoint: () => void;

  // Metadata actions
  setMetadata: (key: keyof DesignerMetadata, value: any) => void;
  setSizing: (key: keyof DesignerSizing, value: any) => void;
  setBehavior: (key: keyof DesignerBehavior, value: any) => void;
  setPropertySchema: (schema: PropertySchema) => void;

  // Canvas actions
  setGridSize: (size: number) => void;
  toggleGrid: () => void;
  setCanvasSize: (size: Size) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;

  // History actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Utility actions
  reset: () => void;
  loadFromDefinition: (definition: SymbolDefinition) => void;
  exportDefinition: () => SymbolDefinition;
  saveDraft: () => void;
  loadDraft: () => boolean;
  clearDraft: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

// Fixed design area size - symbols are always designed in this virtual 400x400 space
// This ensures consistent sizing regardless of canvas size (small/medium/large)
export const DESIGN_AREA_SIZE = 400;

const DEFAULT_METADATA: DesignerMetadata = {
  id: '',
  name: '',
  displayName: '',
  description: '',
  category: 'AA',  // Default to AA - Fittings (KKS category)
  standard: 'ISA',
  kksEquipmentCode: 'AA',  // Match category
  noKks: false,
  allowDuplicateKks: false,
  hideLabel: false,
};

const DEFAULT_SIZING: DesignerSizing = {
  defaultSize: { width: 60, height: 60 },
  minSize: { width: 30, height: 30 },
  maxSize: { width: 200, height: 200 },
  resizable: true,
  aspectRatioLocked: true,
};

const DEFAULT_BEHAVIOR: DesignerBehavior = {
  rotatable: true,
  rotationSteps: [0, 90, 180, 270],
  freeRotation: false,
};

const DEFAULT_PROPERTY_SCHEMA: PropertySchema = {
  required: [],
  properties: {},
};

const DRAFT_KEY = 'visual-designer-draft';
const MAX_HISTORY = 50;

// ============================================================================
// Store
// ============================================================================

export const useDesignerStore = create<DesignerState>((set, get) => ({
  // Initial state
  activeTool: 'select',
  paths: [],
  ports: [],
  labels: [],
  centerPoint: null,
  lineLengthMode: false,
  lineLengthValue: 50,
  metadata: { ...DEFAULT_METADATA },
  sizing: { ...DEFAULT_SIZING },
  propertySchema: { ...DEFAULT_PROPERTY_SCHEMA },
  behavior: { ...DEFAULT_BEHAVIOR },
  selectedPathIndex: null,
  selectedPathIndices: [],
  selectedPortId: null,
  selectedLabelId: null,
  gridSize: 1,
  gridVisible: true,
  canvasSize: { width: 1200, height: 1200 },
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  history: [],
  historyIndex: -1,

  // Tool actions
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Line precision actions
  setLineLengthMode: (enabled) => set({ lineLengthMode: enabled }),
  setLineLengthValue: (value) => set({ lineLengthValue: Math.max(1, value) }),

  // Path actions
  addPath: (path) => {
    const state = get();
    const newPaths = [...state.paths, path];
    set({ paths: newPaths });
    get().pushHistory();
    get().saveDraft();
  },

  updatePath: (index, updates) => {
    const state = get();
    const newPaths = [...state.paths];
    newPaths[index] = { ...newPaths[index], ...updates };
    set({ paths: newPaths });
    get().pushHistory();
    get().saveDraft();
  },

  deletePath: (index) => {
    const state = get();
    const newPaths = state.paths.filter((_, i) => i !== index);
    set({ paths: newPaths, selectedPathIndex: null });
    get().pushHistory();
    get().saveDraft();
  },

  selectPath: (index) => set({ selectedPathIndex: index, selectedPortId: null }),

  selectPaths: (indices) => set({ selectedPathIndices: indices, selectedPortId: null }),

  clearSelection: () => set({ selectedPathIndex: null, selectedPathIndices: [], selectedPortId: null, selectedLabelId: null }),

  moveSelectedPaths: (dx, dy) => {
    const state = get();
    const { paths, selectedPathIndices } = state;

    if (selectedPathIndices.length === 0) return;

    const newPaths = [...paths];
    // Use DESIGN_AREA_SIZE for coordinate conversion, not canvas size
    const dxRelative = dx / DESIGN_AREA_SIZE;
    const dyRelative = dy / DESIGN_AREA_SIZE;

    selectedPathIndices.forEach((index) => {
      const path = newPaths[index];
      if (!path) return;

      if (path.type === 'line') {
        const data = path.data as { x1: number; y1: number; x2: number; y2: number };
        path.data = {
          x1: data.x1 + dxRelative,
          y1: data.y1 + dyRelative,
          x2: data.x2 + dxRelative,
          y2: data.y2 + dyRelative,
        };
      } else if (path.type === 'rect') {
        const data = path.data as { x: number; y: number; width: number; height: number };
        path.data = {
          ...data,
          x: data.x + dxRelative,
          y: data.y + dyRelative,
        };
      } else if (path.type === 'circle') {
        const data = path.data as { cx: number; cy: number; r: number };
        path.data = {
          ...data,
          cx: data.cx + dxRelative,
          cy: data.cy + dyRelative,
        };
      } else if (path.type === 'polygon') {
        const data = path.data as { points: Array<{ x: number; y: number }> };
        path.data = {
          points: data.points.map((p) => ({
            x: p.x + dxRelative,
            y: p.y + dyRelative,
          })),
        };
      }
    });

    set({ paths: newPaths });
    get().pushHistory();
    get().saveDraft();
  },

  rotateSelectedPath: (angle) => {
    const state = get();
    const { paths, selectedPathIndex } = state;

    if (selectedPathIndex === null) return;

    const newPaths = [...paths];
    const path = newPaths[selectedPathIndex];
    if (!path) return;

    const currentRotation = path.rotation || 0;
    newPaths[selectedPathIndex] = {
      ...path,
      rotation: (currentRotation + angle) % 360,
    };

    set({ paths: newPaths });
    get().pushHistory();
    get().saveDraft();
  },

  setSelectedPathRotation: (angle) => {
    const state = get();
    const { paths, selectedPathIndex } = state;

    if (selectedPathIndex === null) return;

    const newPaths = [...paths];
    const path = newPaths[selectedPathIndex];
    if (!path) return;

    newPaths[selectedPathIndex] = {
      ...path,
      rotation: angle % 360,
    };

    set({ paths: newPaths });
    get().pushHistory();
    get().saveDraft();
  },

  // Port actions
  addPort: (port) => {
    const state = get();
    const newPorts = [...state.ports, port];
    set({ ports: newPorts });
    get().pushHistory();
    get().saveDraft();
  },

  updatePort: (id, updates) => {
    const state = get();
    const newPorts = state.ports.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ ports: newPorts });
    get().pushHistory();
    get().saveDraft();
  },

  deletePort: (id) => {
    const state = get();
    const newPorts = state.ports.filter(p => p.id !== id);
    set({ ports: newPorts, selectedPortId: null });
    get().pushHistory();
    get().saveDraft();
  },

  selectPort: (id) => set({ selectedPortId: id, selectedPathIndex: null }),

  // Label actions
  addLabel: (label) => {
    const state = get();
    const newLabels = [...state.labels, label];
    set({ labels: newLabels });
    get().pushHistory();
    get().saveDraft();
  },

  updateLabel: (id, updates) => {
    const state = get();
    const newLabels = state.labels.map(l =>
      l.id === id ? { ...l, ...updates } : l
    );
    set({ labels: newLabels });
    get().pushHistory();
    get().saveDraft();
  },

  deleteLabel: (id) => {
    const state = get();
    const newLabels = state.labels.filter(l => l.id !== id);
    set({ labels: newLabels, selectedLabelId: null });
    get().pushHistory();
    get().saveDraft();
  },

  selectLabel: (id) => set({ selectedLabelId: id, selectedPathIndex: null, selectedPortId: null }),

  rotateSelectedLabel: (angle) => {
    const state = get();
    const { labels, selectedLabelId } = state;

    if (!selectedLabelId) return;

    const newLabels = labels.map(l => {
      if (l.id === selectedLabelId) {
        const currentRotation = l.rotation || 0;
        return { ...l, rotation: (currentRotation + angle) % 360 };
      }
      return l;
    });

    set({ labels: newLabels });
    get().pushHistory();
    get().saveDraft();
  },

  setSelectedLabelRotation: (angle) => {
    const state = get();
    const { labels, selectedLabelId } = state;

    if (!selectedLabelId) return;

    const newLabels = labels.map(l => {
      if (l.id === selectedLabelId) {
        return { ...l, rotation: angle % 360 };
      }
      return l;
    });

    set({ labels: newLabels });
    get().pushHistory();
    get().saveDraft();
  },

  // Center point actions
  setCenterPoint: (point) => {
    set({ centerPoint: point });
    get().pushHistory();
    get().saveDraft();
  },

  clearCenterPoint: () => {
    set({ centerPoint: null });
    get().pushHistory();
    get().saveDraft();
  },

  // Metadata actions
  setMetadata: (key, value) => {
    const state = get();
    set({
      metadata: { ...state.metadata, [key]: value }
    });
    get().saveDraft();
  },

  setSizing: (key, value) => {
    const state = get();
    set({
      sizing: { ...state.sizing, [key]: value }
    });
    get().saveDraft();
  },

  setBehavior: (key, value) => {
    const state = get();
    set({
      behavior: { ...state.behavior, [key]: value }
    });
    get().saveDraft();
  },

  setPropertySchema: (schema) => {
    set({ propertySchema: schema });
    get().saveDraft();
  },

  // Canvas actions
  setGridSize: (size) => set({ gridSize: size }),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  setCanvasSize: (size) => set({ canvasSize: size }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(5, state.zoom * 1.2) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom / 1.2) })),
  resetZoom: () => set({ zoom: 1, panOffset: { x: 0, y: 0 } }),
  setPanOffset: (offset) => set({ panOffset: offset }),

  // History actions
  pushHistory: () => {
    const state = get();
    const snapshot: DesignerSnapshot = {
      paths: [...state.paths],
      ports: [...state.ports],
      labels: [...state.labels],
    };

    // Remove any history after current index
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snapshot);

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const state = get();
    if (!get().canUndo()) return;

    const newIndex = state.historyIndex - 1;
    const snapshot = state.history[newIndex];

    set({
      paths: [...snapshot.paths],
      ports: [...snapshot.ports],
      labels: [...snapshot.labels],
      historyIndex: newIndex,
      selectedPathIndex: null,
      selectedPortId: null,
      selectedLabelId: null,
    });
    get().saveDraft();
  },

  redo: () => {
    const state = get();
    if (!get().canRedo()) return;

    const newIndex = state.historyIndex + 1;
    const snapshot = state.history[newIndex];

    set({
      paths: [...snapshot.paths],
      ports: [...snapshot.ports],
      labels: [...snapshot.labels],
      historyIndex: newIndex,
      selectedPathIndex: null,
      selectedPortId: null,
      selectedLabelId: null,
    });
    get().saveDraft();
  },

  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  // Utility actions
  reset: () => {
    set({
      activeTool: 'select',
      paths: [],
      ports: [],
      labels: [],
      centerPoint: null,
      metadata: { ...DEFAULT_METADATA },
      sizing: { ...DEFAULT_SIZING },
      propertySchema: { ...DEFAULT_PROPERTY_SCHEMA },
      behavior: { ...DEFAULT_BEHAVIOR },
      selectedPathIndex: null,
      selectedPortId: null,
      selectedLabelId: null,
      history: [],
      historyIndex: -1,
    });
    get().clearDraft();
  },

  loadFromDefinition: (definition) => {
    // Scale symbol to fit in the fixed design area (DESIGN_AREA_SIZE × DESIGN_AREA_SIZE)
    // This ensures symbols appear at the same editing size regardless of canvas size
    const paths = definition.paths || [];

    // Calculate bounding box
    let minX = 1, minY = 1, maxX = 0, maxY = 0;

    if (paths.length > 0) {
      paths.forEach((path) => {
        if (path.type === 'line') {
          const data = path.data as { x1: number; y1: number; x2: number; y2: number };
          minX = Math.min(minX, data.x1, data.x2);
          maxX = Math.max(maxX, data.x1, data.x2);
          minY = Math.min(minY, data.y1, data.y2);
          maxY = Math.max(maxY, data.y1, data.y2);
        } else if (path.type === 'rect') {
          const data = path.data as { x: number; y: number; width: number; height: number };
          minX = Math.min(minX, data.x);
          maxX = Math.max(maxX, data.x + data.width);
          minY = Math.min(minY, data.y);
          maxY = Math.max(maxY, data.y + data.height);
        } else if (path.type === 'circle') {
          const data = path.data as { cx: number; cy: number; r: number };
          minX = Math.min(minX, data.cx - data.r);
          maxX = Math.max(maxX, data.cx + data.r);
          minY = Math.min(minY, data.cy - data.r);
          maxY = Math.max(maxY, data.cy + data.r);
        } else if (path.type === 'polygon') {
          const data = path.data as { points: Array<{ x: number; y: number }> };
          data.points.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
          });
        }
      });

      // No scaling - symbols keep their original relative coordinates (0-1)
      // They will be rendered at actual size within the design area
    }

    set({
      paths: [...paths],
      ports: [...(definition.ports || [])],
      labels: [...(definition.labels || [])],
      // centerPoint is already in relative coordinates (0-1)
      centerPoint: definition.centerPoint ? { ...definition.centerPoint } : null,
      propertySchema: definition.propertySchema || { ...DEFAULT_PROPERTY_SCHEMA },
      metadata: {
        id: definition.id,
        name: definition.name,
        displayName: definition.displayName,
        description: definition.description,
        category: definition.category,
        standard: definition.standard,
        kksEquipmentCode: definition.kksEquipmentCode,
        noKks: definition.noKks || false,
        allowDuplicateKks: definition.allowDuplicateKks || false,
        hideLabel: definition.hideLabel || false,
      },
      sizing: {
        defaultSize: { ...definition.defaultSize },
        minSize: { ...definition.minSize },
        maxSize: { ...definition.maxSize },
        resizable: definition.resizable,
        aspectRatioLocked: definition.aspectRatioLocked,
      },
      behavior: {
        rotatable: definition.rotatable,
        rotationSteps: [...definition.rotationSteps],
        freeRotation: definition.freeRotation,
      },
      selectedPathIndex: null,
      selectedPortId: null,
      selectedLabelId: null,
      selectedPathIndices: [],
      history: [],
      historyIndex: -1,
    });

    // Push initial state to history
    get().pushHistory();
    get().saveDraft();
  },

  exportDefinition: () => {
    const state = get();

    // Always generate ID from the name (unique identifier) field
    // This ensures when user changes the name textbox, the ID updates accordingly
    // The sanitized name becomes the ID with 'custom:' prefix for user-created symbols
    const sanitizedName = (state.metadata.name || 'symbol')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const id = `custom:${sanitizedName}`;

    // Determine labels: if hideLabel is true, use empty array; otherwise use existing or default
    let labels: typeof state.labels;
    if (state.metadata.hideLabel) {
      // No labels when hideLabel is enabled
      labels = [];
    } else if (state.labels.length > 0) {
      // Use user-defined labels
      labels = [...state.labels];
    } else {
      // Default label if none specified and hideLabel is false
      labels = [
        {
          id: 'main-label',
          relativePosition: { x: 0.5, y: 1.2 },
          anchor: 'middle' as const,
          binding: 'kks',
          style: { fontSize: 10, fontWeight: 'normal' as const },
        },
      ];
    }

    const definition: SymbolDefinition = {
      id,
      category: state.metadata.category,
      name: state.metadata.name || 'untitled',
      displayName: state.metadata.displayName || 'Untitled Symbol',
      description: state.metadata.description,
      standard: state.metadata.standard,
      kksEquipmentCode: state.metadata.kksEquipmentCode,
      noKks: state.metadata.noKks,
      allowDuplicateKks: state.metadata.allowDuplicateKks,
      hideLabel: state.metadata.hideLabel,

      defaultSize: { ...state.sizing.defaultSize },
      minSize: { ...state.sizing.minSize },
      maxSize: { ...state.sizing.maxSize },
      resizable: state.sizing.resizable,
      aspectRatioLocked: state.sizing.aspectRatioLocked,

      rotatable: state.behavior.rotatable,
      rotationSteps: [...state.behavior.rotationSteps],
      freeRotation: state.behavior.freeRotation,

      paths: [...state.paths],
      ports: [...state.ports],
      labels,

      // Center point for alignment (optional) - already in relative coordinates (0-1)
      centerPoint: state.centerPoint ? { ...state.centerPoint } : undefined,

      // Property schema from designer
      propertySchema: state.propertySchema,
    };

    return definition;
  },

  saveDraft: () => {
    try {
      const state = get();
      const draft = {
        paths: state.paths,
        ports: state.ports,
        labels: state.labels,
        metadata: state.metadata,
        sizing: state.sizing,
        behavior: state.behavior,
        propertySchema: state.propertySchema,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  },

  loadDraft: () => {
    try {
      const draftStr = localStorage.getItem(DRAFT_KEY);
      if (!draftStr) return false;

      const draft = JSON.parse(draftStr);
      set({
        paths: draft.paths || [],
        ports: draft.ports || [],
        labels: draft.labels || [],
        metadata: draft.metadata || { ...DEFAULT_METADATA },
        sizing: draft.sizing || { ...DEFAULT_SIZING },
        behavior: draft.behavior || { ...DEFAULT_BEHAVIOR },
        propertySchema: draft.propertySchema || { ...DEFAULT_PROPERTY_SCHEMA },
        history: [],
        historyIndex: -1,
      });

      // Push initial state to history
      get().pushHistory();
      return true;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return false;
    }
  },

  clearDraft: () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  },
}));

export default useDesignerStore;
