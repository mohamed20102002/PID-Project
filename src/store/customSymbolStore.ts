/**
 * Custom Symbol Store
 *
 * Manages user-defined and modified symbols.
 * Supports saving to localStorage and import/export.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { SymbolDefinition, SymbolCategory } from '../types/symbol.types';
import { StorageService } from '../services/StorageService';

// ============================================================================
// Types
// ============================================================================

interface CustomSymbolState {
  /** User-created symbols */
  customSymbols: Record<string, SymbolDefinition>;

  /** User modifications to built-in symbols (style overrides) */
  symbolOverrides: Record<string, Partial<SymbolDefinition>>;

  /** Favorite symbols for quick access */
  favorites: string[];

  /** Recently used symbols */
  recentlyUsed: string[];

  /** Whether symbols have been loaded from file */
  isLoadedFromFile: boolean;
}

interface CustomSymbolActions {
  /** Initialize default symbols from built-in registry (first load only) */
  initializeDefaultSymbols: () => void;

  /** Add a new custom symbol - returns true if successful, false if duplicate ID */
  addCustomSymbol: (symbol: SymbolDefinition) => boolean;

  /** Update a custom symbol */
  updateCustomSymbol: (id: string, updates: Partial<SymbolDefinition>) => void;

  /** Delete a custom symbol */
  deleteCustomSymbol: (id: string) => void;

  /** Duplicate a symbol (built-in or custom) as a new custom symbol */
  duplicateSymbol: (sourceId: string, newId: string, newName: string) => void;

  /** Set override for a built-in symbol */
  setSymbolOverride: (id: string, override: Partial<SymbolDefinition>) => void;

  /** Clear override for a built-in symbol */
  clearSymbolOverride: (id: string) => void;

  /** Toggle favorite status */
  toggleFavorite: (id: string) => void;

  /** Add to recently used */
  addToRecentlyUsed: (id: string) => void;

  /** Import symbols from JSON */
  importSymbols: (symbols: SymbolDefinition[]) => { added: number; skipped: number };

  /** Export custom symbols as JSON */
  exportSymbols: (ids?: string[]) => string;

  /** Clear all custom symbols */
  clearAll: () => void;

  /** Get a symbol by ID (including overrides) */
  getSymbol: (id: string) => SymbolDefinition | undefined;

  /** Check if a symbol ID is available */
  isIdAvailable: (id: string) => boolean;

  /** Rename a custom symbol - updates ID based on new name and returns new ID */
  renameSymbol: (oldId: string, newName: string) => { newId: string; success: boolean };

  /** Migrate all symbols to use name-based IDs */
  migrateToNameBasedIds: () => { migrated: number; oldToNewMap: Record<string, string> };

  /** Migrate old symbols to new coordinate system (fixes stretching from pre-200×200 design area) */
  migrateSymbolCoordinates: (symbolId: string) => boolean;

  /** Migrate all symbols to new coordinate system */
  migrateAllSymbols: () => { migrated: number; failed: number };

  /** Remove symbols with legacy categories (not in KKS or special categories) */
  cleanupLegacySymbols: () => { removed: number };

  /** Load symbols from file and merge with localStorage */
  loadFromFile: () => Promise<{ success: boolean; count: number; error?: string }>;

  /** Save current symbols to file */
  saveToFile: () => Promise<{ success: boolean; error?: string }>;

  /** Start watching for changes to auto-save to file */
  startAutoSync: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RECENTLY_USED = 10;
const STORAGE_KEY = 'flowmark_custom_symbols';

// ============================================================================
// Initial State
// ============================================================================

const initialState: CustomSymbolState = {
  customSymbols: {},
  symbolOverrides: {},
  favorites: [],
  recentlyUsed: [],
  isLoadedFromFile: false,
};

// ============================================================================
// Store
// ============================================================================

export const useCustomSymbolStore = create<CustomSymbolState & CustomSymbolActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Initialize default symbols (essential symbols like pipe corner)
      initializeDefaultSymbols: () => {
        // Default Pipe Corner symbol - essential for pipe routing
        const pipeCorner: SymbolDefinition = {
          id: 'piping:corner',
          category: 'corners',
          name: 'pipeCorner',
          displayName: 'Pipe Corner',
          description: 'Routing waypoint for pipe direction changes',
          standard: 'ISA',
          kksEquipmentCode: '',
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
              name: 'port1',
              relativePosition: { x: 0, y: 0.5 },
              direction: 'bidirectional',
              defaultAngle: 180,
              allowedConnections: ['pipe'],
            },
            {
              id: 'port2',
              name: 'port2',
              relativePosition: { x: 1, y: 0.5 },
              direction: 'bidirectional',
              defaultAngle: 0,
              allowedConnections: ['pipe'],
            },
            {
              id: 'port3',
              name: 'port3',
              relativePosition: { x: 0.5, y: 0 },
              direction: 'bidirectional',
              defaultAngle: 270,
              allowedConnections: ['pipe'],
            },
            {
              id: 'port4',
              name: 'port4',
              relativePosition: { x: 0.5, y: 1 },
              direction: 'bidirectional',
              defaultAngle: 90,
              allowedConnections: ['pipe'],
            },
          ],

          labels: [],

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

        // Add pipe corner if it doesn't exist
        set((state) => {
          if (!state.customSymbols['piping:corner']) {
            state.customSymbols['piping:corner'] = pipeCorner;
            console.log('Added default Pipe Corner symbol');
          }
        });
      },

      addCustomSymbol: (symbol) => {
        const state = get();
        if (state.customSymbols[symbol.id]) {
          console.error(`Symbol with ID ${symbol.id} already exists`);
          alert(`Error: Symbol with ID "${symbol.id}" already exists.\nPlease use a different ID.`);
          return false;
        }
        set((state) => {
          state.customSymbols[symbol.id] = symbol;
        });
        return true;
      },

      updateCustomSymbol: (id, updates) => set((state) => {
        if (!state.customSymbols[id]) {
          console.warn(`Custom symbol ${id} not found, cannot update`);
          return;
        }
        Object.assign(state.customSymbols[id], updates);
      }),

      deleteCustomSymbol: (id) => set((state) => {
        delete state.customSymbols[id];
        state.favorites = state.favorites.filter((f) => f !== id);
        state.recentlyUsed = state.recentlyUsed.filter((r) => r !== id);
      }),

      duplicateSymbol: (sourceId, newId, newName) => {
        const { customSymbols, symbolOverrides } = get();

        // Find source symbol (check custom first, then we'd need access to built-in)
        let source = customSymbols[sourceId];

        if (!source) {
          // Try to get from SymbolRegistry (import dynamically to avoid circular dep)
          import('../data/symbols/SymbolRegistry').then(({ SymbolRegistry }) => {
            source = SymbolRegistry.getSymbol(sourceId);
            if (source) {
              set((state) => {
                const newSymbol: SymbolDefinition = {
                  ...source,
                  id: newId,
                  name: newName,
                  displayName: newName,
                };

                // Apply any overrides
                if (symbolOverrides[sourceId]) {
                  Object.assign(newSymbol, symbolOverrides[sourceId]);
                }

                state.customSymbols[newId] = newSymbol;
              });
            }
          });
          return;
        }

        set((state) => {
          const newSymbol: SymbolDefinition = {
            ...source,
            id: newId,
            name: newName,
            displayName: newName,
          };
          state.customSymbols[newId] = newSymbol;
        });
      },

      setSymbolOverride: (id, override) => set((state) => {
        state.symbolOverrides[id] = {
          ...state.symbolOverrides[id],
          ...override,
        };
      }),

      clearSymbolOverride: (id) => set((state) => {
        delete state.symbolOverrides[id];
      }),

      toggleFavorite: (id) => set((state) => {
        const index = state.favorites.indexOf(id);
        if (index === -1) {
          state.favorites.push(id);
        } else {
          state.favorites.splice(index, 1);
        }
      }),

      addToRecentlyUsed: (id) => set((state) => {
        // Remove if already in list
        state.recentlyUsed = state.recentlyUsed.filter((r) => r !== id);
        // Add to front
        state.recentlyUsed.unshift(id);
        // Trim to max
        if (state.recentlyUsed.length > MAX_RECENTLY_USED) {
          state.recentlyUsed = state.recentlyUsed.slice(0, MAX_RECENTLY_USED);
        }
      }),

      importSymbols: (symbols) => {
        let added = 0;
        let skipped = 0;

        set((state) => {
          for (const symbol of symbols) {
            if (state.customSymbols[symbol.id]) {
              skipped++;
            } else {
              state.customSymbols[symbol.id] = symbol;
              added++;
            }
          }
        });

        return { added, skipped };
      },

      exportSymbols: (ids) => {
        const { customSymbols } = get();

        const symbolsToExport = ids
          ? ids.map((id) => customSymbols[id]).filter(Boolean)
          : Object.values(customSymbols);

        return JSON.stringify(
          {
            version: '1.0.0',
            application: 'FlowMark',
            type: 'symbol-library',
            exportedAt: new Date().toISOString(),
            symbols: symbolsToExport,
          },
          null,
          2
        );
      },

      clearAll: () => set((state) => {
        state.customSymbols = {};
        state.symbolOverrides = {};
        state.favorites = [];
        state.recentlyUsed = [];
      }),

      getSymbol: (id) => {
        const { customSymbols, symbolOverrides } = get();

        // Check custom symbols first
        if (customSymbols[id]) {
          return customSymbols[id];
        }

        // For built-in symbols with overrides, we'd need to merge
        // This is handled at render time via SymbolRegistry
        return undefined;
      },

      isIdAvailable: (id) => {
        const { customSymbols } = get();
        return !customSymbols[id];
      },

      renameSymbol: (oldId, newName) => {
        const { customSymbols } = get();
        const symbol = customSymbols[oldId];

        if (!symbol) {
          console.warn(`[customSymbolStore] Symbol ${oldId} not found for rename`);
          return { newId: oldId, success: false };
        }

        // Generate new ID from name (sanitize: lowercase, replace spaces with dashes)
        const sanitizedName = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newId = `custom:${sanitizedName}`;

        // If ID hasn't changed, just update the name
        if (newId === oldId) {
          set((state) => {
            state.customSymbols[oldId].name = newName;
            state.customSymbols[oldId].displayName = newName;
          });
          return { newId: oldId, success: true };
        }

        // Check if new ID already exists
        if (customSymbols[newId]) {
          console.warn(`[customSymbolStore] Symbol with ID ${newId} already exists`);
          alert(`A symbol with the name "${newName}" already exists. Please choose a different name.`);
          return { newId: oldId, success: false };
        }

        // Create symbol with new ID
        set((state) => {
          const updatedSymbol: SymbolDefinition = {
            ...symbol,
            id: newId,
            name: newName,
            displayName: newName,
          };

          // Add with new ID
          state.customSymbols[newId] = updatedSymbol;

          // Delete old ID
          delete state.customSymbols[oldId];

          // Update favorites
          const favIndex = state.favorites.indexOf(oldId);
          if (favIndex !== -1) {
            state.favorites[favIndex] = newId;
          }

          // Update recentlyUsed
          const recentIndex = state.recentlyUsed.indexOf(oldId);
          if (recentIndex !== -1) {
            state.recentlyUsed[recentIndex] = newId;
          }
        });

        console.log(`[customSymbolStore] Renamed symbol: ${oldId} -> ${newId}`);
        return { newId, success: true };
      },

      migrateToNameBasedIds: () => {
        const { customSymbols } = get();
        const oldToNewMap: Record<string, string> = {};
        let migrated = 0;

        // Get all symbol entries
        const entries = Object.entries(customSymbols);

        for (const [oldId, symbol] of entries) {
          // Generate the correct ID from displayName
          const name = symbol.displayName || symbol.name;
          if (!name) continue;

          const sanitizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const expectedId = `custom:${sanitizedName}`;

          // Skip if ID is already correct
          if (oldId === expectedId) {
            console.log(`[customSymbolStore] Symbol "${name}" already has correct ID: ${oldId}`);
            continue;
          }

          // Skip special terminal symbols - they have their own naming convention
          if (oldId.startsWith('terminals:')) {
            console.log(`[customSymbolStore] Skipping terminal symbol: ${oldId}`);
            continue;
          }

          // Check if target ID already exists
          if (customSymbols[expectedId] && oldId !== expectedId) {
            // Add a suffix to make it unique
            let counter = 2;
            let uniqueId = `${expectedId}-${counter}`;
            while (customSymbols[uniqueId]) {
              counter++;
              uniqueId = `${expectedId}-${counter}`;
            }
            oldToNewMap[oldId] = uniqueId;
            console.log(`[customSymbolStore] Migrating "${name}": ${oldId} -> ${uniqueId} (conflict resolved)`);
          } else {
            oldToNewMap[oldId] = expectedId;
            console.log(`[customSymbolStore] Migrating "${name}": ${oldId} -> ${expectedId}`);
          }
        }

        // Apply migrations
        set((state) => {
          for (const [oldId, newId] of Object.entries(oldToNewMap)) {
            const symbol = state.customSymbols[oldId];
            if (!symbol) continue;

            // Create symbol with new ID
            state.customSymbols[newId] = {
              ...symbol,
              id: newId,
            };

            // Delete old entry
            delete state.customSymbols[oldId];

            // Update favorites
            const favIndex = state.favorites.indexOf(oldId);
            if (favIndex !== -1) {
              state.favorites[favIndex] = newId;
            }

            // Update recentlyUsed
            const recentIndex = state.recentlyUsed.indexOf(oldId);
            if (recentIndex !== -1) {
              state.recentlyUsed[recentIndex] = newId;
            }

            migrated++;
          }
        });

        console.log(`[customSymbolStore] Migration complete: ${migrated} symbols migrated`);
        return { migrated, oldToNewMap };
      },

      migrateSymbolCoordinates: (symbolId) => {
        const { customSymbols } = get();
        const symbol = customSymbols[symbolId];

        if (!symbol || !symbol.paths || symbol.paths.length === 0) {
          return false;
        }

        try {
          // Calculate bounding box of all paths
          let minX = Infinity, minY = Infinity;
          let maxX = -Infinity, maxY = -Infinity;

          symbol.paths.forEach(path => {
            if (path.type === 'line') {
              const data = path.data as { x1: number; y1: number; x2: number; y2: number };
              minX = Math.min(minX, data.x1, data.x2);
              minY = Math.min(minY, data.y1, data.y2);
              maxX = Math.max(maxX, data.x1, data.x2);
              maxY = Math.max(maxY, data.y1, data.y2);
            } else if (path.type === 'rect') {
              const data = path.data as { x: number; y: number; width: number; height: number };
              minX = Math.min(minX, data.x);
              minY = Math.min(minY, data.y);
              maxX = Math.max(maxX, data.x + data.width);
              maxY = Math.max(maxY, data.y + data.height);
            } else if (path.type === 'circle') {
              const data = path.data as { cx: number; cy: number; r: number };
              minX = Math.min(minX, data.cx - data.r);
              minY = Math.min(minY, data.cy - data.r);
              maxX = Math.max(maxX, data.cx + data.r);
              maxY = Math.max(maxY, data.cy + data.r);
            } else if (path.type === 'polygon') {
              const data = path.data as { points: Array<{ x: number; y: number }> };
              data.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
              });
            }
          });

          // Calculate current dimensions
          const currentWidth = maxX - minX;
          const currentHeight = maxY - minY;

          if (currentWidth <= 0 || currentHeight <= 0) {
            return false;
          }

          // Normalize coordinates to 0-1 range while maintaining aspect ratio
          // Center the symbol in the 0-1 space
          const scale = Math.max(currentWidth, currentHeight);
          const offsetX = (1 - currentWidth / scale) / 2;
          const offsetY = (1 - currentHeight / scale) / 2;

          // Transform all paths
          const migratedPaths = symbol.paths.map(path => {
            const newPath = { ...path };

            if (path.type === 'line') {
              const data = path.data as { x1: number; y1: number; x2: number; y2: number };
              newPath.data = {
                x1: ((data.x1 - minX) / scale) + offsetX,
                y1: ((data.y1 - minY) / scale) + offsetY,
                x2: ((data.x2 - minX) / scale) + offsetX,
                y2: ((data.y2 - minY) / scale) + offsetY,
              };
            } else if (path.type === 'rect') {
              const data = path.data as { x: number; y: number; width: number; height: number };
              newPath.data = {
                x: ((data.x - minX) / scale) + offsetX,
                y: ((data.y - minY) / scale) + offsetY,
                width: data.width / scale,
                height: data.height / scale,
              };
            } else if (path.type === 'circle') {
              const data = path.data as { cx: number; cy: number; r: number };
              newPath.data = {
                cx: ((data.cx - minX) / scale) + offsetX,
                cy: ((data.cy - minY) / scale) + offsetY,
                r: data.r / scale,
              };
            } else if (path.type === 'polygon') {
              const data = path.data as { points: Array<{ x: number; y: number }> };
              newPath.data = {
                points: data.points.map(p => ({
                  x: ((p.x - minX) / scale) + offsetX,
                  y: ((p.y - minY) / scale) + offsetY,
                })),
              };
            }

            return newPath;
          });

          // Transform ports
          const migratedPorts = symbol.ports?.map(port => ({
            ...port,
            relativePosition: {
              x: ((port.relativePosition.x - minX) / scale) + offsetX,
              y: ((port.relativePosition.y - minY) / scale) + offsetY,
            },
          }));

          // Transform labels
          const migratedLabels = symbol.labels?.map(label => ({
            ...label,
            relativePosition: {
              x: ((label.relativePosition.x - minX) / scale) + offsetX,
              y: ((label.relativePosition.y - minY) / scale) + offsetY,
            },
          }));

          // Update the symbol
          set(state => {
            state.customSymbols[symbolId] = {
              ...symbol,
              paths: migratedPaths,
              ports: migratedPorts || [],
              labels: migratedLabels || symbol.labels || [],
            };
          });

          console.log(`Migrated symbol: ${symbolId}`);
          return true;
        } catch (error) {
          console.error(`Failed to migrate symbol ${symbolId}:`, error);
          return false;
        }
      },

      migrateAllSymbols: () => {
        const { customSymbols } = get();
        let migrated = 0;
        let failed = 0;

        Object.keys(customSymbols).forEach(symbolId => {
          const success = get().migrateSymbolCoordinates(symbolId);
          if (success) {
            migrated++;
          } else {
            failed++;
          }
        });

        console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
        return { migrated, failed };
      },

      // Remove symbols with legacy categories (not in KKS or special categories)
      cleanupLegacySymbols: () => {
        const validCategories: SymbolCategory[] = [
          // A - Aggregates
          'AA', 'AB', 'AC', 'AG', 'AH', 'AM', 'AN', 'AP', 'AT',
          // B - Devices
          'BB', 'BN', 'BP', 'BQ', 'BR', 'BS',
          // C - Sensors
          'CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT',
          // Special categories
          'terminals', 'corners',
        ];

        const { customSymbols } = get();
        let removed = 0;

        Object.entries(customSymbols).forEach(([symbolId, symbol]) => {
          if (!validCategories.includes(symbol.category)) {
            console.log(`Removing symbol with legacy category: ${symbolId} (${symbol.category})`);
            set((state) => {
              delete state.customSymbols[symbolId];
              state.favorites = state.favorites.filter((f) => f !== symbolId);
              state.recentlyUsed = state.recentlyUsed.filter((r) => r !== symbolId);
            });
            removed++;
          }
        });

        console.log(`Cleanup complete: ${removed} legacy symbols removed`);
        return { removed };
      },

      loadFromFile: async () => {
        const result = await StorageService.loadCustomSymbols();

        if (result.success && result.symbols) {
          const state = get();
          const hadLocalSymbols = Object.keys(state.customSymbols).length > 0;

          // Warn if we're replacing local symbols
          if (hadLocalSymbols && result.symbols.length > 0) {
            console.warn('[customSymbolStore] Replacing localStorage symbols with file version. Local changes may be lost.');
          }

          set((state) => {
            // File wins - replace localStorage symbols
            state.customSymbols = {};

            // Convert array to Record<string, SymbolDefinition>
            result.symbols!.forEach(symbol => {
              state.customSymbols[symbol.id] = symbol;
            });

            state.isLoadedFromFile = true;
          });

          console.log(`[customSymbolStore] Loaded ${result.symbols.length} symbols from file`);
          return { success: true, count: result.symbols.length };
        } else if (result.success && (!result.symbols || result.symbols.length === 0)) {
          // File doesn't exist or is empty - migrate localStorage to file
          const { customSymbols } = get();
          const symbolsArray = Object.values(customSymbols);

          if (symbolsArray.length > 0) {
            console.log(`[customSymbolStore] Migrating ${symbolsArray.length} symbols from localStorage to file`);
            await get().saveToFile();
          }

          set((state) => {
            state.isLoadedFromFile = true;
          });

          return { success: true, count: symbolsArray.length };
        } else {
          console.error('[customSymbolStore] Failed to load from file:', result.error);
          return { success: false, count: 0, error: result.error };
        }
      },

      saveToFile: async () => {
        const { customSymbols } = get();
        const symbolsArray = Object.values(customSymbols);

        const result = await StorageService.saveCustomSymbols(symbolsArray);

        if (result.success) {
          console.log(`[customSymbolStore] Saved ${symbolsArray.length} symbols to file`);
        } else {
          console.error('[customSymbolStore] Failed to save to file:', result.error);
        }

        return result;
      },

      startAutoSync: () => {
        let saveTimeout: NodeJS.Timeout | null = null;
        const DEBOUNCE_MS = 3000; // 3 seconds, matching diagram auto-save

        // Subscribe to store changes
        useCustomSymbolStore.subscribe((state, prevState) => {
          // Only auto-save if loaded from file (prevents save on initial load)
          if (!state.isLoadedFromFile) return;

          // Check if customSymbols changed
          if (state.customSymbols !== prevState.customSymbols) {
            // Clear existing timeout
            if (saveTimeout) {
              clearTimeout(saveTimeout);
            }

            // Debounce save
            saveTimeout = setTimeout(() => {
              console.log('[customSymbolStore] Auto-saving symbols to file...');
              get().saveToFile();
            }, DEBOUNCE_MS);
          }
        });
      },
    })),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        customSymbols: state.customSymbols,
        symbolOverrides: state.symbolOverrides,
        favorites: state.favorites,
        recentlyUsed: state.recentlyUsed,
        // Don't persist isLoadedFromFile - it's runtime only
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCustomSymbols = (state: CustomSymbolState) =>
  Object.values(state.customSymbols);

export const selectCustomSymbolsByCategory = (category: SymbolCategory) =>
  (state: CustomSymbolState) =>
    Object.values(state.customSymbols).filter((s) => s.category === category);

export const selectFavorites = (state: CustomSymbolState) => state.favorites;

export const selectRecentlyUsed = (state: CustomSymbolState) => state.recentlyUsed;

export const selectHasOverride = (id: string) => (state: CustomSymbolState) =>
  !!state.symbolOverrides[id];

export default useCustomSymbolStore;
