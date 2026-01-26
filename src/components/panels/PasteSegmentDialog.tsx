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
 * Extract system segment numbers from a KKS string
 * Looks for the system segment number (1-2 digits) that comes after the system code letters
 *
 * KKS Structure: [Unit][SystemCode][SystemSegment][ComponentType][SequentialNumber]
 * Example: 10KBA10AA001
 *   - 10 = Unit number
 *   - KBA = System code (2-3 letters)
 *   - 10 = System segment (1-2 digits) <- THIS IS WHAT WE DETECT
 *   - AA = Component type (2 letters)
 *   - 001 = Sequential number (3 digits) <- NOT this
 *
 * We only detect 1-2 digit numbers after 2-3 letter system codes,
 * ignoring 3-digit sequential numbers (like 001, 002)
 */
function extractNumericSegments(kks: string): { prefix: string; number: string }[] {
  const segments: { prefix: string; number: string }[] = [];
  const seen = new Set<string>();

  // Match system codes (2-3 letters) followed by system segment numbers (1-2 digits)
  // The (?!\d) ensures we don't match if there are more digits (which would be sequential numbers)
  // The (?=[A-Z]|$|-) ensures the segment is followed by letters (component type), end of string, or dash
  const regex = /([A-Z]{2,3})(\d{1,2})(?=[A-Z]|$|-)/gi;
  let match;

  while ((match = regex.exec(kks)) !== null) {
    const prefix = match[1].toUpperCase();
    const number = match[2];
    const key = `${prefix}${number}`;

    // Avoid duplicates
    if (!seen.has(key)) {
      seen.add(key);
      segments.push({ prefix, number });
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
    clipboardComponentKks,
    pastedKksMap,
    closePasteSegmentDialog,
  } = useUIStore();

  const { diagram, updateComponent, getComponent, renameComponent } = useDiagramStore();

  // State for segment replacements: "PREFIX+NUMBER" -> new number
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  // Detect unique segments from ORIGINAL clipboard components (not the auto-generated ones)
  const detectedSegments = useMemo(() => {
    // Use clipboardComponentKks (original) for segment detection
    const sourceKks = clipboardComponentKks.length > 0 ? clipboardComponentKks : pastedComponentKks;
    const segmentsMap = getUniqueSegments(sourceKks);
    return Array.from(segmentsMap.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => {
        // Sort by prefix first, then by number
        if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
        return parseInt(a.number) - parseInt(b.number);
      });
  }, [clipboardComponentKks, pastedComponentKks]);

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

  // Build reverse map: new auto-generated KKS -> original clipboard KKS
  const reverseKksMap = useMemo(() => {
    const reverse = new Map<string, string>();
    pastedKksMap.forEach((newKks, oldKks) => {
      reverse.set(newKks, oldKks);
    });
    return reverse;
  }, [pastedKksMap]);

  // Apply segment replacements to a KKS string
  const applySegmentReplacements = useCallback((kks: string) => {
    let newKks = kks;

    // For each detected segment, replace PREFIX+OLDNUMBER with PREFIX+NEWNUMBER
    detectedSegments.forEach(seg => {
      const newNumber = replacements[seg.key];
      if (newNumber && newNumber !== seg.number) {
        // Replace the system segment pattern (e.g., "KBA10" -> "KBA41")
        // Must be followed by letters (component type), end of string, or dash
        // This ensures we only replace system segments, not sequential numbers
        const regex = new RegExp(`(${seg.prefix})(${seg.number})(?=[A-Z]|$|-)`, 'gi');
        newKks = newKks.replace(regex, `$1${newNumber}`);
      }
    });

    return newKks;
  }, [replacements, detectedSegments]);

  // Preview what the new KKS will look like (shows original -> target)
  const previewKks = useCallback((currentKks: string) => {
    // Find the original KKS from clipboard
    const originalKks = reverseKksMap.get(currentKks) || currentKks;
    // Apply segment replacements to the original KKS
    return applySegmentReplacements(originalKks);
  }, [reverseKksMap, applySegmentReplacements]);

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

    // Build replacement map with prefix, old number, and new number
    const patternReplacements: { prefix: string; oldNumber: string; newNumber: string }[] = [];
    detectedSegments.forEach(seg => {
      const newNumber = replacements[seg.key];
      if (newNumber && newNumber !== seg.number) {
        patternReplacements.push({
          prefix: seg.prefix,
          oldNumber: seg.number,
          newNumber: newNumber,
        });
      }
    });

    // Track the new KKS values for selection after rename
    const newKksList: string[] = [];

    // For each pasted component, rename its KKS and update properties
    // pastedComponentKks contains the current (auto-generated) KKS values
    const sortedKks = [...pastedComponentKks].sort();

    sortedKks.forEach(currentKks => {
      // Find the original KKS from clipboard
      const originalKks = reverseKksMap.get(currentKks) || currentKks;
      // Apply segment replacements to the original KKS to get target KKS
      const targetKks = applySegmentReplacements(originalKks);

      if (targetKks !== currentKks) {
        const component = getComponent(currentKks);
        if (component) {
          // First update any properties that might contain the segment patterns
          const updatedProperties: Record<string, unknown> = {};
          if (component.properties) {
            Object.entries(component.properties).forEach(([key, value]) => {
              if (typeof value === 'string') {
                let newValue = value;
                patternReplacements.forEach(({ prefix, oldNumber, newNumber }) => {
                  // Match system segment pattern and replace
                  // Must be followed by letters, end of string, or dash
                  const regex = new RegExp(`(${prefix})(${oldNumber})(?=[A-Z]|$|-)`, 'gi');
                  newValue = newValue.replace(regex, `$1${newNumber}`);
                });
                updatedProperties[key] = newValue;
              } else {
                updatedProperties[key] = value;
              }
            });
            updateComponent(currentKks, { properties: updatedProperties });
          }

          // Then rename the component KKS from current to target
          const renamed = renameComponent(currentKks, targetKks);
          if (renamed) {
            newKksList.push(targetKks);
          } else {
            // If rename failed, keep current KKS in selection
            newKksList.push(currentKks);
          }
        }
      } else {
        // No change needed, keep in selection
        newKksList.push(currentKks);
      }
    });

    // Update selection with new KKS values
    if (newKksList.length > 0) {
      useUIStore.getState().select(newKksList, []);
    }

    closePasteSegmentDialog();
  }, [hasChanges, diagram, pastedComponentKks, reverseKksMap, applySegmentReplacements, getComponent, updateComponent, renameComponent, closePasteSegmentDialog, detectedSegments, replacements]);

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
                    {clipboardComponentKks.slice(0, 5).map((originalKks, index) => {
                      const targetKks = applySegmentReplacements(originalKks);
                      const changed = originalKks !== targetKks;
                      return (
                        <div key={index} className={changed ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}>
                          {originalKks} → {targetKks}
                        </div>
                      );
                    })}
                    {clipboardComponentKks.length > 5 && (
                      <div className="text-gray-400">
                        ... and {clipboardComponentKks.length - 5} more
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
