/**
 * Technical Panel
 *
 * A dedicated panel for advanced technical tools and modes.
 * Includes KKS-based pipe highlighting and other diagnostic features.
 */

import React, { useCallback, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';

interface TechnicalPanelProps {
  className?: string;
}

/**
 * KKS Pipe Highlighter Section
 * Highlights pipes connected to components whose KKS contains a specific segment
 */
// Predefined color options for quick selection
const HIGHLIGHT_COLORS = [
  { name: 'Cyan', value: '#00ffff' },
  { name: 'Lime', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Orange', value: '#ff8800' },
  { name: 'Magenta', value: '#ff00ff' },
  { name: 'Red', value: '#ff0000' },
];

const KksPipeHighlighter: React.FC = () => {
  const kksHighlightEnabled = useUIStore((state) => state.kksHighlightEnabled);
  const kksHighlightSegment = useUIStore((state) => state.kksHighlightSegment);
  const kksHighlightColor = useUIStore((state) => state.kksHighlightColor);
  const kksHighlightStrokeWidth = useUIStore((state) => state.kksHighlightStrokeWidth);
  const kksHighlightGlowIntensity = useUIStore((state) => state.kksHighlightGlowIntensity);
  const kksHideNonMatching = useUIStore((state) => state.kksHideNonMatching);
  const setKksHighlightEnabled = useUIStore((state) => state.setKksHighlightEnabled);
  const setKksHighlightSegment = useUIStore((state) => state.setKksHighlightSegment);
  const setKksHighlightColor = useUIStore((state) => state.setKksHighlightColor);
  const setKksHighlightStrokeWidth = useUIStore((state) => state.setKksHighlightStrokeWidth);
  const setKksHighlightGlowIntensity = useUIStore((state) => state.setKksHighlightGlowIntensity);
  const setKksHideNonMatching = useUIStore((state) => state.setKksHideNonMatching);

  const diagram = useDiagramStore((state) => state.diagram);

  // Count matching pipes for preview
  // Excludes "Additional Components" (category: additional) from KKS matching
  const matchingCount = useMemo(() => {
    if (!diagram || !kksHighlightSegment.trim()) return { components: 0, pipes: 0 };

    const segment = kksHighlightSegment.trim().toUpperCase();
    const matchingComponentKks = new Set<string>();

    // Find components matching the segment
    // Skip "Additional Components" category (auto-generated KKS)
    Object.values(diagram.components).forEach((comp) => {
      // Check if this is an Additional Component (category starts with 'additional:')
      const isAdditionalComponent = comp.type.startsWith('additional:');

      if (!isAdditionalComponent && comp.kks.toUpperCase().includes(segment)) {
        matchingComponentKks.add(comp.kks);
      }
    });

    // Count pipes connected to matching components
    let pipeCount = 0;
    Object.values(diagram.connections).forEach((conn) => {
      if (
        matchingComponentKks.has(conn.sourceComponentKks) ||
        matchingComponentKks.has(conn.targetComponentKks)
      ) {
        pipeCount++;
      }
    });

    return { components: matchingComponentKks.size, pipes: pipeCount };
  }, [diagram, kksHighlightSegment]);

  const handleSegmentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setKksHighlightSegment(e.target.value.toUpperCase());
  }, [setKksHighlightSegment]);

  const handleToggle = useCallback(() => {
    setKksHighlightEnabled(!kksHighlightEnabled);
  }, [kksHighlightEnabled, setKksHighlightEnabled]);

  const handleClear = useCallback(() => {
    setKksHighlightSegment('');
    setKksHighlightEnabled(false);
  }, [setKksHighlightSegment, setKksHighlightEnabled]);

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
          <span className="text-sm font-medium text-gray-200">KKS Pipe Highlighter</span>
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

      {/* KKS Segment Input */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          KKS Segment to Match
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={kksHighlightSegment}
            onChange={handleSegmentChange}
            placeholder="e.g., 90, KBA, AA"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
          />
          {kksHighlightSegment && (
            <button
              onClick={handleClear}
              className="px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
              title="Clear"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter any part of a KKS code to highlight connected pipes
        </p>
      </div>

      {/* Highlight Style Controls */}
      <div className="mb-3 space-y-3">
        {/* Color Selection */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">
            Highlight Color
          </label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setKksHighlightColor(color.value)}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    kksHighlightColor === color.value
                      ? 'border-white scale-110'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={kksHighlightColor}
              onChange={(e) => setKksHighlightColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-gray-600"
              title="Custom color"
            />
          </div>
        </div>

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
            kksHighlightEnabled && matchingCount.pipes > 0
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
            disabled={!kksHighlightEnabled || matchingCount.pipes === 0}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              kksHideNonMatching && kksHighlightEnabled ? 'bg-cyan-500' : 'bg-gray-600'
            } ${!kksHighlightEnabled || matchingCount.pipes === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
      {kksHighlightSegment.trim() && (
        <div className={`p-2 rounded text-sm ${
          matchingCount.pipes > 0 ? 'bg-cyan-900/30 border border-cyan-700/50' : 'bg-gray-700'
        }`}>
          {matchingCount.components > 0 ? (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${kksHighlightEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-600'}`} />
              <span className="text-gray-300">
                <span className="font-medium text-cyan-400">{matchingCount.pipes}</span> pipe(s) connected to{' '}
                <span className="font-medium text-cyan-400">{matchingCount.components}</span> matching component(s)
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
      {kksHighlightEnabled && kksHighlightSegment.trim() && matchingCount.pipes > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-cyan-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Highlighting active - pipes are glowing
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
      {/* KKS Pipe Highlighter */}
      <KksPipeHighlighter />

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
