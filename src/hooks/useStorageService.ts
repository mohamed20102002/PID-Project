/**
 * Storage Service Hook
 *
 * Provides integration between StorageService and React components.
 * Handles auto-save and status updates.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { StorageService, StorageStatus } from '../services/StorageService';
import { useDiagramStore } from '../store/diagramStore';

interface UseStorageServiceOptions {
  autoSaveInterval?: number; // milliseconds, default 3000
  enabled?: boolean;
}

interface UseStorageServiceReturn {
  status: StorageStatus;
  isSaving: boolean;
  lastSaveTime: number | null;
  saveError: string | null;
  saveNow: () => Promise<void>;
}

export function useStorageService(options: UseStorageServiceOptions = {}): UseStorageServiceReturn {
  const { autoSaveInterval = 3000, enabled = true } = options;

  const [status, setStatus] = useState<StorageStatus>(StorageService.getStatus());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get store data
  const diagram = useDiagramStore((state) => state.diagram);
  const isDirty = useDiagramStore((state) => state.isDirty);
  const saveCurrentDiagram = useDiagramStore((state) => state.saveCurrentDiagram);

  // Subscribe to storage status changes
  useEffect(() => {
    const unsubscribe = StorageService.subscribe(setStatus);
    return unsubscribe;
  }, []);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (!diagram) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveCurrentDiagram();
      if (result.success) {
        setLastSaveTime(Date.now());
      } else {
        setSaveError(result.error || 'Save failed');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [diagram, saveCurrentDiagram]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !diagram || !isDirty) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      const result = await saveCurrentDiagram();
      setIsSaving(false);

      if (result.success) {
        setLastSaveTime(Date.now());
        setSaveError(null);
      } else {
        setSaveError(result.error || 'Auto-save failed');
        console.warn('[useStorageService] Auto-save failed:', result.error);
      }
    }, autoSaveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, diagram, isDirty, autoSaveInterval, saveCurrentDiagram]);

  return {
    status,
    isSaving,
    lastSaveTime,
    saveError,
    saveNow,
  };
}

export default useStorageService;
