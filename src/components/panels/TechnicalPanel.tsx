/**
 * Technical Panel
 *
 * A dedicated panel for advanced technical tools and modes.
 * Includes segment-based pipe highlighting and other diagnostic features.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useUIStore, SegmentHighlight } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';

interface TechnicalPanelProps {
  className?: string;
}

/**
 * Segment Highlighter Section
 * Highlights pipes connected to components whose KKS contains any of the specified segments
 * Each segment can have its own highlight color
 */
// Predefined color options for quick selection
const HIGHLIGHT_COLORS = [
  { name: 'Cyan', value: '#00ffff' },
  { name: 'Lime', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Orange', value: '#ff8800' },
  { name: 'Magenta', value: '#ff00ff' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Blue', value: '#0088ff' },
  { name: 'Pink', value: '#ff69b4' },
];

const SegmentHighlighter: React.FC = () => {
  const kksHighlightEnabled = useUIStore((state) => state.kksHighlightEnabled);
  const kksHighlightSegments = useUIStore((state) => state.kksHighlightSegments);
  const kksHighlightStrokeWidth = useUIStore((state) => state.kksHighlightStrokeWidth);
  const kksHighlightGlowIntensity = useUIStore((state) => state.kksHighlightGlowIntensity);
  const kksHideNonMatching = useUIStore((state) => state.kksHideNonMatching);
  const setKksHighlightEnabled = useUIStore((state) => state.setKksHighlightEnabled);
  const setKksHighlightStrokeWidth = useUIStore((state) => state.setKksHighlightStrokeWidth);
  const setKksHighlightGlowIntensity = useUIStore((state) => state.setKksHighlightGlowIntensity);
  const setKksHideNonMatching = useUIStore((state) => state.setKksHideNonMatching);
  const addSegmentHighlight = useUIStore((state) => state.addSegmentHighlight);
  const removeSegmentHighlight = useUIStore((state) => state.removeSegmentHighlight);
  const updateSegmentHighlight = useUIStore((state) => state.updateSegmentHighlight);
  const clearSegmentHighlights = useUIStore((state) => state.clearSegmentHighlights);

  // Preview segment state (for live highlighting while typing)
  const kksHighlightSegment = useUIStore((state) => state.kksHighlightSegment);
  const kksHighlightColor = useUIStore((state) => state.kksHighlightColor);
  const setKksHighlightSegment = useUIStore((state) => state.setKksHighlightSegment);
  const setKksHighlightColor = useUIStore((state) => state.setKksHighlightColor);

  const diagram = useDiagramStore((state) => state.diagram);

  // Local state for new segment input - synced with store for live preview
  const [newSegment, setNewSegmentLocal] = useState('');
  const [newColor, setNewColorLocal] = useState(HIGHLIGHT_COLORS[0].value);

  // Wrapper to update both local state and store (for live preview)
  const setNewSegment = useCallback((value: string) => {
    setNewSegmentLocal(value);
    setKksHighlightSegment(value); // Update store for live highlighting
  }, [setKksHighlightSegment]);

  const setNewColor = useCallback((value: string) => {
    setNewColorLocal(value);
    setKksHighlightColor(value); // Update store for live highlighting
  }, [setKksHighlightColor]);

  // Count matching pipes for preview (per segment)
  const matchingStats = useMemo(() => {
    if (!diagram || kksHighlightSegments.length === 0) {
      return { totalComponents: 0, totalPipes: 0, perSegment: {} as Record<string, { components: number; pipes: number }> };
    }

    const allMatchingComponentKks = new Set<string>();
    const perSegment: Record<string, { components: number; pipes: number }> = {};

    // For each segment, find matching components
    kksHighlightSegments.forEach((segHighlight) => {
      const segmentUpper = segHighlight.segment.toUpperCase();
      const matchingKks = new Set<string>();

      Object.values(diagram.components).forEach((comp) => {
        const isAdditionalComponent = comp.type.startsWith('additional:');
        if (!isAdditionalComponent) {
          const compKksUpper = comp.kks.toUpperCase();
          if (compKksUpper.includes(segmentUpper)) {
            matchingKks.add(comp.kks);
            allMatchingComponentKks.add(comp.kks);
          }
        }
      });

      // Count pipes for this segment
      let pipeCount = 0;
      Object.values(diagram.connections).forEach((conn) => {
        if (matchingKks.has(conn.sourceComponentKks) || matchingKks.has(conn.targetComponentKks)) {
          pipeCount++;
        }
      });

      perSegment[segHighlight.id] = { components: matchingKks.size, pipes: pipeCount };
    });

    // Count total unique pipes
    let totalPipes = 0;
    Object.values(diagram.connections).forEach((conn) => {
      if (allMatchingComponentKks.has(conn.sourceComponentKks) || allMatchingComponentKks.has(conn.targetComponentKks)) {
        totalPipes++;
      }
    });

    return { totalComponents: allMatchingComponentKks.size, totalPipes, perSegment };
  }, [diagram, kksHighlightSegments]);

  const handleAddSegment = useCallback(() => {
    if (newSegment.trim()) {
      addSegmentHighlight(newSegment.trim(), newColor);
      setNewSegment('');
      // Cycle to next color
      const currentIndex = HIGHLIGHT_COLORS.findIndex(c => c.value === newColor);
      const nextIndex = (currentIndex + 1) % HIGHLIGHT_COLORS.length;
      setNewColor(HIGHLIGHT_COLORS[nextIndex].value);
    }
  }, [newSegment, newColor, addSegmentHighlight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSegment();
    }
  }, [handleAddSegment]);

  const handleToggle = useCallback(() => {
    setKksHighlightEnabled(!kksHighlightEnabled);
  }, [kksHighlightEnabled, setKksHighlightEnabled]);

  const handleClearAll = useCallback(() => {
    clearSegmentHighlights();
    setKksHighlightEnabled(false);
  }, [clearSegmentHighlights, setKksHighlightEnabled]);

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <path d="M15 3h4a2 2 0 012 2v10a2 2 0 01-2 2h-4" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <polyline points="8 8 12 12 8 16" />
            <polyline points="16 8 12 12 16 16" />
          </svg>
          <span className="text-sm font-medium text-gray-200">Segment Highlighter</span>
        </div>
        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            kksHighlightEnabled ? 'bg-cyan-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              kksHighlightEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Add New Segment */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          Add Segment with Color
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newSegment}
            onChange={(e) => setNewSegment(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g., LAA, KBA, 10AA"
            className="flex-1 min-w-0 px-3 h-9 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-9 h-9 flex-shrink-0 rounded cursor-pointer border border-gray-600"
            title="Select color"
          />
          <button
            onClick={handleAddSegment}
            disabled={!newSegment.trim()}
            className="px-3 h-9 flex-shrink-0 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setNewColor(color.value)}
              className={`w-5 h-5 rounded border-2 transition-all ${
                newColor === color.value
                  ? 'border-white scale-110'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Segment List */}
      {kksHighlightSegments.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Active Segments</label>
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {kksHighlightSegments.map((seg) => (
              <div
                key={seg.id}
                className="flex items-center gap-2 p-2 bg-gray-700 rounded group"
              >
                <div
                  className="w-4 h-4 rounded flex-shrink-0 border border-gray-500"
                  style={{ backgroundColor: seg.color }}
                />
                <input
                  type="color"
                  value={seg.color}
                  onChange={(e) => updateSegmentHighlight(seg.id, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0 opacity-0 absolute"
                  style={{ marginLeft: '-24px' }}
                />
                <span className="flex-1 text-sm text-gray-200 font-mono">{seg.segment}</span>
                <span className="text-xs text-gray-500">
                  {matchingStats.perSegment[seg.id]?.pipes || 0} pipes
                </span>
                <button
                  onClick={() => removeSegmentHighlight(seg.id)}
                  className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove segment"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highlight Style Controls */}
      <div className="mb-3 space-y-3">
        {/* Stroke Width */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Stroke Width: <span className="text-gray-300">{kksHighlightStrokeWidth}px</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={kksHighlightStrokeWidth}
            onChange={(e) => setKksHighlightStrokeWidth(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Glow Intensity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Glow Intensity: <span className="text-gray-300">{kksHighlightGlowIntensity}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={kksHighlightGlowIntensity}
            onChange={(e) => setKksHighlightGlowIntensity(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Hide Other Components Toggle */}
        <div
          className={`flex items-center justify-between p-2 rounded ${
            kksHighlightEnabled && matchingStats.totalPipes > 0
              ? 'bg-gray-700'
              : 'bg-gray-800 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span className="text-xs text-gray-300">Hide other components</span>
          </div>
          <button
            onClick={() => setKksHideNonMatching(!kksHideNonMatching)}
            disabled={!kksHighlightEnabled || matchingStats.totalPipes === 0}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              kksHideNonMatching && kksHighlightEnabled ? 'bg-cyan-500' : 'bg-gray-600'
            } ${!kksHighlightEnabled || matchingStats.totalPipes === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                kksHideNonMatching && kksHighlightEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Match Preview */}
      {kksHighlightSegments.length > 0 && (
        <div className={`p-2 rounded text-sm ${
          matchingStats.totalPipes > 0 ? 'bg-cyan-900/30 border border-cyan-700/50' : 'bg-gray-700'
        }`}>
          {matchingStats.totalComponents > 0 ? (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${kksHighlightEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-600'}`} />
              <span className="text-gray-300">
                <span className="font-medium text-cyan-400">{matchingStats.totalPipes}</span> pipe(s) connected to{' '}
                <span className="font-medium text-cyan-400">{matchingStats.totalComponents}</span> matching component(s)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>No matching components found</span>
            </div>
          )}
        </div>
      )}

      {/* Status indicator when active */}
      {kksHighlightEnabled && kksHighlightSegments.length > 0 && matchingStats.totalPipes > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-cyan-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Highlighting active - {kksHighlightSegments.length} segment(s)
        </div>
      )}
    </div>
  );
};

/**
 * Technical Panel Component
 */
export const TechnicalPanel: React.FC<TechnicalPanelProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-50 p-3 space-y-4 ${className}`}>
      {/* Segment Highlighter */}
      <SegmentHighlighter />

      {/* Placeholder for future tools */}
      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-400 text-center">
          More technical tools coming soon
        </p>
      </div>
    </div>
  );
};

export default TechnicalPanel;
