/**
 * Storage Service
 *
 * Handles saving/loading diagram data to the project's data folder.
 * Uses API endpoints provided by vite-plugin-storage.
 *
 * Data structure in project folder:
 *   ./data/
 *   ├── plant.json           (plant hierarchy data)
 *   └── systems/
 *       ├── {systemKks}/
 *       │   └── diagram.json
 *       └── ...
 */

import type { Diagram } from '../types';
import type { Plant } from '../types/kks.types';
import type { SymbolDefinition } from '../types/symbol.types';

export interface StorageStatus {
  isReady: boolean;
  lastSave: number | null;
  error: string | null;
}

class StorageServiceClass {
  private status: StorageStatus = {
    isReady: true,
    lastSave: null,
    error: null,
  };

  private subscribers: Set<(status: StorageStatus) => void> = new Set();

  // Subscribe to status changes
  subscribe(callback: (status: StorageStatus) => void): () => void {
    this.subscribers.add(callback);
    callback(this.status);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.status));
  }

  private updateStatus(updates: Partial<StorageStatus>) {
    this.status = { ...this.status, ...updates };
    this.notifySubscribers();
  }

  getStatus(): StorageStatus {
    return this.status;
  }

  // ========== Diagram Operations ==========

  async saveDiagram(systemKks: string, diagram: Diagram): Promise<{ success: boolean; error?: string }> {
    if (!systemKks) {
      return { success: false, error: 'Invalid systemKks' };
    }

    try {
      const response = await fetch('/api/storage/diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemKks, diagram }),
      });

      const result = await response.json();

      if (result.success) {
        this.updateStatus({ lastSave: Date.now(), error: null });
        console.log(`[StorageService] Saved diagram: ${systemKks}`);
      } else {
        this.updateStatus({ error: result.error });
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save failed';
      this.updateStatus({ error: errorMsg });
      console.error('[StorageService] Save error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async loadDiagram(systemKks: string): Promise<{ success: boolean; diagram?: Diagram; error?: string }> {
    if (!systemKks) {
      return { success: false, error: 'Invalid systemKks' };
    }

    try {
      const response = await fetch(`/api/storage/diagram?systemKks=${encodeURIComponent(systemKks)}`);
      const result = await response.json();

      if (result.success) {
        console.log(`[StorageService] Loaded diagram: ${systemKks}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load failed';
      console.error('[StorageService] Load error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async listSystems(): Promise<{ success: boolean; systems?: string[]; error?: string }> {
    try {
      const response = await fetch('/api/storage/systems');
      const result = await response.json();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'List failed';
      console.error('[StorageService] List error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async deleteSystem(systemKks: string): Promise<{ success: boolean; error?: string }> {
    if (!systemKks) {
      return { success: false, error: 'Invalid systemKks' };
    }

    try {
      const response = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemKks }),
      });

      const result = await response.json();
      console.log(`[StorageService] Deleted system: ${systemKks}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Delete failed';
      console.error('[StorageService] Delete error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async renameSystem(oldKks: string, newKks: string): Promise<{ success: boolean; error?: string; message?: string }> {
    if (!oldKks || !newKks) {
      return { success: false, error: 'Invalid oldKks or newKks' };
    }

    try {
      const response = await fetch('/api/storage/rename-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldKks, newKks }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[StorageService] Renamed system: ${oldKks} -> ${newKks}`, result.message || '');
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Rename failed';
      console.error('[StorageService] Rename error:', error);
      return { success: false, error: errorMsg };
    }
  }

  // ========== Plant Operations ==========

  async savePlant(plant: Plant): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/storage/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plant }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[StorageService] Saved plant data');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save plant failed';
      console.error('[StorageService] Save plant error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async loadPlant(): Promise<{ success: boolean; plant?: Plant; error?: string }> {
    try {
      const response = await fetch('/api/storage/plant');
      const result = await response.json();

      if (result.success) {
        console.log('[StorageService] Loaded plant data');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load plant failed';
      console.error('[StorageService] Load plant error:', error);
      return { success: false, error: errorMsg };
    }
  }

  // ========== Custom Symbols Operations ==========

  async saveCustomSymbols(symbols: SymbolDefinition[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/storage/custom-symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[StorageService] Saved ${symbols.length} custom symbols`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save custom symbols failed';
      console.error('[StorageService] Save custom symbols error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async loadCustomSymbols(): Promise<{ success: boolean; symbols?: SymbolDefinition[]; error?: string }> {
    try {
      const response = await fetch('/api/storage/custom-symbols');
      const result = await response.json();

      if (result.success) {
        console.log(`[StorageService] Loaded ${result.symbols?.length || 0} custom symbols`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load custom symbols failed';
      console.error('[StorageService] Load custom symbols error:', error);
      return { success: false, error: errorMsg };
    }
  }

  // ========== App Settings Operations ==========

  async saveSettings(settings: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/storage/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[StorageService] Saved app settings');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save settings failed';
      console.error('[StorageService] Save settings error:', error);
      return { success: false, error: errorMsg };
    }
  }

  async loadSettings(): Promise<{ success: boolean; settings?: Record<string, unknown> | null; error?: string }> {
    try {
      const response = await fetch('/api/storage/settings');
      const result = await response.json();

      if (result.success && result.settings) {
        console.log('[StorageService] Loaded app settings');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load settings failed';
      console.error('[StorageService] Load settings error:', error);
      return { success: false, error: errorMsg };
    }
  }
}

// Export singleton instance
export const StorageService = new StorageServiceClass();
export default StorageService;
