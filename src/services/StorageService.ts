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

  // ========== Media Operations ==========

  /**
   * Save a media file (image) to the system's media folder
   */
  async saveMedia(systemKks: string, filename: string, data: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const response = await fetch('/api/storage/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemKks, filename, data }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[StorageService] Saved media: ${systemKks}/media/${filename}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save media failed';
      console.error('[StorageService] Save media error:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Load a media file from the system's media folder
   */
  async loadMedia(systemKks: string, filename: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const response = await fetch(`/api/storage/media?systemKks=${encodeURIComponent(systemKks)}&filename=${encodeURIComponent(filename)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Load media failed';
      console.error('[StorageService] Load media error:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get the URL for a media file (for use in img src)
   */
  getMediaUrl(systemKks: string, filename: string): string {
    return `/api/storage/media/file?systemKks=${encodeURIComponent(systemKks)}&filename=${encodeURIComponent(filename)}`;
  }

  /**
   * List all media files for a system
   */
  async listMedia(systemKks: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      const response = await fetch(`/api/storage/media/list?systemKks=${encodeURIComponent(systemKks)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'List media failed';
      console.error('[StorageService] List media error:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Delete a media file from the system's media folder
   */
  async deleteMedia(systemKks: string, filename: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/storage/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemKks, filename }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[StorageService] Deleted media: ${systemKks}/media/${filename}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Delete media failed';
      console.error('[StorageService] Delete media error:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Extract media filenames from HTML content that reference our media API
   */
  extractMediaFilenamesFromHtml(htmlContent: string): string[] {
    if (!htmlContent) return [];

    const filenames: string[] = [];
    // Match URLs like /api/storage/media/file?systemKks=...&filename=...
    const mediaUrlRegex = /\/api\/storage\/media\/file\?[^"'\s]*filename=([^"'\s&]+)/g;

    let match;
    while ((match = mediaUrlRegex.exec(htmlContent)) !== null) {
      const encodedFilename = match[1];
      try {
        filenames.push(decodeURIComponent(encodedFilename));
      } catch {
        filenames.push(encodedFilename);
      }
    }

    return filenames;
  }

  /**
   * Clean up orphaned media files that are no longer referenced in the diagram.
   * Compares files in the media folder against files referenced in component descriptions.
   */
  async cleanupOrphanedMedia(systemKks: string, diagram: Diagram): Promise<{ success: boolean; deleted: string[]; error?: string }> {
    try {
      // Get all media files in the folder
      const listResult = await this.listMedia(systemKks);
      if (!listResult.success || !listResult.files) {
        return { success: true, deleted: [] };
      }

      const existingFiles = new Set(listResult.files);

      // Collect all referenced media files from component descriptions
      const referencedFiles = new Set<string>();

      for (const component of Object.values(diagram.components)) {
        const description = (component.properties as Record<string, unknown>)?.description as string | undefined;
        if (description) {
          const filenames = this.extractMediaFilenamesFromHtml(description);
          filenames.forEach(f => referencedFiles.add(f));
        }
      }

      // Find orphaned files (exist in folder but not referenced in descriptions)
      const orphanedFiles = [...existingFiles].filter(f => !referencedFiles.has(f));

      // Delete orphaned files
      const deleted: string[] = [];
      for (const filename of orphanedFiles) {
        const deleteResult = await this.deleteMedia(systemKks, filename);
        if (deleteResult.success) {
          deleted.push(filename);
        }
      }

      return { success: true, deleted };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Cleanup failed';
      return { success: false, deleted: [], error: errorMsg };
    }
  }

  /**
   * Extract base64 images from HTML description and save them as files.
   * Returns the HTML with base64 replaced by file references.
   */
  async processDescriptionMedia(
    systemKks: string,
    componentKks: string,
    htmlContent: string
  ): Promise<{ html: string; savedFiles: string[] }> {
    if (!htmlContent) return { html: htmlContent, savedFiles: [] };

    const savedFiles: string[] = [];
    let processedHtml = htmlContent;

    // Find all base64 images in the HTML
    const base64Regex = /src="(data:image\/(png|jpeg|jpg|gif|webp);base64,[^"]+)"/g;
    const matches = [...htmlContent.matchAll(base64Regex)];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const base64Data = match[1];
      const imageType = match[2];

      // Generate unique filename based on component KKS and timestamp
      const safeComponentKks = componentKks.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const filename = `${safeComponentKks}_${timestamp}_${i}.${imageType === 'jpeg' ? 'jpg' : imageType}`;

      // Save the image
      const result = await this.saveMedia(systemKks, filename, base64Data);

      if (result.success && result.path) {
        // Replace base64 with file URL in HTML
        const mediaUrl = this.getMediaUrl(systemKks, filename);
        processedHtml = processedHtml.replace(base64Data, mediaUrl);
        savedFiles.push(filename);
        console.log(`[StorageService] Converted base64 image to file: ${filename}`);
      }
    }

    return { html: processedHtml, savedFiles };
  }

  /**
   * Process all component descriptions in a diagram before saving.
   * Extracts base64 images and saves them as files.
   */
  async processDiagramMedia(systemKks: string, diagram: Diagram): Promise<Diagram> {
    const processedDiagram = { ...diagram, components: { ...diagram.components } };

    for (const [kks, component] of Object.entries(diagram.components)) {
      const description = (component.properties as Record<string, unknown>)?.description as string | undefined;

      if (description && description.includes('data:image')) {
        const { html } = await this.processDescriptionMedia(systemKks, kks, description);

        processedDiagram.components[kks] = {
          ...component,
          properties: {
            ...(component.properties || {}),
            description: html,
          },
        };
      }
    }

    return processedDiagram;
  }
}

// Export singleton instance
export const StorageService = new StorageServiceClass();
export default StorageService;
