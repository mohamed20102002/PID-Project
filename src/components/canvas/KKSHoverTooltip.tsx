/**
 * KKS Hover Tooltip Component
 *
 * Shows a tooltip with KKS code and system name when hovering over a component.
 * Uses the KKSID.xlsx reference data to look up system names.
 * Includes a "Quick Open" button to navigate to the system.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';
import { ReferencesService, KKSEntry } from '../../services/ReferencesService';

interface KKSHoverTooltipProps {
  containerRef: React.RefObject<HTMLElement>;
  onOpenSystem?: (systemKks: string) => { success: boolean; error?: string };
  onOpenDescription?: (componentKks: string, viewOnly: boolean) => void;
}

/**
 * Extract system KKS from a full component KKS
 * The system KKS format is: UnitNumber + SystemCode (e.g., "10KBA" or "10JNG2")
 * Supports both 3-letter codes (KBA) and 4-character codes with digit suffix (JNG1, JNG2)
 * Example: "10KBA01AA001" -> "10KBA"
 * Example: "10JNG251AA001" -> "10JNG2"
 */
function extractSystemKks(fullKks: string, systemCodeLength: number = 3): string | null {
  const upper = fullKks.toUpperCase();

  // Pattern: Unit number (1-2 digits) + system code (variable length)
  const regex = new RegExp(`^(\\d{1,2}[A-Z]{3}\\d{0,${systemCodeLength - 3}})`);
  const match = upper.match(regex);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Extract the segment number from a full component KKS
 * The segment is the 2-digit number after the system code
 * Example: "10KBA01AA001" -> "01"
 * Example: "10JNG251AA001" with 4-char system code -> "51"
 */
function extractSegmentNumber(fullKks: string, systemCodeLength: number = 3): string | null {
  const upper = fullKks.toUpperCase();

  // Pattern: Unit (1-2 digits) + System code (3-4 chars) + Segment (2 digits)
  // For 3-letter code: "10KBA01AA001" -> segment "01"
  // For 4-letter code: "10JNG251AA001" -> segment "51"
  const regex = new RegExp(`^\\d{1,2}[A-Z]{3}\\d{0,${systemCodeLength - 3}}(\\d{2})`);
  const match = upper.match(regex);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Extract just the base 3-letter system code (without unit number or suffix)
 * Example: "10KBA01AA001" -> "KBA"
 * Example: "10JNG251AA001" -> "JNG"
 */
function extractBaseSystemCode(fullKks: string): string | null {
  const upper = fullKks.toUpperCase();

  // Pattern: After unit digits, get the 3-letter code
  const match = upper.match(/^\d{1,2}([A-Z]{3})/);
  if (match) {
    return match[1];
  }

  // Fallback: just first 3 letters if no digits
  const fallback = upper.match(/^([A-Z]{3})/);
  if (fallback) {
    return fallback[1];
  }

  return null;
}

export const KKSHoverTooltip: React.FC<KKSHoverTooltipProps> = ({
  containerRef,
  onOpenSystem,
  onOpenDescription,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [matchedEntry, setMatchedEntry] = useState<KKSEntry | null>(null);
  const [componentKks, setComponentKks] = useState<string>('');
  const [kksLoaded, setKksLoaded] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<number | null>(null);
  const currentHoveredRef = useRef<string | null>(null);
  const initialPositionRef = useRef<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get settings from store
  const hoveredComponentKks = useUIStore((state) => state.hoveredComponentKks);
  const kksHoverTooltipEnabled = useUIStore((state) => state.kksHoverTooltipEnabled);
  const kksHoverDelayMs = useUIStore((state) => state.kksHoverDelayMs);
  const mousePosition = useUIStore((state) => state.mousePosition);
  const viewport = useUIStore((state) => state.viewport);

  // Get component data
  const diagram = useDiagramStore((state) => state.diagram);

  // Load KKS references on mount
  useEffect(() => {
    ReferencesService.loadKKSReferences().then((result) => {
      if (result.success) {
        setKksLoaded(true);
      }
    });
  }, []);

  // Find matching KKS entry from references with segment-aware matching
  // Handles both simple 3-letter codes (KBA) and codes with digit suffix (JNG1, JNG2)
  // Uses segment validation when segments are defined in KKSID
  const findMatchingKKS = useCallback((fullKks: string): KKSEntry | null => {
    if (!kksLoaded) return null;

    const allEntries = ReferencesService.getAllKKS();
    const baseCode = extractBaseSystemCode(fullKks); // "JNG" from "10JNG251AA001"

    if (!baseCode) return null;

    // Find all entries that start with the base 3-letter code
    // This includes "JNG", "JNG1", "JNG2", etc.
    const candidateEntries = allEntries.filter(
      (entry) => entry.kks.toUpperCase().startsWith(baseCode)
    );

    if (candidateEntries.length === 0) return null;

    // If only one candidate and it matches exactly the 3-letter code, return it
    if (candidateEntries.length === 1 && candidateEntries[0].kks.toUpperCase() === baseCode) {
      return candidateEntries[0];
    }

    // Multiple candidates (e.g., JNG1, JNG2) - need to use segment matching
    // Sort by KKS length descending to try more specific matches first (JNG2 before JNG)
    const sortedCandidates = [...candidateEntries].sort(
      (a, b) => b.kks.length - a.kks.length
    );

    for (const entry of sortedCandidates) {
      const entryKks = entry.kks.toUpperCase();
      const systemCodeLength = entryKks.length; // 3 for "KBA", 4 for "JNG2"

      // Extract what would be the segment number if this entry's code length is used
      const segmentNumber = extractSegmentNumber(fullKks, systemCodeLength);

      // If entry has segments defined, check if the component's segment is valid
      if (entry.segments && entry.segments.length > 0) {
        if (segmentNumber && entry.segments.includes(segmentNumber)) {
          // Segment matches - this is the correct system
          return entry;
        }
        // Segment doesn't match - try next candidate
        continue;
      }

      // No segments defined - match by code prefix
      // For entries like "JNG1" check if component KKS contains that code
      if (systemCodeLength > 3) {
        // Check if the KKS has the digit suffix in the right position
        const upper = fullKks.toUpperCase();
        const expectedSuffix = entryKks.slice(3); // "1" from "JNG1", "2" from "JNG2"
        const actualChar = upper.slice(2 + 3, 2 + 3 + expectedSuffix.length); // Position after unit+3letters

        if (actualChar === expectedSuffix) {
          return entry;
        }
      } else {
        // 3-letter code without segments - return as fallback
        return entry;
      }
    }

    // Fallback: return the base 3-letter match if exists
    const baseMatch = candidateEntries.find(
      (entry) => entry.kks.toUpperCase() === baseCode
    );
    return baseMatch || candidateEntries[0] || null;
  }, [kksLoaded]);

  // Handle hover changes
  useEffect(() => {
    if (!kksHoverTooltipEnabled) {
      setVisible(false);
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (hoveredComponentKks) {
      currentHoveredRef.current = hoveredComponentKks;

      // Check if this component has KKS tooltip enabled
      const component = diagram?.components[hoveredComponentKks];
      if (!component?.properties?.showKksTooltip) {
        // Component doesn't have tooltip enabled, skip
        return;
      }

      // Capture initial position when starting hover timer
      if (mousePosition && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        initialPositionRef.current = {
          x: mousePosition.x * viewport.scale + viewport.x + containerRect.left + 20,
          y: mousePosition.y * viewport.scale + viewport.y + containerRect.top - 10,
        };
      }

      // Start timer for showing tooltip
      timerRef.current = window.setTimeout(() => {
        // Check if still hovering the same component
        if (currentHoveredRef.current === hoveredComponentKks) {
          const match = findMatchingKKS(hoveredComponentKks);
          setMatchedEntry(match);
          setComponentKks(hoveredComponentKks);
          // Use the captured initial position
          if (initialPositionRef.current) {
            setPosition(initialPositionRef.current);
          }
          setVisible(true);
        }
      }, kksHoverDelayMs);
    } else {
      // Only hide tooltip if we're not hovering over the tooltip itself
      if (!isTooltipHovered) {
        setVisible(false);
        setMatchedEntry(null);
        setComponentKks('');
        currentHoveredRef.current = null;
        initialPositionRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [hoveredComponentKks, kksHoverTooltipEnabled, kksHoverDelayMs, findMatchingKKS, diagram, mousePosition, viewport, containerRef, isTooltipHovered]);

  // Handle quick open click
  const handleQuickOpen = useCallback(() => {
    if (onOpenSystem) {
      // Use the matched entry's code length to extract proper system KKS
      const codeLength = matchedEntry?.kks.length || 3;
      const systemKks = extractSystemKks(componentKks, codeLength);

      console.log(`[KKSHoverTooltip] handleQuickOpen: componentKks=${componentKks}, matchedEntry.kks=${matchedEntry?.kks}, codeLength=${codeLength}, extracted systemKks=${systemKks}`);

      if (systemKks) {
        setIsLoading(true);
        setErrorMessage(null);

        // Try with extracted systemKks first (includes unit prefix like "10JNG2")
        let result = onOpenSystem(systemKks);

        // If that failed and we have a matched entry, try with just the entry's KKS
        if (!result.success && matchedEntry && matchedEntry.kks !== systemKks) {
          console.log(`[KKSHoverTooltip] First attempt failed, trying with matchedEntry.kks: ${matchedEntry.kks}`);
          result = onOpenSystem(matchedEntry.kks);
        }

        setIsLoading(false);

        if (result.success) {
          // Close tooltip after successful action
          setVisible(false);
          setIsTooltipHovered(false);
        } else {
          // Show error message
          setErrorMessage(result.error || 'System not found');
        }
      } else {
        setErrorMessage('Could not extract system KKS from component');
      }
    }
  }, [componentKks, matchedEntry, onOpenSystem]);

  // Handle tooltip mouse leave - close the tooltip
  const handleTooltipMouseLeave = useCallback(() => {
    setIsTooltipHovered(false);
    setVisible(false);
    setMatchedEntry(null);
    setComponentKks('');
    setErrorMessage(null);
    setIsLoading(false);
  }, []);

  if (!visible || !kksHoverTooltipEnabled) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(0, -100%)',
      }}
      onMouseEnter={() => setIsTooltipHovered(true)}
      onMouseLeave={handleTooltipMouseLeave}
    >
      <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[200px] max-w-[300px]">
        {/* KKS Code */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-blue-500 rounded text-xs font-mono font-bold">
            {componentKks}
          </span>
        </div>

        {/* System Info */}
        {(() => {
          // Use matched entry's code length for proper system KKS extraction
          const codeLength = matchedEntry?.kks.length || 3;
          const systemKks = extractSystemKks(componentKks, codeLength);
          const segmentNumber = extractSegmentNumber(componentKks, codeLength);

          return matchedEntry ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-green-600 rounded text-xs font-mono font-bold">
                  {matchedEntry.kks}
                </span>
                <span className="text-xs text-gray-300">System</span>
              </div>
              <div className="text-sm text-gray-100 font-medium">
                {matchedEntry.systemName}
              </div>

              {/* Segment Info */}
              {segmentNumber && (
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-purple-600 rounded text-xs font-mono font-bold">
                    {segmentNumber}
                  </span>
                  <span className="text-xs text-gray-300">Segment</span>
                </div>
              )}

              {/* Action Buttons Row */}
              {onOpenSystem && systemKks && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleQuickOpen}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      isLoading
                        ? 'bg-gray-500 cursor-wait'
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {isLoading ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0110 10" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    )}
                    {isLoading ? 'Opening...' : `Open ${matchedEntry.kks}`}
                  </button>
                  {/* Description Icon */}
                  {(() => {
                    const component = diagram?.components[componentKks];
                    const props = component?.properties as Record<string, unknown> | undefined;
                    const description = props?.description as string | undefined;
                    const hasDescription = description && description.replace(/<[^>]*>/g, '').trim().length > 0;
                    if (!hasDescription) return null;
                    return (
                      <button
                        onClick={() => {
                          if (onOpenDescription) {
                            onOpenDescription(componentKks, true);
                            setVisible(false);
                            setIsTooltipHovered(false);
                          }
                        }}
                        title="View description"
                        className="p-2 bg-gray-700 hover:bg-amber-600 rounded transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"/>
                        </svg>
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-200">
                  <div className="font-medium">System not found</div>
                  <button
                    onClick={() => {
                      useUIStore.getState().openQuickSearch();
                      setVisible(false);
                      setIsTooltipHovered(false);
                    }}
                    className="mt-1.5 w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Show Systems (Ctrl+K)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {systemKks && (
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-gray-600 rounded text-xs font-mono font-bold">
                    {systemKks}
                  </span>
                  <span className="text-xs text-gray-400">System</span>
                </div>
              )}
              <div className="text-xs text-gray-400 italic">
                No matching system found in references
              </div>
              {/* Action Buttons Row */}
              {onOpenSystem && systemKks && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleQuickOpen}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      isLoading
                        ? 'bg-gray-700 cursor-wait'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {isLoading ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0110 10" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    )}
                    {isLoading ? 'Opening...' : `Open ${systemKks}`}
                  </button>
                  {/* Description Icon */}
                  {(() => {
                    const component = diagram?.components[componentKks];
                    const props = component?.properties as Record<string, unknown> | undefined;
                    const description = props?.description as string | undefined;
                    const hasDescription = description && description.replace(/<[^>]*>/g, '').trim().length > 0;
                    if (!hasDescription) return null;
                    return (
                      <button
                        onClick={() => {
                          if (onOpenDescription) {
                            onOpenDescription(componentKks, true);
                            setVisible(false);
                            setIsTooltipHovered(false);
                          }
                        }}
                        title="View description"
                        className="p-2 bg-gray-700 hover:bg-amber-600 rounded transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"/>
                        </svg>
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-200">
                  <div className="font-medium">System not found</div>
                  <button
                    onClick={() => {
                      useUIStore.getState().openQuickSearch();
                      setVisible(false);
                      setIsTooltipHovered(false);
                    }}
                    className="mt-1.5 w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Show Systems (Ctrl+K)
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-gray-900 rotate-45"
          style={{
            bottom: -6,
            left: 20,
          }}
        />
      </div>
    </div>
  );
};

export default KKSHoverTooltip;
