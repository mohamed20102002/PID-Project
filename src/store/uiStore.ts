/**
 * UI State Store
 *
 * Manages UI-related state such as mode, zoom, pan, selection, and panel visibility.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { Point, Selection, SelectionType } from '../types';

// ============================================================================
// Types
// ============================================================================

export type AppMode = 'draw' | 'view';

export type DrawTool =
  | 'select'       // Selection tool
  | 'pan'          // Pan/hand tool
  | 'component'    // Placing a component
  | 'pipe'         // Drawing a pipe
  | 'building';    // Drawing a building polygon

export interface Viewport {
  x: number;       // Pan offset X
  y: number;       // Pan offset Y
  scale: number;   // Zoom level (1 = 100%)
}

export interface UIState {
  // Application mode
  mode: AppMode;

  // Current drawing tool
  tool: DrawTool;

  // Component being placed (when tool === 'component')
  placingComponentType: string | null;

  // Viewport (pan/zoom)
  viewport: Viewport;

  // Selection
  selection: Selection;

  // Panel visibility
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Panel widths (resizable)
  leftPanelWidth: number;
  rightPanelWidth: number;

  // Grid settings
  gridVisible: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Axis overlay settings (visual reference only)
  axisOverlayVisible: boolean;
  axisLinesVisible: boolean;

  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;

  // Mouse position (for status bar)
  mousePosition: Point | null;

  // Hover state
  hoveredComponentKks: string | null;
  hoveredPortId: string | null;

  // Connection drawing state
  isDrawingConnection: boolean;
  connectionSourceKks: string | null;
  connectionSourcePortId: string | null;
  connectionPreviewPoints: Point[];
  connectionWaypoints: Point[];  // User-defined waypoints during drawing

  // Highlight state (for terminal navigation blinking)
  highlightedComponentKks: string | null;
  highlightStartTime: number | null;

  // Per-system viewport storage
  systemViewports: Record<string, Viewport>;

  // Building drawing state
  isDrawingBuilding: boolean;
  buildingPreviewPoints: Point[];
  editingBuildingId: string | null;
  selectedBuildingId: string | null;

  // Box selection state
  isBoxSelecting: boolean;
  boxSelectionStart: Point | null;
  boxSelectionEnd: Point | null;

  // Clipboard state
  clipboard: {
    components: any[];
    connections: any[];
  } | null;

  // Multi-drag state (for connections to follow)
  isDraggingSelection: boolean;
  dragSelectionDelta: Point;
  draggedSelectionKks: string[];

  // KKS Pipe Highlighting (Technical Panel feature)
  kksHighlightEnabled: boolean;
  kksHighlightSegment: string;
  kksHighlightColor: string;
  kksHighlightStrokeWidth: number;
  kksHighlightGlowIntensity: number;
  kksHideNonMatching: boolean;

  // Canvas Dark Mode
  canvasDarkMode: boolean;

  // Dark Mode Pipe Settings
  darkModePipeColor: string;
  darkModePipeStrokeWidth: number;
  darkModePipeGlowBlur: number;
  darkModePipeGlowOpacity: number;
}

export interface UIActions {
  // Mode
  setMode: (mode: AppMode) => void;

  // Tool
  setTool: (tool: DrawTool) => void;
  setPlacingComponentType: (type: string | null) => void;

  // Viewport
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  pan: (deltaX: number, deltaY: number) => void;
  panTo: (position: Point) => void;

  // Selection
  select: (componentIds: string[], connectionIds?: string[]) => void;
  addToSelection: (componentIds: string[], connectionIds?: string[]) => void;
  removeFromSelection: (componentIds: string[], connectionIds?: string[]) => void;
  clearSelection: () => void;

  // Panels
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  // Grid
  setGridVisible: (visible: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;

  // Axis overlay
  setAxisOverlayVisible: (visible: boolean) => void;
  setAxisLinesVisible: (visible: boolean) => void;
  toggleAxisOverlay: () => void;

  // Canvas
  setCanvasSize: (width: number, height: number) => void;

  // Mouse
  setMousePosition: (position: Point | null) => void;

  // Hover
  setHoveredComponent: (kks: string | null) => void;
  setHoveredPort: (portId: string | null) => void;

  // Connection drawing
  startConnectionDrawing: (componentIds: string, portId: string) => void;
  updateConnectionPreview: (points: Point[]) => void;
  addConnectionWaypoint: (point: Point) => void;
  removeLastWaypoint: () => void;
  getConnectionWaypoints: () => Point[];
  cancelConnectionDrawing: () => void;
  completeConnectionDrawing: () => Point[];

  // Highlight (for terminal navigation)
  highlightComponent: (kks: string, duration?: number) => void;
  clearHighlight: () => void;

  // Per-system viewport management
  saveViewportForSystem: (systemKks: string) => void;
  restoreViewportForSystem: (systemKks: string) => boolean;

  // Building drawing
  startBuildingDrawing: () => void;
  addBuildingVertex: (point: Point) => void;
  updateBuildingPreview: (points: Point[]) => void;
  cancelBuildingDrawing: () => void;
  completeBuildingDrawing: () => Point[];
  selectBuilding: (id: string | null) => void;
  setEditingBuilding: (id: string | null) => void;

  // Box selection
  startBoxSelection: (point: Point) => void;
  updateBoxSelection: (point: Point) => void;
  endBoxSelection: () => { start: Point; end: Point } | null;
  cancelBoxSelection: () => void;

  // Clipboard
  copyToClipboard: (components: any[], connections: any[]) => void;
  cutToClipboard: (components: any[], connections: any[]) => void;
  getClipboard: () => { components: any[]; connections: any[] } | null;
  clearClipboard: () => void;

  // Multi-drag state
  startDraggingSelection: (componentIds: string[]) => void;
  updateDragSelectionDelta: (delta: Point) => void;
  endDraggingSelection: () => void;

  // KKS Pipe Highlighting
  setKksHighlightEnabled: (enabled: boolean) => void;
  setKksHighlightSegment: (segment: string) => void;
  setKksHighlightColor: (color: string) => void;
  setKksHighlightStrokeWidth: (width: number) => void;
  setKksHighlightGlowIntensity: (intensity: number) => void;
  setKksHideNonMatching: (hide: boolean) => void;

  // Canvas Dark Mode
  setCanvasDarkMode: (enabled: boolean) => void;
  toggleCanvasDarkMode: () => void;

  // Dark Mode Pipe Settings
  setDarkModePipeColor: (color: string) => void;
  setDarkModePipeStrokeWidth: (width: number) => void;
  setDarkModePipeGlowBlur: (blur: number) => void;
  setDarkModePipeGlowOpacity: (opacity: number) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: UIState = {
  mode: 'view',  // Default to view mode - edit requires admin login
  tool: 'pan',   // Pan tool in view mode
  placingComponentType: null,
  viewport: {
    x: 0,
    y: 0,
    scale: 1,
  },
  selection: {
    componentKks: [],
    connectionKks: [],
    type: 'none',
  },
  leftPanelOpen: true,
  rightPanelOpen: true,
  leftPanelWidth: 256,  // 256px (w-64 in Tailwind)
  rightPanelWidth: 288, // 288px (w-72 in Tailwind)
  gridVisible: true,
  snapToGrid: true,
  gridSize: 20,
  axisOverlayVisible: false,
  axisLinesVisible: true,
  canvasWidth: 3000,
  canvasHeight: 2000,
  mousePosition: null,
  hoveredComponentKks: null,
  hoveredPortId: null,
  isDrawingConnection: false,
  connectionSourceKks: null,
  connectionSourcePortId: null,
  connectionPreviewPoints: [],
  connectionWaypoints: [],
  highlightedComponentKks: null,
  highlightStartTime: null,
  systemViewports: {},
  isDrawingBuilding: false,
  buildingPreviewPoints: [],
  editingBuildingId: null,
  selectedBuildingId: null,
  isBoxSelecting: false,
  boxSelectionStart: null,
  boxSelectionEnd: null,
  clipboard: null,
  isDraggingSelection: false,
  dragSelectionDelta: { x: 0, y: 0 },
  draggedSelectionKks: [],
  kksHighlightEnabled: false,
  kksHighlightSegment: '',
  kksHighlightColor: '#00ffff',
  kksHighlightStrokeWidth: 4,
  kksHighlightGlowIntensity: 50,
  kksHideNonMatching: false,
  canvasDarkMode: false,
  // Dark Mode Pipe Settings
  darkModePipeColor: '#ffffff',
  darkModePipeStrokeWidth: 2.5,
  darkModePipeGlowBlur: 15,
  darkModePipeGlowOpacity: 1,
};

// ============================================================================
// Zoom Constants
// ============================================================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

// ============================================================================
// Store
// ============================================================================

export const useUIStore = create<UIState & UIActions>()(
  persist(
  immer((set, get) => ({
    ...initialState,

    // Mode
    setMode: (mode) => set((state) => {
      state.mode = mode;
      // Reset tool when switching modes
      if (mode === 'view') {
        state.tool = 'pan';
      } else {
        state.tool = 'select';
      }
    }),

    // Tool
    setTool: (tool) => set((state) => {
      state.tool = tool;
      if (tool !== 'component') {
        state.placingComponentType = null;
      }
    }),

    setPlacingComponentType: (type) => set((state) => {
      state.placingComponentType = type;
      if (type) {
        state.tool = 'component';
      }
    }),

    // Viewport
    setViewport: (viewport) => set((state) => {
      // Constrain viewport to not allow negative canvas coordinates
      if (viewport.x !== undefined) state.viewport.x = Math.min(0, viewport.x);
      if (viewport.y !== undefined) state.viewport.y = Math.min(0, viewport.y);
      if (viewport.scale !== undefined) {
        state.viewport.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.scale));
      }
    }),

    zoomIn: () => set((state) => {
      state.viewport.scale = Math.min(MAX_ZOOM, state.viewport.scale + ZOOM_STEP);
    }),

    zoomOut: () => set((state) => {
      state.viewport.scale = Math.max(MIN_ZOOM, state.viewport.scale - ZOOM_STEP);
    }),

    zoomToFit: () => set((state) => {
      // TODO: Calculate zoom to fit all content
      state.viewport.scale = 1;
      state.viewport.x = 0;
      state.viewport.y = 0;
    }),

    resetZoom: () => set((state) => {
      state.viewport.scale = 1;
      state.viewport.x = 0;
      state.viewport.y = 0;
    }),

    pan: (deltaX, deltaY) => set((state) => {
      // Constrain viewport to not allow negative canvas coordinates
      state.viewport.x = Math.min(0, state.viewport.x + deltaX);
      state.viewport.y = Math.min(0, state.viewport.y + deltaY);
    }),

    panTo: (position) => set((state) => {
      // Center the viewport on the given position
      // Assuming a canvas viewport size, center the position
      // The viewport x/y are offsets, so we need to calculate where to pan
      // to center the given position in the viewport
      const viewportCenterX = state.canvasWidth / 2;
      const viewportCenterY = state.canvasHeight / 2;
      // Constrain viewport to not allow negative canvas coordinates
      state.viewport.x = Math.min(0, viewportCenterX - position.x * state.viewport.scale);
      state.viewport.y = Math.min(0, viewportCenterY - position.y * state.viewport.scale);
    }),

    // Selection
    select: (componentKks, connectionKks = []) => set((state) => {
      state.selection.componentKks = componentKks;
      state.selection.connectionKks = connectionKks;
      const total = componentKks.length + connectionKks.length;
      state.selection.type = total === 0 ? 'none' : total === 1 ? 'single' : 'multiple';
    }),

    addToSelection: (componentKks, connectionKks = []) => set((state) => {
      const newComponents = [...new Set([...state.selection.componentKks, ...componentKks])];
      const newConnections = [...new Set([...state.selection.connectionKks, ...connectionKks])];
      state.selection.componentKks = newComponents;
      state.selection.connectionKks = newConnections;
      const total = newComponents.length + newConnections.length;
      state.selection.type = total === 0 ? 'none' : total === 1 ? 'single' : 'multiple';
    }),

    removeFromSelection: (componentKks, connectionKks = []) => set((state) => {
      state.selection.componentKks = state.selection.componentKks.filter(
        (kks) => !componentKks.includes(kks)
      );
      state.selection.connectionKks = state.selection.connectionKks.filter(
        (kks) => !connectionKks.includes(kks)
      );
      const total = state.selection.componentKks.length + state.selection.connectionKks.length;
      state.selection.type = total === 0 ? 'none' : total === 1 ? 'single' : 'multiple';
    }),

    clearSelection: () => set((state) => {
      state.selection.componentKks = [];
      state.selection.connectionKks = [];
      state.selection.type = 'none';
    }),

    // Panels
    toggleLeftPanel: () => set((state) => {
      state.leftPanelOpen = !state.leftPanelOpen;
    }),

    toggleRightPanel: () => set((state) => {
      state.rightPanelOpen = !state.rightPanelOpen;
    }),

    setLeftPanelOpen: (open) => set((state) => {
      state.leftPanelOpen = open;
    }),

    setRightPanelOpen: (open) => set((state) => {
      state.rightPanelOpen = open;
    }),

    setLeftPanelWidth: (width) => set((state) => {
      // Constrain width between 200px and 600px
      state.leftPanelWidth = Math.max(200, Math.min(600, width));
    }),

    setRightPanelWidth: (width) => set((state) => {
      // Constrain width between 200px and 600px
      state.rightPanelWidth = Math.max(200, Math.min(600, width));
    }),

    // Grid
    setGridVisible: (visible) => set((state) => {
      state.gridVisible = visible;
    }),

    setSnapToGrid: (snap) => set((state) => {
      state.snapToGrid = snap;
    }),

    setGridSize: (size) => set((state) => {
      state.gridSize = Math.max(5, Math.min(100, size));
    }),

    // Axis overlay
    setAxisOverlayVisible: (visible) => set((state) => {
      state.axisOverlayVisible = visible;
    }),

    setAxisLinesVisible: (visible) => set((state) => {
      state.axisLinesVisible = visible;
    }),

    toggleAxisOverlay: () => set((state) => {
      state.axisOverlayVisible = !state.axisOverlayVisible;
    }),

    // Canvas
    setCanvasSize: (width, height) => set((state) => {
      state.canvasWidth = width;
      state.canvasHeight = height;
    }),

    // Mouse
    setMousePosition: (position) => set((state) => {
      state.mousePosition = position;
    }),

    // Hover
    setHoveredComponent: (kks) => set((state) => {
      state.hoveredComponentKks = kks;
    }),

    setHoveredPort: (portId) => set((state) => {
      state.hoveredPortId = portId;
    }),

    // Connection drawing
    startConnectionDrawing: (componentIds, portId) => set((state) => {
      state.isDrawingConnection = true;
      state.connectionSourceKks = componentIds;
      state.connectionSourcePortId = portId;
      state.connectionPreviewPoints = [];
      state.connectionWaypoints = [];
    }),

    updateConnectionPreview: (points) => set((state) => {
      state.connectionPreviewPoints = points;
    }),

    addConnectionWaypoint: (point) => set((state) => {
      state.connectionWaypoints.push(point);
    }),

    removeLastWaypoint: () => set((state) => {
      if (state.connectionWaypoints.length > 0) {
        state.connectionWaypoints.pop();
      }
    }),

    getConnectionWaypoints: () => get().connectionWaypoints,

    cancelConnectionDrawing: () => set((state) => {
      state.isDrawingConnection = false;
      state.connectionSourceKks = null;
      state.connectionSourcePortId = null;
      state.connectionPreviewPoints = [];
      state.connectionWaypoints = [];
    }),

    completeConnectionDrawing: () => {
      const waypoints = [...get().connectionWaypoints];
      set((state) => {
        state.isDrawingConnection = false;
        state.connectionSourceKks = null;
        state.connectionSourcePortId = null;
        state.connectionPreviewPoints = [];
        state.connectionWaypoints = [];
      });
      return waypoints;
    },

    // Highlight (for terminal navigation)
    highlightComponent: (kks, duration = 3000) => {
      set((state) => {
        state.highlightedComponentKks = kks;
        state.highlightStartTime = Date.now();
      });
      // Auto-clear highlight after duration
      setTimeout(() => {
        set((state) => {
          if (state.highlightedComponentKks === kks) {
            state.highlightedComponentKks = null;
            state.highlightStartTime = null;
          }
        });
      }, duration);
    },

    clearHighlight: () => set((state) => {
      state.highlightedComponentKks = null;
      state.highlightStartTime = null;
    }),

    // Save current viewport for a system
    saveViewportForSystem: (systemKks) => set((state) => {
      state.systemViewports[systemKks] = { ...state.viewport };
    }),

    // Restore viewport for a system (returns true if found)
    restoreViewportForSystem: (systemKks) => {
      const saved = get().systemViewports[systemKks];
      if (saved) {
        set((state) => {
          state.viewport = { ...saved };
        });
        return true;
      }
      return false;
    },

    // Building drawing
    startBuildingDrawing: () => set((state) => {
      state.isDrawingBuilding = true;
      state.buildingPreviewPoints = [];
      state.tool = 'building';
    }),

    addBuildingVertex: (point) => set((state) => {
      state.buildingPreviewPoints.push(point);
    }),

    updateBuildingPreview: (points) => set((state) => {
      state.buildingPreviewPoints = points;
    }),

    cancelBuildingDrawing: () => set((state) => {
      state.isDrawingBuilding = false;
      state.buildingPreviewPoints = [];
      state.tool = 'select';
    }),

    completeBuildingDrawing: () => {
      const points = [...get().buildingPreviewPoints];
      set((state) => {
        state.isDrawingBuilding = false;
        state.buildingPreviewPoints = [];
        state.tool = 'select';
      });
      return points;
    },

    selectBuilding: (id) => set((state) => {
      state.selectedBuildingId = id;
    }),

    setEditingBuilding: (id) => set((state) => {
      state.editingBuildingId = id;
    }),

    // Box selection
    startBoxSelection: (point) => set((state) => {
      state.isBoxSelecting = true;
      state.boxSelectionStart = point;
      state.boxSelectionEnd = point;
    }),

    updateBoxSelection: (point) => set((state) => {
      if (state.isBoxSelecting) {
        state.boxSelectionEnd = point;
      }
    }),

    endBoxSelection: () => {
      const { isBoxSelecting, boxSelectionStart, boxSelectionEnd } = get();
      if (!isBoxSelecting || !boxSelectionStart || !boxSelectionEnd) {
        set((state) => {
          state.isBoxSelecting = false;
          state.boxSelectionStart = null;
          state.boxSelectionEnd = null;
        });
        return null;
      }
      const result = { start: boxSelectionStart, end: boxSelectionEnd };
      set((state) => {
        state.isBoxSelecting = false;
        state.boxSelectionStart = null;
        state.boxSelectionEnd = null;
      });
      return result;
    },

    cancelBoxSelection: () => set((state) => {
      state.isBoxSelecting = false;
      state.boxSelectionStart = null;
      state.boxSelectionEnd = null;
    }),

    // Clipboard
    copyToClipboard: (components, connections) => set((state) => {
      state.clipboard = { components, connections };
    }),

    cutToClipboard: (components, connections) => set((state) => {
      state.clipboard = { components, connections };
    }),

    getClipboard: () => get().clipboard,

    clearClipboard: () => set((state) => {
      state.clipboard = null;
    }),

    // Multi-drag state
    startDraggingSelection: (componentIds) => set((state) => {
      state.isDraggingSelection = true;
      state.draggedSelectionKks = componentIds;
      state.dragSelectionDelta = { x: 0, y: 0 };
    }),

    updateDragSelectionDelta: (delta) => set((state) => {
      state.dragSelectionDelta = delta;
    }),

    endDraggingSelection: () => set((state) => {
      state.isDraggingSelection = false;
      state.draggedSelectionKks = [];
      state.dragSelectionDelta = { x: 0, y: 0 };
    }),

    // KKS Pipe Highlighting
    setKksHighlightEnabled: (enabled) => set((state) => {
      state.kksHighlightEnabled = enabled;
    }),

    setKksHighlightSegment: (segment) => set((state) => {
      state.kksHighlightSegment = segment;
    }),

    setKksHighlightColor: (color) => set((state) => {
      state.kksHighlightColor = color;
    }),

    setKksHighlightStrokeWidth: (width) => set((state) => {
      state.kksHighlightStrokeWidth = Math.max(1, Math.min(10, width));
    }),

    setKksHighlightGlowIntensity: (intensity) => set((state) => {
      state.kksHighlightGlowIntensity = Math.max(0, Math.min(100, intensity));
    }),

    setKksHideNonMatching: (hide) => set((state) => {
      state.kksHideNonMatching = hide;
    }),

    // Canvas Dark Mode
    setCanvasDarkMode: (enabled) => set((state) => {
      state.canvasDarkMode = enabled;
    }),

    toggleCanvasDarkMode: () => set((state) => {
      state.canvasDarkMode = !state.canvasDarkMode;
    }),

    // Dark Mode Pipe Settings
    setDarkModePipeColor: (color) => set((state) => {
      state.darkModePipeColor = color;
    }),

    setDarkModePipeStrokeWidth: (width) => set((state) => {
      state.darkModePipeStrokeWidth = Math.max(1, Math.min(5, width));
    }),

    setDarkModePipeGlowBlur: (blur) => set((state) => {
      state.darkModePipeGlowBlur = Math.max(0, Math.min(30, blur));
    }),

    setDarkModePipeGlowOpacity: (opacity) => set((state) => {
      state.darkModePipeGlowOpacity = Math.max(0, Math.min(1, opacity));
    }),
  })),
  {
    name: 'flowmark_ui',
    partialize: (state) => ({
      mode: state.mode,  // Persist edit mode across refreshes
      tool: state.tool,  // Persist current tool
      viewport: state.viewport,
      systemViewports: state.systemViewports,
      gridVisible: state.gridVisible,
      snapToGrid: state.snapToGrid,
      gridSize: state.gridSize,
      axisOverlayVisible: state.axisOverlayVisible,
      axisLinesVisible: state.axisLinesVisible,
      leftPanelOpen: state.leftPanelOpen,
      rightPanelOpen: state.rightPanelOpen,
      canvasDarkMode: state.canvasDarkMode,  // Persist dark mode
      // Dark Mode Pipe Settings
      darkModePipeColor: state.darkModePipeColor,
      darkModePipeStrokeWidth: state.darkModePipeStrokeWidth,
      darkModePipeGlowBlur: state.darkModePipeGlowBlur,
      darkModePipeGlowOpacity: state.darkModePipeGlowOpacity,
    }),
  }
));

// ============================================================================
// Selectors
// ============================================================================

export const selectViewport = (state: UIState) => state.viewport;
export const selectZoomPercent = (state: UIState) => Math.round(state.viewport.scale * 100);
export const selectIsSelected = (kks: string) => (state: UIState) =>
  state.selection.componentKks.includes(kks) || state.selection.connectionKks.includes(kks);
export const selectHasSelection = (state: UIState) => state.selection.type !== 'none';
