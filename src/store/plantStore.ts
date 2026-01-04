/**
 * Plant Store
 *
 * Manages the plant hierarchy: Plant → Units → Systems → Diagrams
 * Also manages Buildings for location codes.
 * Data is saved to ./data/plant.json via StorageService.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageService } from '../services/StorageService';
import { useDiagramStore } from './diagramStore';
import {
  Plant,
  Unit,
  System,
  Building,
  SafetyClass,
  SeismicClass,
  SystemType,
  SystemConnection,
} from '../types/kks.types';

// ============================================================================
// Types
// ============================================================================

interface PlantState {
  /** Current plant */
  plant: Plant | null;

  /** Currently selected unit */
  selectedUnitKks: string | null;

  /** Currently selected system */
  selectedSystemKks: string | null;

  /** Currently selected building */
  selectedBuildingKks: string | null;

  /** Loading state */
  isLoading: boolean;
}

interface PlantActions {
  // Plant Management
  createPlant: (kks: string, name: string) => void;
  updatePlant: (updates: Partial<Plant>) => void;
  loadPlant: (plant: Plant) => void;
  closePlant: () => void;
  savePlant: () => Promise<void>;
  loadPlantFromFile: () => Promise<void>;

  // Unit Management
  addUnit: (kks: string, name: string, description?: string) => void;
  updateUnit: (kks: string, updates: Partial<Unit>) => void;
  deleteUnit: (kks: string) => void;
  selectUnit: (kks: string | null) => void;

  // System Management
  addSystem: (
    unitKks: string,
    kks: string,
    name: string,
    description?: string,
    safetyClass?: SafetyClass,
    seismicClass?: SeismicClass,
    systemTypes?: SystemType[]
  ) => void;
  updateSystem: (kks: string, updates: Partial<System>) => void;
  deleteSystem: (kks: string) => void;
  selectSystem: (kks: string | null) => void;
  addDiagramToSystem: (systemKks: string, diagramKks: string) => void;
  removeDiagramFromSystem: (systemKks: string, diagramKks: string) => void;
  addSystemConnection: (systemKks: string, connection: SystemConnection) => void;
  removeSystemConnection: (systemKks: string, targetSystemKks: string) => void;

  // Building Management (Plant-level common buildings)
  addBuilding: (building: Building) => void;
  updateBuilding: (kks: string, updates: Partial<Building>) => void;
  deleteBuilding: (kks: string) => void;
  selectBuilding: (kks: string | null) => void;

  // Unit Building Management
  addUnitBuilding: (unitKks: string, building: Building) => void;
  updateUnitBuilding: (unitKks: string, buildingKks: string, updates: Partial<Building>) => void;
  deleteUnitBuilding: (unitKks: string, buildingKks: string) => void;

  // Getters
  getUnit: (kks: string) => Unit | undefined;
  getSystem: (kks: string) => System | undefined;
  getBuilding: (kks: string) => Building | undefined;
  getUnitBuilding: (unitKks: string, buildingKks: string) => Building | undefined;
  getAllUnits: () => Unit[];
  getAllSystems: () => System[];
  getAllBuildings: () => Building[];
  getSystemsForUnit: (unitKks: string) => System[];
  getBuildingsForUnit: (unitKks: string) => Building[];
}

// ============================================================================
// Default Plant
// ============================================================================

const createDefaultPlant = (): Plant => ({
  kks: 'DNPP',
  name: 'Demo Nuclear Power Plant',
  description: 'Default power plant',
  units: {
    '1': {
      kks: '1',
      name: 'Unit 1',
      description: 'Main production unit',
      systems: {},
      buildings: {
        'RB': {
          kks: 'RB',
          name: 'Reactor Building',
          abbreviation: 'RB',
          floors: [
            { id: 'L0', name: 'Level 0', elevation: 0 },
            { id: 'L1', name: 'Level 1', elevation: 5 },
            { id: 'L2', name: 'Level 2', elevation: 10 },
          ],
        },
        'TB': {
          kks: 'TB',
          name: 'Turbine Building',
          abbreviation: 'TB',
          floors: [
            { id: 'L0', name: 'Level 0', elevation: 0 },
            { id: 'L1', name: 'Level 1', elevation: 8 },
          ],
        },
      },
    },
  },
  // Common plant buildings (not belonging to any specific unit)
  buildings: {
    'CB': {
      kks: 'CB',
      name: 'Control Building',
      abbreviation: 'CB',
      floors: [
        { id: 'L0', name: 'Level 0', elevation: 0 },
        { id: 'L1', name: 'Level 1', elevation: 4 },
      ],
    },
    'AB': {
      kks: 'AB',
      name: 'Administration Building',
      abbreviation: 'AB',
      floors: [
        { id: 'L0', name: 'Level 0', elevation: 0 },
        { id: 'L1', name: 'Level 1', elevation: 4 },
      ],
    },
  },
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
});

// ============================================================================
// Initial State
// ============================================================================

const initialState: PlantState = {
  plant: null,
  selectedUnitKks: null,
  selectedSystemKks: null,
  selectedBuildingKks: null,
  isLoading: false,
};

// ============================================================================
// Store
// ============================================================================

export const usePlantStore = create<PlantState & PlantActions>()(
  immer((set, get) => ({
    ...initialState,

    // ========== Plant Management ==========

    createPlant: (kks, name) => {
      set((state) => {
        state.plant = {
          kks,
          name,
          units: {},
          buildings: {},
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        };
        state.selectedUnitKks = null;
        state.selectedSystemKks = null;
        state.selectedBuildingKks = null;
      });
      // Save to file
      get().savePlant();
    },

    updatePlant: (updates) => {
      set((state) => {
        if (state.plant) {
          Object.assign(state.plant, updates);
          state.plant.modifiedAt = new Date().toISOString();
        }
      });
      get().savePlant();
    },

    loadPlant: (plant) => set((state) => {
      state.plant = plant;
      state.selectedUnitKks = null;
      state.selectedSystemKks = null;
      state.selectedBuildingKks = null;
    }),

    closePlant: () => set((state) => {
      state.plant = null;
      state.selectedUnitKks = null;
      state.selectedSystemKks = null;
      state.selectedBuildingKks = null;
    }),

    savePlant: async () => {
      const { plant } = get();
      if (plant) {
        await StorageService.savePlant(plant);
      }
    },

    loadPlantFromFile: async () => {
      set((state) => { state.isLoading = true; });

      const result = await StorageService.loadPlant();

      if (result.success && result.plant) {
        set((state) => {
          state.plant = result.plant!;
          state.isLoading = false;
        });
        console.log('[plantStore] Loaded plant from file');
      } else {
        // Create default plant if none exists
        const defaultPlant = createDefaultPlant();
        set((state) => {
          state.plant = defaultPlant;
          state.isLoading = false;
        });
        console.log('[plantStore] Created default plant');
        // Save the default plant
        await StorageService.savePlant(defaultPlant);
      }
    },

    // ========== Unit Management ==========

    addUnit: (kks, name, description) => {
      set((state) => {
        if (!state.plant) return;
        if (state.plant.units[kks]) {
          console.warn(`Unit ${kks} already exists`);
          return;
        }
        state.plant.units[kks] = {
          kks,
          name,
          description,
          systems: {},
          buildings: {},
        };
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    updateUnit: (kks, updates) => {
      set((state) => {
        if (!state.plant || !state.plant.units[kks]) return;
        Object.assign(state.plant.units[kks], updates);
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    deleteUnit: (kks) => {
      const { plant } = get();
      if (!plant || !plant.units[kks]) return;

      // Get all systems in this unit to delete their data folders
      const unit = plant.units[kks];
      const systemsToDelete = Object.keys(unit.systems);

      // Close any open tabs for systems in this unit
      const diagramState = useDiagramStore.getState();
      useDiagramStore.setState((state) => {
        const newCache = { ...state.diagramCache };
        let newDiagram = state.diagram;

        // Remove all systems from cache
        for (const systemKks of systemsToDelete) {
          delete newCache[systemKks];
          if (state.diagram?.systemKks === systemKks) {
            newDiagram = null;
          }
        }

        return {
          diagramCache: newCache,
          diagram: newDiagram,
          isDirty: newDiagram ? state.isDirty : false,
        };
      });

      // Delete all system data folders
      for (const systemKks of systemsToDelete) {
        StorageService.deleteSystem(systemKks).then((result) => {
          if (result.success) {
            console.log(`[plantStore] Deleted system data folder: ${systemKks}`);
          } else {
            console.warn(`[plantStore] Failed to delete system folder: ${result.error}`);
          }
        });
      }

      // Delete the unit from state
      set((state) => {
        if (!state.plant || !state.plant.units[kks]) return;
        delete state.plant.units[kks];
        if (state.selectedUnitKks === kks) {
          state.selectedUnitKks = null;
          state.selectedSystemKks = null;
        }
        state.plant.modifiedAt = new Date().toISOString();
      });

      get().savePlant();
    },

    selectUnit: (kks) => set((state) => {
      state.selectedUnitKks = kks;
      state.selectedSystemKks = null;
    }),

    // ========== System Management ==========

    addSystem: (unitKks, kks, name, description, safetyClass, seismicClass, systemTypes) => {
      set((state) => {
        if (!state.plant || !state.plant.units[unitKks]) return;
        if (state.plant.units[unitKks].systems[kks]) {
          console.warn(`System ${kks} already exists`);
          return;
        }
        state.plant.units[unitKks].systems[kks] = {
          kks,
          name,
          description: description || '',
          unitKks,
          code: {
            mainGroup: kks.substring(0, 1),
            subGroup1: kks.substring(1, 2),
            subGroup2: kks.substring(2, 3),
            number: kks.substring(3),
          },
          diagrams: [],
          safetyClass: safetyClass || 'N/A',
          seismicClass: seismicClass || 'N/A',
          systemTypes: systemTypes || [],
          connectedSystems: [],
        };
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    updateSystem: (kks, updates) => {
      set((state) => {
        if (!state.plant) return;
        for (const unit of Object.values(state.plant.units)) {
          if (unit.systems[kks]) {
            Object.assign(unit.systems[kks], updates);
            state.plant.modifiedAt = new Date().toISOString();
            return;
          }
        }
      });
      get().savePlant();
    },

    deleteSystem: (kks) => {
      set((state) => {
        if (!state.plant) return;
        for (const unit of Object.values(state.plant.units)) {
          if (unit.systems[kks]) {
            delete unit.systems[kks];
            if (state.selectedSystemKks === kks) {
              state.selectedSystemKks = null;
            }
            state.plant.modifiedAt = new Date().toISOString();
            return;
          }
        }
      });

      // Close the tab if it's open and remove from diagram cache
      const diagramState = useDiagramStore.getState();
      if (diagramState.diagramCache[kks]) {
        useDiagramStore.setState((state) => {
          const newCache = { ...state.diagramCache };
          delete newCache[kks];

          // If this is the active diagram, close it
          if (state.diagram?.systemKks === kks) {
            return {
              diagramCache: newCache,
              diagram: null,
              isDirty: false,
            };
          }

          return { diagramCache: newCache };
        });
      }

      // Delete the system's data folder
      StorageService.deleteSystem(kks).then((result) => {
        if (result.success) {
          console.log(`[plantStore] Deleted system data folder: ${kks}`);
        } else {
          console.warn(`[plantStore] Failed to delete system folder: ${result.error}`);
        }
      });

      get().savePlant();
    },

    selectSystem: (kks) => set((state) => {
      state.selectedSystemKks = kks;
    }),

    addDiagramToSystem: (systemKks, diagramKks) => {
      set((state) => {
        if (!state.plant) return;
        for (const unit of Object.values(state.plant.units)) {
          if (unit.systems[systemKks]) {
            if (!unit.systems[systemKks].diagrams.includes(diagramKks)) {
              unit.systems[systemKks].diagrams.push(diagramKks);
            }
            state.plant.modifiedAt = new Date().toISOString();
            return;
          }
        }
      });
      get().savePlant();
    },

    removeDiagramFromSystem: (systemKks, diagramKks) => {
      set((state) => {
        if (!state.plant) return;
        for (const unit of Object.values(state.plant.units)) {
          if (unit.systems[systemKks]) {
            unit.systems[systemKks].diagrams = unit.systems[systemKks].diagrams.filter(
              (d) => d !== diagramKks
            );
            state.plant.modifiedAt = new Date().toISOString();
            return;
          }
        }
      });
      get().savePlant();
    },

    addSystemConnection: (systemKks, connection) => {
      set((state) => {
        if (!state.plant) return;
        for (const unit of Object.values(state.plant.units)) {
          if (unit.systems[systemKks]) {
            const system = unit.systems[systemKks];
            if (!system.connectedSystems) {
              system.connectedSystems = [];
            }
            // Check if connection already exists
            const exists = system.connectedSystems.some(
              (c) => c.targetSystemKks === connection.targetSystemKks
            );
            if (!exists) {
              system.connectedSystems.push(connection);
              state.plant.modifiedAt = new Date().toISOString();
            }
            return;
          }
        }
      });
      get().savePlant();
    },

    removeSystemConnection: (systemKks, targetSystemKks) => {
      set((state) => {
        if (!state.plant) return;
        for (const unit of Object.values(state.plant.units)) {
          if (unit.systems[systemKks]) {
            const system = unit.systems[systemKks];
            if (system.connectedSystems) {
              system.connectedSystems = system.connectedSystems.filter(
                (c) => c.targetSystemKks !== targetSystemKks
              );
              state.plant.modifiedAt = new Date().toISOString();
            }
            return;
          }
        }
      });
      get().savePlant();
    },

    // ========== Building Management (Plant-level) ==========

    addBuilding: (building) => {
      set((state) => {
        if (!state.plant) return;
        if (state.plant.buildings[building.kks]) {
          console.warn(`Building ${building.kks} already exists`);
          return;
        }
        state.plant.buildings[building.kks] = building;
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    updateBuilding: (kks, updates) => {
      set((state) => {
        if (!state.plant || !state.plant.buildings[kks]) return;
        Object.assign(state.plant.buildings[kks], updates);
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    deleteBuilding: (kks) => {
      set((state) => {
        if (!state.plant || !state.plant.buildings[kks]) return;
        delete state.plant.buildings[kks];
        if (state.selectedBuildingKks === kks) {
          state.selectedBuildingKks = null;
        }
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    selectBuilding: (kks) => set((state) => {
      state.selectedBuildingKks = kks;
    }),

    // ========== Unit Building Management ==========

    addUnitBuilding: (unitKks, building) => {
      set((state) => {
        if (!state.plant || !state.plant.units[unitKks]) return;
        const unit = state.plant.units[unitKks];
        if (!unit.buildings) {
          unit.buildings = {};
        }
        if (unit.buildings[building.kks]) {
          console.warn(`Building ${building.kks} already exists in unit ${unitKks}`);
          return;
        }
        unit.buildings[building.kks] = building;
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    updateUnitBuilding: (unitKks, buildingKks, updates) => {
      set((state) => {
        if (!state.plant || !state.plant.units[unitKks]) return;
        const unit = state.plant.units[unitKks];
        if (!unit.buildings || !unit.buildings[buildingKks]) return;
        Object.assign(unit.buildings[buildingKks], updates);
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    deleteUnitBuilding: (unitKks, buildingKks) => {
      set((state) => {
        if (!state.plant || !state.plant.units[unitKks]) return;
        const unit = state.plant.units[unitKks];
        if (!unit.buildings || !unit.buildings[buildingKks]) return;
        delete unit.buildings[buildingKks];
        if (state.selectedBuildingKks === buildingKks) {
          state.selectedBuildingKks = null;
        }
        state.plant.modifiedAt = new Date().toISOString();
      });
      get().savePlant();
    },

    // ========== Getters ==========

    getUnit: (kks) => {
      const { plant } = get();
      return plant?.units[kks];
    },

    getSystem: (kks) => {
      const { plant } = get();
      if (!plant) return undefined;
      for (const unit of Object.values(plant.units)) {
        if (unit.systems[kks]) {
          return unit.systems[kks];
        }
      }
      return undefined;
    },

    getBuilding: (kks) => {
      const { plant } = get();
      return plant?.buildings[kks];
    },

    getAllUnits: () => {
      const { plant } = get();
      return plant ? Object.values(plant.units) : [];
    },

    getAllSystems: () => {
      const { plant } = get();
      if (!plant) return [];
      const systems: System[] = [];
      for (const unit of Object.values(plant.units)) {
        systems.push(...Object.values(unit.systems));
      }
      return systems;
    },

    getAllBuildings: () => {
      const { plant } = get();
      if (!plant) return [];

      // Collect all buildings: plant-level + unit-level
      const allBuildings: Building[] = [];

      // Add plant-level buildings
      allBuildings.push(...Object.values(plant.buildings));

      // Add unit-level buildings
      for (const unit of Object.values(plant.units)) {
        if (unit.buildings) {
          allBuildings.push(...Object.values(unit.buildings));
        }
      }

      return allBuildings;
    },

    getSystemsForUnit: (unitKks) => {
      const { plant } = get();
      if (!plant || !plant.units[unitKks]) return [];
      return Object.values(plant.units[unitKks].systems);
    },

    getUnitBuilding: (unitKks, buildingKks) => {
      const { plant } = get();
      if (!plant || !plant.units[unitKks]) return undefined;
      const unit = plant.units[unitKks];
      return unit.buildings?.[buildingKks];
    },

    getBuildingsForUnit: (unitKks) => {
      const { plant } = get();
      if (!plant || !plant.units[unitKks]) return [];
      const unit = plant.units[unitKks];
      return unit.buildings ? Object.values(unit.buildings) : [];
    },
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectPlant = (state: PlantState) => state.plant;
export const selectSelectedUnit = (state: PlantState & PlantActions) =>
  state.plant && state.selectedUnitKks
    ? state.plant.units[state.selectedUnitKks]
    : null;
export const selectSelectedSystem = (state: PlantState & PlantActions) =>
  state.selectedSystemKks ? state.getSystem(state.selectedSystemKks) : null;
export const selectSelectedBuilding = (state: PlantState & PlantActions) =>
  state.plant && state.selectedBuildingKks
    ? state.plant.buildings[state.selectedBuildingKks]
    : null;

export default usePlantStore;
