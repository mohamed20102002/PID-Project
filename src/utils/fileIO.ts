/**
 * File I/O Utilities
 *
 * Handles saving and loading diagram files using the File System Access API
 * with fallback to download/upload for browsers without support.
 */

import { Diagram } from '../types/diagram.types';
import { validateSaveFile, SaveFile } from '../schemas/diagram.schema';

// ============================================================================
// Constants
// ============================================================================

const FILE_EXTENSION = '.flowmark';
const MIME_TYPE = 'application/json';
const APP_NAME = 'FlowMark';
const CURRENT_VERSION = '1.0.0';

// ============================================================================
// File System Access API Support Detection
// ============================================================================

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

// ============================================================================
// Save Functions
// ============================================================================

/**
 * Create a save file object from diagram
 */
export function createSaveFile(diagram: Diagram): SaveFile {
  return {
    version: CURRENT_VERSION,
    application: APP_NAME as 'FlowMark',
    exportedAt: new Date().toISOString(),
    diagram,
  };
}

/**
 * Save diagram to file using File System Access API
 */
export async function saveToFile(diagram: Diagram): Promise<{ success: boolean; filename?: string; error?: string }> {
  const saveFile = createSaveFile(diagram);
  const jsonContent = JSON.stringify(saveFile, null, 2);

  if (isFileSystemAccessSupported()) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: `${diagram.name || 'diagram'}${FILE_EXTENSION}`,
        types: [
          {
            description: 'FlowMark Diagram',
            accept: { [MIME_TYPE]: [FILE_EXTENSION] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(jsonContent);
      await writable.close();

      return { success: true, filename: handle.name };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, error: 'Save cancelled' };
      }
      return { success: false, error: (err as Error).message };
    }
  }

  // Fallback: Download file
  return downloadFile(jsonContent, `${diagram.name || 'diagram'}${FILE_EXTENSION}`);
}

/**
 * Download file (fallback for browsers without File System Access API)
 */
function downloadFile(content: string, filename: string): { success: boolean; filename: string } {
  const blob = new Blob([content], { type: MIME_TYPE });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  return { success: true, filename };
}

// ============================================================================
// Load Functions
// ============================================================================

/**
 * Load diagram from file using File System Access API
 */
export async function loadFromFile(): Promise<{
  success: boolean;
  diagram?: Diagram;
  filename?: string;
  error?: string;
}> {
  if (isFileSystemAccessSupported()) {
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (options: {
          types: { description: string; accept: Record<string, string[]> }[];
          multiple: boolean;
        }) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [
          {
            description: 'FlowMark Diagram',
            accept: { [MIME_TYPE]: [FILE_EXTENSION, '.json'] },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const content = await file.text();

      return parseAndValidateFile(content, file.name);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, error: 'Open cancelled' };
      }
      return { success: false, error: (err as Error).message };
    }
  }

  // Fallback: File input dialog
  return openFileDialog();
}

/**
 * Open file dialog (fallback for browsers without File System Access API)
 */
function openFileDialog(): Promise<{
  success: boolean;
  diagram?: Diagram;
  filename?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${FILE_EXTENSION},.json`;
    input.style.display = 'none';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ success: false, error: 'No file selected' });
        return;
      }

      try {
        const content = await file.text();
        resolve(parseAndValidateFile(content, file.name));
      } catch (err) {
        resolve({ success: false, error: (err as Error).message });
      }
    };

    input.oncancel = () => {
      resolve({ success: false, error: 'Open cancelled' });
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Parse and validate file content
 */
function parseAndValidateFile(
  content: string,
  filename: string
): { success: boolean; diagram?: Diagram; filename?: string; error?: string } {
  let data: unknown;

  try {
    data = JSON.parse(content);
  } catch {
    return { success: false, error: 'Invalid JSON format' };
  }

  // Validate file format with error handling
  try {
    let diagram: Diagram;

    // Try to validate as SaveFile format first
    const validation = validateSaveFile(data);

    if (validation.success) {
      diagram = validation.data!.diagram as Diagram;
    } else {
      // Try to load as raw diagram (older export format)
      const rawData = data as any;
      if (rawData.kks && rawData.components && rawData.connections) {
        console.log('[fileIO] Loading as raw diagram format (not wrapped in SaveFile)');
        diagram = rawData as Diagram;
      } else if (rawData.diagram && rawData.diagram.kks) {
        // Has diagram wrapper but failed validation - try to use it anyway
        console.log('[fileIO] Loading diagram despite validation errors');
        diagram = rawData.diagram as Diagram;
      } else {
        const errorMessages = validation.errors?.join('\n') || 'Unknown validation error';
        return {
          success: false,
          error: `Invalid file format:\n${errorMessages}`,
        };
      }
    }

    // Ensure buildings exists (may be missing in older exports)
    if (!diagram.buildings) {
      (diagram as any).buildings = {};
    }

    // Ensure metadata.tags is an array
    if (diagram.metadata && !Array.isArray(diagram.metadata.tags)) {
      (diagram.metadata as any).tags = [];
    }

    // Ensure components exists and is an object
    if (!diagram.components || typeof diagram.components !== 'object') {
      (diagram as any).components = {};
    }

    // Ensure connections exists and is an object
    if (!diagram.connections || typeof diagram.connections !== 'object') {
      (diagram as any).connections = {};
    }

    // Ensure all components have ports array
    Object.values(diagram.components).forEach((comp: any) => {
      if (!comp.ports || !Array.isArray(comp.ports)) {
        comp.ports = [];
      }
    });

    // Ensure all connections have waypoints array
    Object.values(diagram.connections).forEach((conn: any) => {
      if (!conn.waypoints || !Array.isArray(conn.waypoints)) {
        conn.waypoints = [];
      }
      if (conn.isCrossSystem === undefined) {
        conn.isCrossSystem = false;
      }
    });

    return {
      success: true,
      diagram,
      filename,
    };
  } catch (err) {
    console.error('[fileIO] Validation error:', err);
    return {
      success: false,
      error: `Error processing file: ${(err as Error).message}`
    };
  }
}

// ============================================================================
// LocalStorage Functions
// ============================================================================

const STORAGE_KEY = 'flowmark_autosave';
const STORAGE_TIMESTAMP_KEY = 'flowmark_autosave_timestamp';

/**
 * Save diagram to localStorage (auto-save)
 */
export function saveToLocalStorage(diagram: Diagram): boolean {
  try {
    const saveFile = createSaveFile(diagram);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveFile));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
    return true;
  } catch (err) {
    console.error('Auto-save failed:', err);
    return false;
  }
}

/**
 * Load diagram from localStorage
 */
export function loadFromLocalStorage(): {
  success: boolean;
  diagram?: Diagram;
  timestamp?: string;
  error?: string;
} {
  try {
    const content = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    if (!content) {
      return { success: false, error: 'No auto-save found' };
    }

    const data = JSON.parse(content);
    const validation = validateSaveFile(data);

    if (!validation.success) {
      return {
        success: false,
        error: `Invalid auto-save data:\n${validation.errors?.join('\n')}`,
      };
    }

    return {
      success: true,
      diagram: validation.data!.diagram as Diagram,
      timestamp: timestamp || undefined,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Clear auto-save from localStorage
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
}

/**
 * Check if auto-save exists
 */
export function hasAutoSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Get auto-save timestamp
 */
export function getAutoSaveTimestamp(): string | null {
  return localStorage.getItem(STORAGE_TIMESTAMP_KEY);
}

// ============================================================================
// Recent Files
// ============================================================================

const RECENT_FILES_KEY = 'flowmark_recent_files';
const MAX_RECENT_FILES = 10;

interface RecentFile {
  name: string;
  path?: string;
  lastOpened: string;
}

/**
 * Add file to recent files list
 */
export function addRecentFile(name: string, path?: string): void {
  const recent = getRecentFiles();

  // Remove existing entry with same name
  const filtered = recent.filter((f) => f.name !== name);

  // Add to front
  filtered.unshift({
    name,
    path,
    lastOpened: new Date().toISOString(),
  });

  // Keep only MAX_RECENT_FILES
  const trimmed = filtered.slice(0, MAX_RECENT_FILES);

  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
}

/**
 * Get recent files list
 */
export function getRecentFiles(): RecentFile[] {
  try {
    const data = localStorage.getItem(RECENT_FILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Clear recent files list
 */
export function clearRecentFiles(): void {
  localStorage.removeItem(RECENT_FILES_KEY);
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export diagram as JSON string
 */
export function exportAsJSON(diagram: Diagram, pretty = true): string {
  const saveFile = createSaveFile(diagram);
  return JSON.stringify(saveFile, null, pretty ? 2 : undefined);
}

/**
 * Import diagram from JSON string
 */
export function importFromJSON(json: string): {
  success: boolean;
  diagram?: Diagram;
  error?: string;
} {
  return parseAndValidateFile(json, 'imported.flowmark');
}
