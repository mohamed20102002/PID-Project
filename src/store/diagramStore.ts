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
// Migration Utility - Convert old ID-based diagrams to KKS-based
// ============================================================================

/**
 * Check if a diagram needs migration from ID-based to KKS-based
 */
function needsMigration(diagram: any): boolean {
  if (!diagram || !diagram.components) return false;

  // Check if any component has an 'id' field (old format)
  const components = Object.values(diagram.components) as any[];
  return components.some((c: any) => c && typeof c.id === 'string' && c.id !== c.kks);
}

/**
 * Migrate terminals to use full KKS (base + terminalId)
 * Old terminals may have terminalId in properties but KKS doesn't include it
 */
function migrateTerminalKks(diagram: Diagram): Diagram {
  if (!diagram || !diagram.components) return diagram;

  const components = diagram.components;
  const newComponents: Record<string, Component> = {};
  let migrationNeeded = false;

  // First pass: identify terminals that need migration
  Object.entries(components).forEach(([currentKks, comp]) => {
    const isTerminal = comp.type.startsWith('terminals:');
    const props = comp.properties as Record<string, string>;
    const terminalId = props?.terminalId || '';

    if (isTerminal && terminalId && !currentKks.endsWith(`-${terminalId}`)) {
      // This terminal needs migration - its KKS should include the terminalId
      migrationNeeded = true;
    }
  });

  if (!migrationNeeded) {
    return diagram;
  }

  console.log('[Migration] Migrating terminal KKS codes to include terminal IDs...');

  // Second pass: migrate components
  Object.entries(components).forEach(([currentKks, comp]) => {
    const isTerminal = comp.type.startsWith('terminals:');
    const props = comp.properties as Record<string, string>;
    const terminalId = props?.terminalId || '';

    if (isTerminal && terminalId && !currentKks.endsWith(`-${terminalId}`)) {
      // Compute new full KKS
      const newFullKks = `${currentKks}-${terminalId}`;
      console.log(`[Migration] Terminal ${currentKks} -> ${newFullKks}`);

      // Store with new KKS
      newComponents[newFullKks] = {
        ...comp,
        kks: newFullKks,
      };

      // Update any connections referencing this component
      if (diagram.connections) {
        Object.values(diagram.connections).forEach((conn) => {
          if (conn.sourceComponentKks === currentKks) {
            conn.sourceComponentKks = newFullKks;
          }
          if (conn.targetComponentKks === currentKks) {
            conn.targetComponentKks = newFullKks;
          }
        });
      }
    } else {
      // Keep as-is
      newComponents[currentKks] = comp;
    }
  });

  return {
    ...diagram,
    components: newComponents,
  };
}

/**
 * Migrate a diagram from ID-based to KKS-based storage
 */
function migrateToKksBased(diagram: any): Diagram {
  if (!diagram) return diagram;
  if (!needsMigration(diagram)) return diagram;

  console.log('[Migration] Converting diagram from ID-based to KKS-based...');

  // Build ID-to-KKS mapping
  const idToKks = new Map<string, string>();
  const oldComponents = diagram.components as Record<string, any>;

  Object.entries(oldComponents).forEach(([key, comp]) => {
    if (comp && comp.id && comp.kks) {
      idToKks.set(comp.id, comp.kks);
    } else if (comp && comp.kks) {
      // Key might already be the KKS in some hybrid cases
      idToKks.set(key, comp.kks);
    }
  });

  // Re-key components by KKS and remove id field
  const newComponents: Record<string, Component> = {};
  Object.values(oldComponents).forEach((comp: any) => {
    if (comp && comp.kks) {
      const { id, ...rest } = comp;
      newComponents[comp.kks] = rest as Component;

      // Also update port connectionId to connectionKks
      if (rest.ports && Array.isArray(rest.ports)) {
        rest.ports = rest.ports.map((p: any) => {
          if (p.connectionId) {
            return { ...p, connectionKks: p.connectionId, connectionId: undefined };
          }
          return p;
        });
      } else {
        // Ensure ports is at least an empty array
        rest.ports = rest.ports || [];
      }
    }
  });

  // Update connections to use KKS references
  const newConnections: Record<string, Connection> = {};
  const oldConnections = diagram.connections as Record<string, any>;

  Object.entries(oldConnections).forEach(([key, conn]) => {
    if (!conn) return;

    // Determine the KKS for this connection
    const connKks = conn.kks || key;

    // Get component KKS from the mapping
    const sourceKks = conn.sourceComponentKks || idToKks.get(conn.sourceComponentId) || conn.sourceComponentId;
    const targetKks = conn.targetComponentKks || idToKks.get(conn.targetComponentId) || conn.targetComponentId;

    newConnections[connKks] = {
      ...conn,
      kks: connKks,
      sourceComponentKks: sourceKks,
      targetComponentKks: targetKks,
      // Ensure waypoints is an array
      waypoints: Array.isArray(conn.waypoints) ? conn.waypoints : [],
      // Ensure isCrossSystem has a default
      isCrossSystem: conn.isCrossSystem ?? false,
      // Remove old ID-based fields
      sourceComponentId: undefined,
      targetComponentId: undefined,
      id: undefined,
    } as Connection;
  });

  console.log(`[Migration] Migrated ${Object.keys(newComponents).length} components, ${Object.keys(newConnections).length} connections`);

  return {
    ...diagram,
    components: newComponents,
    connections: newConnections,
  };
}

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
  switchToSystem: (systemKks: string, options?: { createIfNotFound?: boolean }) => Promise<{ success: boolean; error?: string }>;
  saveCurrentDiagram: () => Promise<{ success: boolean; error?: string }>;

  // Cache management
  validateCache: () => Promise<void>;
  removeFromCache: (systemKks: string) => void;

  // Metadata
  updateMetadata: (metadata: Partial<DiagramMetadata>) => void;
  updateSettings: (settings: Partial<DiagramSettings>) => void;

  // Components (use component KKS for all operations)
  addComponent: (component: Omit<Component, 'kks'> & { kks?: string }) => string;
  updateComponent: (kks: string, updates: Partial<Component>) => void;
  updateComponentInSystem: (systemKks: string, componentKks: string, updates: Partial<Component>) => Promise<void>;
  renameComponent: (oldKks: string, newKks: string) => boolean;
  deleteComponent: (kks: string) => void;
  moveComponent: (kks: string, position: Point) => void;
  rotateComponent: (kks: string, rotation: ComponentRotation) => void;

  // Connections
  addConnection: (connection: Omit<Connection, 'kks'> & { kks?: string }) => string;
  updateConnection: (kks: string, updates: Partial<Connection>) => void;
  deleteConnection: (kks: string) => void;
  updateConnectionWaypoints: (kks: string, waypoints: Point[]) => void;

  // Batch operations
  deleteMultiple: (componentKks: string[], connectionKks: string[]) => void;

  // Symbol type update (when a symbol is renamed)
  updateComponentTypes: (oldType: string, newType: string) => number;

  // Helpers
  getComponent: (kks: string) => Component | undefined;
  getConnection: (kks: string) => Connection | undefined;
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

  // Statistics
  loadAllDiagramsForStats: (systemKksList: string[]) => Promise<void>;
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
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
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
      // Migrate if needed
      let migratedDiagram = needsMigration(diagram) ? migrateToKksBased(diagram) : diagram;
      // Also migrate terminal KKS codes
      migratedDiagram = migrateTerminalKks(migratedDiagram);
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

      // Process media (extract base64 images and save as files)
      const diagramToSave = await StorageService.processDiagramMedia(diagram.systemKks, get().diagram!);

      // Update the diagram in state with processed media paths
      set((state) => {
        if (state.diagram) {
          state.diagram = diagramToSave;
        }
      });

      const result = await StorageService.saveDiagram(diagram.systemKks, diagramToSave);

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

    switchToSystem: async (systemKks, options = { createIfNotFound: true }) => {
      if (!systemKks) {
        console.warn('[diagramStore] switchToSystem: invalid systemKks');
        return { success: false, error: 'Invalid systemKks' };
      }

      const currentState = get();

      // Save current diagram to file first
      if (currentState.diagram && currentState.diagram.systemKks) {
        // Process media (extract base64 images and save as files)
        const processedDiagram = await StorageService.processDiagramMedia(
          currentState.diagram.systemKks,
          currentState.diagram
        );

        const diagramToSave = {
          ...processedDiagram,
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
        // Migrate if needed
        let migratedCached = needsMigration(cached) ? migrateToKksBased(cached) : cached;
        migratedCached = migrateTerminalKks(migratedCached);
        set((state) => {
          state.diagram = { ...migratedCached };
          state.diagramCache[systemKks] = { ...migratedCached };
          state.isDirty = false;
          state.error = null;
        });
        console.log(`[diagramStore] Loaded from cache: ${systemKks}`);
        return { success: true };
      }

      // Try to load from file
      set((state) => { state.isLoading = true; });

      const loadResult = await StorageService.loadDiagram(systemKks);

      if (loadResult.success && loadResult.diagram) {
        // Migrate if needed
        let migratedDiagram = needsMigration(loadResult.diagram) ? migrateToKksBased(loadResult.diagram) : loadResult.diagram;
        migratedDiagram = migrateTerminalKks(migratedDiagram);
        set((state) => {
          state.diagram = migratedDiagram;
          state.diagramCache[systemKks] = { ...migratedDiagram };
          state.isDirty = false;
          state.isLoading = false;
          state.error = null;
        });
        console.log(`[diagramStore] Loaded from file: ${systemKks}`);
        return { success: true };
      } else if (options.createIfNotFound) {
        // Create new diagram for this system (only if createIfNotFound is true)
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
        return { success: true };
      } else {
        // System not found and createIfNotFound is false
        set((state) => {
          state.isLoading = false;
          state.error = `System ${systemKks} not found`;
        });
        console.warn(`[diagramStore] System not found: ${systemKks}`);
        return { success: false, error: `System ${systemKks} not found` };
      }
    },

    saveCurrentDiagram: async () => {
      const diagram = get().diagram;
      if (!diagram || !diagram.systemKks) {
        return { success: false, error: 'No diagram to save' };
      }

      // Process media (extract base64 images and save as files)
      const processedDiagram = await StorageService.processDiagramMedia(diagram.systemKks, diagram);

      const diagramToSave = {
        ...processedDiagram,
        modifiedAt: new Date().toISOString(),
      };

      set((state) => {
        state.diagram = diagramToSave;
        state.diagramCache[diagram.systemKks] = diagramToSave;
      });

      const result = await StorageService.saveDiagram(diagram.systemKks, diagramToSave);

      if (result.success) {
        set((state) => {
          state.isDirty = false;
        });

        // Clean up orphaned media files (images that were deleted from descriptions)
        StorageService.cleanupOrphanedMedia(diagram.systemKks, diagramToSave).catch((err) => {
          console.warn('[diagramStore] Failed to cleanup orphaned media:', err);
        });
      }

      return result;
    },

    // ========== Cache Management ==========

    validateCache: async () => {
      // Get list of existing systems from file storage
      const result = await StorageService.listSystems();
      if (!result.success || !result.systems) {
        console.warn('[diagramStore] Failed to list systems for cache validation');
        return;
      }

      const existingSystems = new Set(result.systems);
      const currentState = get();
      const cachedSystems = Object.keys(currentState.diagramCache);

      // Find cached systems that no longer exist in files
      const staleSystems = cachedSystems.filter(kks => !existingSystems.has(kks));

      if (staleSystems.length > 0) {
        console.log(`[diagramStore] Removing ${staleSystems.length} stale cache entries:`, staleSystems);

        set((state) => {
          for (const kks of staleSystems) {
            delete state.diagramCache[kks];
          }

          // If current diagram is stale, close it
          if (state.diagram && staleSystems.includes(state.diagram.systemKks)) {
            state.diagram = null;
            state.isDirty = false;
          }
        });
      }
    },

    removeFromCache: (systemKks) => {
      set((state) => {
        delete state.diagramCache[systemKks];

        // If this is the current diagram, close it
        if (state.diagram?.systemKks === systemKks) {
          state.diagram = null;
          state.isDirty = false;
        }
      });
      console.log(`[diagramStore] Removed ${systemKks} from cache`);
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
      const kks = component.kks || generateKks('CMP');

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

    // Update a component in a specific system (for cross-system operations like bidirectional terminal linking)
    updateComponentInSystem: async (systemKks, componentKks, updates) => {
      const { diagramCache, diagram } = get();
      let targetDiagram = diagramCache[systemKks];

      // If target is the current diagram, use it directly
      if (!targetDiagram && diagram?.systemKks === systemKks) {
        targetDiagram = diagram;
      }

      // If not in cache, try to load from file
      if (!targetDiagram) {
        console.log(`[diagramStore] Loading diagram ${systemKks} for cross-system update`);
        const result = await StorageService.loadDiagram(systemKks);
        if (result.success && result.diagram) {
          targetDiagram = result.diagram;
          // Add to cache for future use
          set((state) => {
            state.diagramCache[systemKks] = result.diagram!;
          });
        }
      }

      if (targetDiagram && targetDiagram.components[componentKks]) {
        // Create deep copies to avoid mutating frozen/immutable objects
        const updatedComponent = {
          ...targetDiagram.components[componentKks],
          ...updates,
          properties: {
            ...(targetDiagram.components[componentKks].properties || {}),
            ...(updates.properties || {}),
          },
        };

        const updatedDiagram: Diagram = {
          ...targetDiagram,
          components: {
            ...targetDiagram.components,
            [componentKks]: updatedComponent,
          },
          modifiedAt: new Date().toISOString(),
        };

        // Update the cache with the new diagram
        set((state) => {
          state.diagramCache[systemKks] = updatedDiagram;
          // Also update current diagram if it's the same system
          if (state.diagram?.systemKks === systemKks) {
            state.diagram = updatedDiagram;
          }
        });

        // Save the updated diagram to disk
        await StorageService.saveDiagram(systemKks, updatedDiagram);

        console.log(`[diagramStore] Updated component ${componentKks} in system ${systemKks}`);
      } else {
        console.warn(`[diagramStore] Could not find component ${componentKks} in system ${systemKks}`);
      }
    },

    renameComponent: (oldKks, newKks) => {
      const state = get();
      if (!state.diagram || !state.diagram.components[oldKks]) {
        return false;
      }

      // Check if the new KKS already exists
      if (state.diagram.components[newKks]) {
        alert(`Error: KKS code "${newKks}" already exists.\nPlease choose a different KKS identifier.`);
        return false;
      }

      set((s) => {
        if (!s.diagram) return;

        // Get the component and update its KKS
        const component = s.diagram.components[oldKks];
        component.kks = newKks;

        // Re-key the component in the components object
        delete s.diagram.components[oldKks];
        s.diagram.components[newKks] = component;

        // Update connections that reference this component
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
        const connectionsToDelete = Object.entries(state.diagram.connections).filter(
          ([, conn]) => conn.sourceComponentKks === kks || conn.targetComponentKks === kks
        );
        connectionsToDelete.forEach(([connKks]) => {
          delete state.diagram!.connections[connKks];
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
      const kks = connection.kks || generateKks('CONN');

      // Check if connection KKS already exists
      const state = get();
      if (state.diagram && state.diagram.connections[kks]) {
        console.error(`Connection KKS "${kks}" already exists.`);
        return '';
      }

      set((state) => {
        if (state.diagram) {
          state.diagram.connections[kks] = {
            ...connection,
            kks,
            style: connection.style || { ...DEFAULT_CONNECTION_STYLE },
          } as Connection;

          // Update ports
          const sourceComponent = state.diagram.components[connection.sourceComponentKks];
          if (sourceComponent) {
            const sourcePort = sourceComponent.ports.find((p) => p.id === connection.sourcePortId);
            if (sourcePort) sourcePort.connectionKks = kks;
          }

          const targetComponent = state.diagram.components[connection.targetComponentKks];
          if (targetComponent) {
            const targetPort = targetComponent.ports.find((p) => p.id === connection.targetPortId);
            if (targetPort) targetPort.connectionKks = kks;
          }

          state.isDirty = true;
        }
      });
      return kks;
    },

    updateConnection: (kks, updates) => set((state) => {
      if (state.diagram && state.diagram.connections[kks]) {
        Object.assign(state.diagram.connections[kks], updates);
        state.isDirty = true;
      }
    }),

    deleteConnection: (kks) => set((state) => {
      if (state.diagram && state.diagram.connections[kks]) {
        const connection = state.diagram.connections[kks];

        // Clear ports
        const sourceComponent = state.diagram.components[connection.sourceComponentKks];
        if (sourceComponent) {
          const sourcePort = sourceComponent.ports.find((p) => p.id === connection.sourcePortId);
          if (sourcePort) sourcePort.connectionKks = undefined;
        }

        const targetComponent = state.diagram.components[connection.targetComponentKks];
        if (targetComponent) {
          const targetPort = targetComponent.ports.find((p) => p.id === connection.targetPortId);
          if (targetPort) targetPort.connectionKks = undefined;
        }

        delete state.diagram.connections[kks];
        state.isDirty = true;
      }
    }),

    updateConnectionWaypoints: (kks, waypoints) => set((state) => {
      if (state.diagram && state.diagram.connections[kks]) {
        state.diagram.connections[kks].waypoints = waypoints;
        state.isDirty = true;
      }
    }),

    // ========== Batch Operations ==========

    deleteMultiple: (componentKksList, connectionKksList) => set((state) => {
      if (!state.diagram) return;

      // Delete connections first
      connectionKksList.forEach((connKks) => {
        const connection = state.diagram!.connections[connKks];
        if (connection) {
          // Clear ports
          const sourceComponent = state.diagram!.components[connection.sourceComponentKks];
          if (sourceComponent) {
            const sourcePort = sourceComponent.ports.find((p) => p.id === connection.sourcePortId);
            if (sourcePort) sourcePort.connectionKks = undefined;
          }
          const targetComponent = state.diagram!.components[connection.targetComponentKks];
          if (targetComponent) {
            const targetPort = targetComponent.ports.find((p) => p.id === connection.targetPortId);
            if (targetPort) targetPort.connectionKks = undefined;
          }
          delete state.diagram!.connections[connKks];
        }
      });

      // Delete components
      componentKksList.forEach((kks) => {
        if (state.diagram!.components[kks]) {
          // Delete attached connections
          Object.entries(state.diagram!.connections).forEach(([connKks, conn]) => {
            if (conn.sourceComponentKks === kks || conn.targetComponentKks === kks) {
              delete state.diagram!.connections[connKks];
            }
          });
          delete state.diagram!.components[kks];
        }
      });

      state.isDirty = true;
    }),

    // Update component types when a symbol is renamed
    updateComponentTypes: (oldType, newType) => {
      let updatedCount = 0;
      const { diagram, diagramCache } = get();

      // Update current diagram
      if (diagram) {
        set((state) => {
          Object.values(state.diagram!.components).forEach((component) => {
            if (component.type === oldType) {
              component.type = newType;
              updatedCount++;
            }
          });
          if (updatedCount > 0) {
            state.isDirty = true;
          }
        });
      }

      // Update all cached diagrams
      Object.entries(diagramCache).forEach(([systemKks, cachedDiagram]) => {
        if (cachedDiagram && cachedDiagram !== diagram) {
          let cacheUpdated = false;
          set((state) => {
            if (state.diagramCache[systemKks]) {
              Object.values(state.diagramCache[systemKks].components).forEach((component) => {
                if (component.type === oldType) {
                  component.type = newType;
                  updatedCount++;
                  cacheUpdated = true;
                }
              });
            }
          });

          // Save updated cached diagram to file
          if (cacheUpdated) {
            StorageService.saveDiagram(systemKks, get().diagramCache[systemKks]);
          }
        }
      });

      console.log(`[diagramStore] Updated ${updatedCount} components from type "${oldType}" to "${newType}"`);
      return updatedCount;
    },

    // ========== Helpers ==========

    getComponent: (kks) => get().diagram?.components[kks],
    getConnection: (kks) => get().diagram?.connections[kks],
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

    // ========== Statistics ==========

    loadAllDiagramsForStats: async (systemKksList) => {
      const { diagramCache } = get();

      // Load diagrams that aren't in cache yet
      for (const systemKks of systemKksList) {
        if (!diagramCache[systemKks]) {
          const loadResult = await StorageService.loadDiagram(systemKks);
          if (loadResult.success && loadResult.diagram) {
            set((state) => {
              state.diagramCache[systemKks] = loadResult.diagram!;
            });
          }
        }
      }
    },
  })),
  {
    name: 'flowmark_diagrams',
    partialize: (state) => ({
      // Persist the diagram cache (open tabs) and current diagram
      diagramCache: state.diagramCache,
      diagram: state.diagram,
    }),
    merge: (persistedState, currentState) => {
      // Migrate diagrams during hydration from localStorage
      const persisted = persistedState as Partial<DiagramState>;
      console.log('[diagramStore] Merging persisted state, checking for migration...');

      // Migrate current diagram if needed
      let migratedDiagram = persisted.diagram;
      if (migratedDiagram && needsMigration(migratedDiagram)) {
        console.log('[diagramStore] Migrating current diagram...');
        migratedDiagram = migrateToKksBased(migratedDiagram);
      }
      // Also migrate terminal KKS codes
      if (migratedDiagram) {
        migratedDiagram = migrateTerminalKks(migratedDiagram);
      }

      // Migrate all cached diagrams if needed
      const migratedCache: Record<string, Diagram> = {};
      if (persisted.diagramCache) {
        Object.entries(persisted.diagramCache).forEach(([systemKks, cached]) => {
          let migratedCached = cached;
          if (cached && needsMigration(cached)) {
            console.log(`[diagramStore] Migrating cached diagram: ${systemKks}`);
            migratedCached = migrateToKksBased(cached);
          }
          if (migratedCached) {
            // Also migrate terminal KKS codes
            migratedCached = migrateTerminalKks(migratedCached);
            migratedCache[systemKks] = migratedCached;
          }
        });
      }

      return {
        ...currentState,
        diagram: migratedDiagram || currentState.diagram,
        diagramCache: Object.keys(migratedCache).length > 0 ? migratedCache : currentState.diagramCache,
      };
    },
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
