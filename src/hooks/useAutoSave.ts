/**
 * Auto-Save Hook
 *
 * Automatically saves the diagram to localStorage when changes are detected.
 * Uses debouncing to prevent excessive saves.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  hasAutoSave,
  getAutoSaveTimestamp,
  clearLocalStorage,
} from '../utils/fileIO';

interface AutoSaveOptions {
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
  /** Callback when auto-save completes */
  onSave?: (success: boolean) => void;
}

interface AutoSaveState {
  /** Whether auto-save is enabled */
  isEnabled: boolean;
  /** Last save timestamp */
  lastSaveTime: string | null;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
}

interface AutoSaveActions {
  /** Manually trigger a save */
  saveNow: () => Promise<boolean>;
  /** Enable/disable auto-save */
  setEnabled: (enabled: boolean) => void;
  /** Load the auto-saved diagram */
  loadAutoSave: () => { success: boolean; error?: string };
  /** Check if there's an auto-save available */
  checkAutoSave: () => { exists: boolean; timestamp?: string };
  /** Clear the auto-save */
  clearAutoSave: () => void;
}

/**
 * Hook for auto-saving diagrams to localStorage
 */
export const useAutoSave = (
  options: AutoSaveOptions = {}
): AutoSaveState & AutoSaveActions => {
  const { debounceMs = 2000, enabled = true, onSave } = options;

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const diagram = useDiagramStore((state) => state.diagram);
  const isDirty = useDiagramStore((state) => state.isDirty);
  const loadDiagram = useDiagramStore((state) => state.loadDiagram);

  // Perform save
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!diagram) return false;

    setIsSaving(true);
    try {
      const success = saveToLocalStorage(diagram);
      if (success) {
        setLastSaveTime(new Date().toISOString());
      }
      onSave?.(success);
      return success;
    } finally {
      setIsSaving(false);
    }
  }, [diagram, onSave]);

  // Debounced save on changes
  useEffect(() => {
    if (!isEnabled || !isDirty || !diagram) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isEnabled, isDirty, diagram, debounceMs, performSave]);

  // Initialize last save time from storage
  useEffect(() => {
    const timestamp = getAutoSaveTimestamp();
    if (timestamp) {
      setLastSaveTime(timestamp);
    }
  }, []);

  // Manual save
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    return performSave();
  }, [performSave]);

  // Load auto-saved diagram
  const loadAutoSave = useCallback((): { success: boolean; error?: string } => {
    const result = loadFromLocalStorage();
    if (result.success && result.diagram) {
      loadDiagram(result.diagram);
      if (result.timestamp) {
        setLastSaveTime(result.timestamp);
      }
      return { success: true };
    }
    return { success: false, error: result.error };
  }, [loadDiagram]);

  // Check if auto-save exists
  const checkAutoSave = useCallback((): { exists: boolean; timestamp?: string } => {
    const exists = hasAutoSave();
    const timestamp = getAutoSaveTimestamp() || undefined;
    return { exists, timestamp };
  }, []);

  // Clear auto-save
  const clearAutoSave = useCallback((): void => {
    clearLocalStorage();
    setLastSaveTime(null);
  }, []);

  return {
    isEnabled,
    lastSaveTime,
    hasUnsavedChanges: isDirty,
    isSaving,
    saveNow,
    setEnabled: setIsEnabled,
    loadAutoSave,
    checkAutoSave,
    clearAutoSave,
  };
};

export default useAutoSave;
