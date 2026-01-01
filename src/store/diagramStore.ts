/**
 * Diagram State Store
 *
 * Manages the current diagram state including components, connections, and metadata.
 * Uses file-based storage via StorageService - data is saved to ./data/systems/{systemKks}/
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { StorageService } from '../services/StorageService';
import { migrateIfNeeded, needsMigration } from '../utils/migrateDiagrams';
import {
  Diagram,
  Component,
  Connection,
  BuildingPolygon,
  Point,
  DiagramSettings,
  DiagramMetadata,
  DEFAULT_DIAGRAM_SETTINGS,
  DEFAULT_COMPONENT_STYLE,
  DEFAULT_CONNECTION_STYLE,
  DEFAULT_BUILDING_POLYGON_STYLE,
  ComponentRotation,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface DiagramState {
  // Current diagram
  diagram: Diagram | null;

  // Cache of diagrams for quick switching (in-memory only)
  diagramCache: Record<string, Diagram>;

  // Loading state
  isLoading: boolean;
  isDirty: boolean;

  // Error state
  error: string | null;
}

export interface DiagramActions {
  // Diagram lifecycle
  newDiagram: (systemKks: string, name?: string) => void;
  loadDiagram: (diagram: Diagram) => void;
  saveDiagram: () => Promise<{ success: boolean; error?: string }>;
  closeDiagram: () => void;

  // System switching
  switchToSystem: (systemKks: string) => Promise<void>;
  saveCurrentDiagram: () => Promise<{ success: boolean; error?: string }>;

  // Metadata
  updateMetadata: (metadata: Partial<DiagramMetadata>) => void;
  updateSettings: (settings: Partial<DiagramSettings>) => void;

  // Components
  addComponent: (component: Omit<Component, 'kks'> & { kks?: string }) => string;
  updateComponent: (kks: string, updates: Partial<Component>) => void;
  renameComponent: (oldKks: string, newKks: string) => boolean;
  deleteComponent: (kks: string) => void;
  moveComponent: (kks: string, position: Point) => void;
  rotateComponent: (kks: string, rotation: ComponentRotation) => void;

  // Connections
  addConnection: (connection: Omit<Connection, 'id' | 'kks'> & { kks?: string }) => string;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  updateConnectionWaypoints: (id: string, waypoints: Point[]) => void;

  // Batch operations
  deleteMultiple: (componentKks: string[], connectionIds: string[]) => void;

  // Helpers
  getComponent: (kks: string) => Component | undefined;
  getConnection: (id: string) => Connection | undefined;
  getAllComponents: () => Component[];
  getAllConnections: () => Connection[];
  getComponentsInSystem: (systemKks: string) => Component[];
  getConnectionsForComponent: (componentKks: string) => Connection[];

  // Buildings (polygons)
  addBuilding: (building: Omit<BuildingPolygon, 'id'> & { id?: string }) => string;
  updateBuilding: (id: string, updates: Partial<BuildingPolygon>) => void;
  deleteBuilding: (id: string) => void;
  getBuilding: (id: string) => BuildingPolygon | undefined;
  getAllBuildings: () => BuildingPolygon[];

  // State management
  markClean: () => void;
  markDirty: () => void;
  setError: (error: string | null) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: DiagramState = {
  diagram: null,
  diagramCache: {},
  isLoading: false,
  isDirty: false,
  error: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

const generateKks = (prefix: string = 'TEMP'): string => {
  return `${prefix}${nanoid(8).toUpperCase()}`;
};

const createEmptyDiagram = (systemKks: string, name: string): Diagram => ({
  kks: generateKks('DIA'),
  name,
  version: '1.0.0',
  systemKks,
  metadata: {
    title: name,
    author: 'User',
    revision: 'A',
    tags: [],
  },
  settings: { ...DEFAULT_DIAGRAM_SETTINGS },
  components: {},
  connections: {},
  buildings: {},
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
});

// ============================================================================
// Store
// ============================================================================

export const useDiagramStore = create<DiagramState & DiagramActions>()(
  persist(
  immer((set, get) => ({
    ...initialState,

    // ========== Diagram Lifecycle ==========

    newDiagram: (systemKks, name = 'New Diagram') => {
      if (!systemKks) {
        console.warn('[diagramStore] newDiagram: invalid systemKks');
        return;
      }

      set((state) => {
        // Save current diagram to cache
        if (state.diagram && state.diagram.systemKks) {
          state.diagramCache[state.diagram.systemKks] = { ...state.diagram };
        }

        // Create new diagram
        const newDiagram = createEmptyDiagram(systemKks, name);
        state.diagram = newDiagram;
        state.diagramCache[systemKks] = { ...newDiagram };
        state.isDirty = true;
        state.error = null;
      });

      // Save to file
      const diagram = get().diagram;
      if (diagram) {
        StorageService.saveDiagram(systemKks, diagram);
      }
    },

    loadDiagram: (diagram) => set((state) => {
      // Migrate diagram if needed (old format -> new format with connection IDs)
      const migratedDiagram = migrateIfNeeded(diagram);

      state.diagram = migratedDiagram;
      if (migratedDiagram.systemKks) {
        state.diagramCache[migratedDiagram.systemKks] = { ...migratedDiagram };
      }
      state.isDirty = false;
      state.error = null;
    }),

    saveDiagram: async () => {
      const { diagram } = get();
      if (!diagram || !diagram.systemKks) {
        return { success: false, error: 'No diagram to save' };
      }

      set((state) => {
        if (state.diagram) {
          state.diagram.modifiedAt = new Date().toISOString();
        }
      });

      const result = await StorageService.saveDiagram(diagram.systemKks, get().diagram!);

      if (result.success) {
        set((state) => {
          state.isDirty = false;
        });
      }

      return result;
    },

    closeDiagram: () => set((state) => {
      state.diagram = null;
      state.isDirty = false;
      state.error = null;
    }),

    // ========== System Switching ==========

    switchToSystem: async (systemKks) => {
      if (!systemKks) {
        console.warn('[diagramStore] switchToSystem: invalid systemKks');
        return;
      }

      const currentState = get();

      // Save current diagram to file first
      if (currentState.diagram && currentState.diagram.systemKks) {
        const diagramToSave = {
          ...currentState.diagram,
          modifiedAt: new Date().toISOString(),
        };

        // Update cache
        set((state) => {
          state.diagramCache[currentState.diagram!.systemKks] = diagramToSave;
        });

        // Save to file
        await StorageService.saveDiagram(currentState.diagram.systemKks, diagramToSave);
      }

      // Check cache first
      const cached = get().diagramCache[systemKks];
      if (cached) {
        // Migrate cached diagram if needed (in case cache has old format)
        const migratedCached = migrateIfNeeded(cached);

        set((state) => {
          state.diagram = { ...migratedCached };
          state.diagramCache[systemKks] = { ...migratedCached }; // Update cache with migrated version
          state.isDirty = false;
          state.error = null;
        });
        console.log(`[diagramStore] Loaded from cache: ${systemKks}`);
        return;
      }

      // Try to load from file
      set((state) => { state.isLoading = true; });

      const loadResult = await StorageService.loadDiagram(systemKks);

      if (loadResult.success && loadResult.diagram) {
        // Migrate diagram if needed (old format -> new format with connection IDs)
        const wasMigrated = needsMigration(loadResult.diagram);
        const migratedDiagram = migrateIfNeeded(loadResult.diagram);

        set((state) => {
          state.diagram = migratedDiagram;
          state.diagramCache[systemKks] = { ...migratedDiagram };
          state.isDirty = wasMigrated; // Mark as dirty if migrated so it gets saved
          state.isLoading = false;
          state.error = null;
        });
        console.log(`[diagramStore] Loaded from file: ${systemKks}`);

        // Auto-save if diagram was migrated
        if (wasMigrated) {
          console.log(`[diagramStore] Auto-saving migrated diagram: ${systemKks}`);
          setTimeout(() => {
            get().saveDiagram();
          }, 100);
        }
      } else {
        // Create new diagram for this system
        const newDiagram = createEmptyDiagram(systemKks, `Diagram - ${systemKks}`);
        set((state) => {
          state.diagram = newDiagram;
          state.diagramCache[systemKks] = { ...newDiagram };
          state.isDirty = true;
          state.isLoading = false;
          state.error = null;
        });
        console.log(`[diagramStore] Created new diagram: ${systemKks}`);

        // Save the new diagram to file
        await StorageService.saveDiagram(systemKks, newDiagram);
      }
    },

    saveCurrentDiagram: async () => {
      const diagram = get().diagram;
      if (!diagram || !diagram.systemKks) {
        return { success: false, error: 'No diagram to save' };
      }

      const diagramToSave = {
        ...diagram,
        modifiedAt: new Date().toISOString(),
      };

      set((state) => {
        state.diagramCache[diagram.systemKks] = diagramToSave;
      });

      const result = await StorageService.saveDiagram(diagram.systemKks, diagramToSave);

      if (result.success) {
        set((state) => {
          state.isDirty = false;
        });
      }

      return result;
    },

    // ========== Metadata ==========

    updateMetadata: (metadata) => set((state) => {
      if (state.diagram) {
        state.diagram.metadata = { ...state.diagram.metadata, ...metadata };
        state.isDirty = true;
      }
    }),

    updateSettings: (settings) => set((state) => {
      if (state.diagram) {
        state.diagram.settings = { ...state.diagram.settings, ...settings };
        state.isDirty = true;
      }
    }),

    // ========== Components ==========

    addComponent: (component) => {
      let kks = component.kks || generateKks('CMP');

      // Check if KKS already exists in the current diagram
      const state = get();
      if (state.diagram && state.diagram.components[kks]) {
        console.error(`KKS "${kks}" already exists in this diagram. Component not added.`);
        alert(`Error: KKS code "${kks}" already exists in this diagram.\nEach component must have a unique KKS identifier.`);
        return '';
      }

      set((state) => {
        if (state.diagram) {
          state.diagram.components[kks] = {
            ...component,
            kks,
            style: component.style || { ...DEFAULT_COMPONENT_STYLE },
          } as Component;
          state.isDirty = true;
        }
      });
      return kks;
    },

    updateComponent: (kks, updates) => set((state) => {
      if (state.diagram && state.diagram.components[kks]) {
        Object.assign(state.diagram.components[kks], updates);
        state.isDirty = true;
      }
    }),

    renameComponent: (oldKks, newKks) => {
      const state = get();
      if (!state.diagram || !state.diagram.components[oldKks]) return false;
      if (state.diagram.components[newKks]) {
        alert(`Error: KKS code "${newKks}" already exists.\nPlease choose a different KKS identifier.`);
        return false;
      }

      set((s) => {
        if (!s.diagram) return;
        const component = s.diagram.components[oldKks];
        component.kks = newKks;
        s.diagram.components[newKks] = component;
        delete s.diagram.components[oldKks];

        // Update connections
        Object.values(s.diagram.connections).forEach((conn) => {
          if (conn.sourceComponentKks === oldKks) conn.sourceComponentKks = newKks;
          if (conn.targetComponentKks === oldKks) conn.targetComponentKks = newKks;
        });

        s.isDirty = true;
      });
      return true;
    },

    deleteComponent: (kks) => set((state) => {
      if (state.diagram && state.diagram.components[kks]) {
        // Delete connections attached to this component
        const connectionsToDelete = Object.values(state.diagram.connections).filter(
          (conn) => conn.sourceComponentKks === kks || conn.targetComponentKks === kks
        );
        connectionsToDelete.forEach((conn) => {
          delete state.diagram!.connections[conn.kks];
        });

        delete state.diagram.components[kks];
        state.isDirty = true;
      }
    }),

    moveComponent: (kks, position) => set((state) => {
      if (state.diagram && state.diagram.components[kks]) {
        state.diagram.components[kks].position = position;
        state.isDirty = true;
      }
    }),

    rotateComponent: (kks, rotation) => set((state) => {
      if (state.diagram && state.diagram.components[kks]) {
        state.diagram.components[kks].rotation = rotation;
        state.isDirty = true;
      }
    }),

    // ========== Connections ==========

    addConnection: (connection) => {
      const id = nanoid();
      const kks = connection.kks || '';
      set((state) => {
        if (state.diagram) {
          state.diagram.connections[id] = {
            ...connection,
            id,
            kks,
            style: connection.style || { ...DEFAULT_CONNECTION_STYLE },
          } as Connection;

          // Update ports
          const sourceComponent = state.diagram.components[connection.sourceComponentKks];
          if (sourceComponent) {
            const sourcePort = sourceComponent.ports.find((p) => p.id === connection.sourcePortId);
            if (sourcePort) sourcePort.connectionId = id;
          }

          const targetComponent = state.diagram.components[connection.targetComponentKks];
          if (targetComponent) {
            const targetPort = targetComponent.ports.find((p) => p.id === connection.targetPortId);
            if (targetPort) targetPort.connectionId = id;
          }

          state.isDirty = true;
        }
      });
      return id;
    },

    updateConnection: (id, updates) => set((state) => {
      if (state.diagram && state.diagram.connections[id]) {
        Object.assign(state.diagram.connections[id], updates);
        state.isDirty = true;
      }
    }),

    deleteConnection: (id) => set((state) => {
      if (state.diagram && state.diagram.connections[id]) {
        const connection = state.diagram.connections[id];

        // Clear ports
        const sourceComponent = state.diagram.components[connection.sourceComponentKks];
        if (sourceComponent) {
          const sourcePort = sourceComponent.ports.find((p) => p.id === connection.sourcePortId);
          if (sourcePort) sourcePort.connectionId = undefined;
        }

        const targetComponent = state.diagram.components[connection.targetComponentKks];
        if (targetComponent) {
          const targetPort = targetComponent.ports.find((p) => p.id === connection.targetPortId);
          if (targetPort) targetPort.connectionId = undefined;
        }

        delete state.diagram.connections[id];
        state.isDirty = true;
      }
    }),

    updateConnectionWaypoints: (id, waypoints) => set((state) => {
      if (state.diagram && state.diagram.connections[id]) {
        state.diagram.connections[id].waypoints = waypoints;
        state.isDirty = true;
      }
    }),

    // ========== Batch Operations ==========

    deleteMultiple: (componentKks, connectionIds) => set((state) => {
      if (!state.diagram) return;

      // Delete connections first
      connectionIds.forEach((id) => {
        const connection = state.diagram!.connections[id];
        if (connection) {
          // Clear ports
          const sourceComponent = state.diagram!.components[connection.sourceComponentKks];
          if (sourceComponent) {
            const sourcePort = sourceComponent.ports.find((p) => p.id === connection.sourcePortId);
            if (sourcePort) sourcePort.connectionId = undefined;
          }
          const targetComponent = state.diagram!.components[connection.targetComponentKks];
          if (targetComponent) {
            const targetPort = targetComponent.ports.find((p) => p.id === connection.targetPortId);
            if (targetPort) targetPort.connectionId = undefined;
          }
          delete state.diagram!.connections[id];
        }
      });

      // Delete components
      componentKks.forEach((kks) => {
        if (state.diagram!.components[kks]) {
          // Delete attached connections
          Object.values(state.diagram!.connections).forEach((conn) => {
            if (conn.sourceComponentKks === kks || conn.targetComponentKks === kks) {
              delete state.diagram!.connections[conn.id];
            }
          });
          delete state.diagram!.components[kks];
        }
      });

      state.isDirty = true;
    }),

    // ========== Helpers ==========

    getComponent: (kks) => get().diagram?.components[kks],
    getConnection: (id) => get().diagram?.connections[id],
    getAllComponents: () => get().diagram ? Object.values(get().diagram!.components) : [],
    getAllConnections: () => get().diagram ? Object.values(get().diagram!.connections) : [],
    getComponentsInSystem: (systemKks) => {
      const diagram = get().diagram;
      if (!diagram) return [];
      return Object.values(diagram.components).filter((c) => c.systemKks === systemKks);
    },
    getConnectionsForComponent: (componentKks) => {
      const diagram = get().diagram;
      if (!diagram) return [];
      return Object.values(diagram.connections).filter(
        (c) => c.sourceComponentKks === componentKks || c.targetComponentKks === componentKks
      );
    },

    // ========== Buildings ==========

    addBuilding: (building) => {
      const id = building.id || `BLD${nanoid(8).toUpperCase()}`;
      set((state) => {
        if (state.diagram) {
          state.diagram.buildings[id] = {
            ...DEFAULT_BUILDING_POLYGON_STYLE,
            ...building,
            id,
          } as BuildingPolygon;
          state.isDirty = true;
        }
      });
      return id;
    },

    updateBuilding: (id, updates) => set((state) => {
      if (state.diagram && state.diagram.buildings[id]) {
        Object.assign(state.diagram.buildings[id], updates);
        state.isDirty = true;
      }
    }),

    deleteBuilding: (id) => set((state) => {
      if (state.diagram && state.diagram.buildings[id]) {
        delete state.diagram.buildings[id];
        state.isDirty = true;
      }
    }),

    getBuilding: (id) => get().diagram?.buildings[id],
    getAllBuildings: () => get().diagram?.buildings ? Object.values(get().diagram!.buildings) : [],

    // ========== State Management ==========

    markClean: () => set((state) => { state.isDirty = false; }),
    markDirty: () => set((state) => { state.isDirty = true; }),
    setError: (error) => set((state) => { state.error = error; }),
  })),
  {
    name: 'flowmark_diagrams',
    partialize: (state) => ({
      // Persist the diagram cache (open tabs) and current diagram
      diagramCache: state.diagramCache,
      diagram: state.diagram,
    }),
  }
));

// ============================================================================
// Selectors
// ============================================================================

export const selectDiagram = (state: DiagramState) => state.diagram;
export const selectIsDirty = (state: DiagramState) => state.isDirty;
export const selectComponents = (state: DiagramState) =>
  state.diagram ? Object.values(state.diagram.components) : [];
export const selectConnections = (state: DiagramState) =>
  state.diagram ? Object.values(state.diagram.connections) : [];
export const selectBuildings = (state: DiagramState) =>
  state.diagram?.buildings ? Object.values(state.diagram.buildings) : [];
export const selectSettings = (state: DiagramState) => state.diagram?.settings;
