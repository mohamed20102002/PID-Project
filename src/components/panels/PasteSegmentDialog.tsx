/**
 * Paste Segment Dialog
 *
 * Modal dialog that appears after pasting components.
 * Allows users to detect and replace KKS segments in bulk.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';

// Inline SVG Icons
const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Extract numeric segments from a KKS string
 * Looks for patterns like "JNG10", "LAA41" and extracts the numbers (10, 41)
 * These are typically the differentiating numbers within a component category
 */
function extractNumericSegments(kks: string): { prefix: string; number: string }[] {
  const segments: { prefix: string; number: string }[] = [];

  // Split by dashes to analyze each part
  const parts = kks.split('-');

  for (const part of parts) {
    // Look for patterns: letters followed by numbers (e.g., "JNG10", "LAA41", "AA001")
    // We want to find segments where letters are followed by numbers
    const match = part.match(/^([A-Z]+)(\d+)$/i);
    if (match) {
      const prefix = match[1].toUpperCase();
      const number = match[2];

      // Skip very long numbers (like sequential IDs "001", "002") - focus on meaningful segments
      // Also skip single digit numbers that might be unit identifiers
      if (number.length >= 1 && number.length <= 3) {
        segments.push({ prefix, number });
      }
    }
  }

  return segments;
}

/**
 * Get unique segment numbers across all KKS strings
 * Returns a map of "PREFIX+NUMBER" -> { prefix, number } for deduplication
 */
function getUniqueSegments(kksList: string[]): Map<string, { prefix: string; number: string }> {
  const uniqueSegments = new Map<string, { prefix: string; number: string }>();

  for (const kks of kksList) {
    const segments = extractNumericSegments(kks);
    for (const seg of segments) {
      const key = `${seg.prefix}${seg.number}`;
      if (!uniqueSegments.has(key)) {
        uniqueSegments.set(key, seg);
      }
    }
  }

  return uniqueSegments;
}

export const PasteSegmentDialog: React.FC = () => {
  const {
    pasteSegmentDialogOpen,
    pastedComponentKks,
    closePasteSegmentDialog,
  } = useUIStore();

  const { diagram, updateComponent, getComponent, renameComponent } = useDiagramStore();

  // State for segment replacements: "PREFIX+NUMBER" -> new number
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  // Detect unique segments from pasted components
  const detectedSegments = useMemo(() => {
    const segmentsMap = getUniqueSegments(pastedComponentKks);
    return Array.from(segmentsMap.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => {
        // Sort by prefix first, then by number
        if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
        return parseInt(a.number) - parseInt(b.number);
      });
  }, [pastedComponentKks]);

  // Initialize replacements when dialog opens
  React.useEffect(() => {
    if (pasteSegmentDialogOpen && detectedSegments.length > 0) {
      const initial: Record<string, string> = {};
      detectedSegments.forEach(seg => {
        initial[seg.key] = seg.number; // Default to same number
      });
      setReplacements(initial);
    }
  }, [pasteSegmentDialogOpen, detectedSegments]);

  // Handle replacement value change
  const handleReplacementChange = useCallback((key: string, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');
    setReplacements(prev => ({
      ...prev,
      [key]: numericValue,
    }));
  }, []);

  // Preview what the new KKS will look like
  const previewKks = useCallback((originalKks: string) => {
    let newKks = originalKks;

    // For each detected segment, replace PREFIX+OLDNUMBER with PREFIX+NEWNUMBER
    detectedSegments.forEach(seg => {
      const newNumber = replacements[seg.key];
      if (newNumber && newNumber !== seg.number) {
        // Replace the exact pattern (e.g., "JNG10" -> "JNG41")
        const oldPattern = `${seg.prefix}${seg.number}`;
        const newPattern = `${seg.prefix}${newNumber}`;
        // Use word boundary-aware replacement to avoid partial matches
        const regex = new RegExp(`(^|-)${oldPattern}(-|$)`, 'gi');
        newKks = newKks.replace(regex, `$1${newPattern}$2`);
      }
    });

    return newKks;
  }, [replacements, detectedSegments]);

  // Check if any replacements are different
  const hasChanges = useMemo(() => {
    return detectedSegments.some(seg => {
      const newNumber = replacements[seg.key];
      return newNumber && newNumber !== seg.number;
    });
  }, [replacements, detectedSegments]);

  // Apply replacements to all pasted components
  const applyReplacements = useCallback(() => {
    if (!hasChanges || !diagram) {
      closePasteSegmentDialog();
      return;
    }

    // Build replacement map: old pattern -> new pattern
    const patternReplacements: { oldPattern: string; newPattern: string }[] = [];
    detectedSegments.forEach(seg => {
      const newNumber = replacements[seg.key];
      if (newNumber && newNumber !== seg.number) {
        patternReplacements.push({
          oldPattern: `${seg.prefix}${seg.number}`,
          newPattern: `${seg.prefix}${newNumber}`,
        });
      }
    });

    // Track the new KKS values for selection after rename
    const newKksList: string[] = [];

    // For each pasted component, rename its KKS and update properties
    const sortedKks = [...pastedComponentKks].sort();

    sortedKks.forEach(oldKks => {
      const newKks = previewKks(oldKks);

      if (newKks !== oldKks) {
        const component = getComponent(oldKks);
        if (component) {
          // First update any properties that might contain the segment patterns
          const updatedProperties: Record<string, unknown> = {};
          if (component.properties) {
            Object.entries(component.properties).forEach(([key, value]) => {
              if (typeof value === 'string') {
                let newValue = value;
                patternReplacements.forEach(({ oldPattern, newPattern }) => {
                  const regex = new RegExp(`(^|-)${oldPattern}(-|$)`, 'gi');
                  newValue = newValue.replace(regex, `$1${newPattern}$2`);
                });
                updatedProperties[key] = newValue;
              } else {
                updatedProperties[key] = value;
              }
            });
            updateComponent(oldKks, { properties: updatedProperties });
          }

          // Then rename the component KKS
          const renamed = renameComponent(oldKks, newKks);
          if (renamed) {
            newKksList.push(newKks);
          } else {
            // If rename failed, keep old KKS in selection
            newKksList.push(oldKks);
          }
        }
      } else {
        // No change needed, keep in selection
        newKksList.push(oldKks);
      }
    });

    // Update selection with new KKS values
    if (newKksList.length > 0) {
      useUIStore.getState().select(newKksList, []);
    }

    closePasteSegmentDialog();
  }, [hasChanges, diagram, pastedComponentKks, previewKks, getComponent, updateComponent, renameComponent, closePasteSegmentDialog, detectedSegments, replacements]);

  // Close without applying
  const handleClose = useCallback(() => {
    closePasteSegmentDialog();
  }, [closePasteSegmentDialog]);

  if (!pasteSegmentDialogOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <RefreshIcon />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Replace KKS Segments
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {detectedSegments.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <AlertIcon />
              <span>No segments detected in pasted components.</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {pastedComponentKks.length} components pasted. Found {detectedSegments.length} unique segment(s).
                Change the replacement values to update all component KKS at once.
              </p>

              {/* Segment replacement inputs */}
              <div className="space-y-3">
                {detectedSegments.map(seg => (
                  <div key={seg.key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Prefix
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {seg.prefix}
                        </span>
                        <input
                          type="text"
                          value={seg.number}
                          disabled
                          className="w-20 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r text-sm text-gray-600 dark:text-gray-400 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex items-center pt-5">
                      <span className="text-gray-400">→</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        New Number
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-gray-200 dark:bg-gray-600 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l text-sm text-gray-700 dark:text-gray-300 font-mono">
                          {seg.prefix}
                        </span>
                        <input
                          type="text"
                          value={replacements[seg.key] || seg.number}
                          onChange={(e) => handleReplacementChange(seg.key, e.target.value)}
                          className="w-20 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-r text-sm text-gray-900 dark:text-white font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder={seg.number}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview section */}
              {hasChanges && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Preview (first 5 components)
                  </h3>
                  <div className="space-y-1 text-xs font-mono">
                    {pastedComponentKks.slice(0, 5).map(kks => {
                      const newKks = previewKks(kks);
                      const changed = kks !== newKks;
                      return (
                        <div key={kks} className={changed ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}>
                          {kks} → {newKks}
                        </div>
                      );
                    })}
                    {pastedComponentKks.length > 5 && (
                      <div className="text-gray-400">
                        ... and {pastedComponentKks.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Skip
          </button>
          <button
            onClick={applyReplacements}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded ${
              hasChanges
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckIcon />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasteSegmentDialog;
