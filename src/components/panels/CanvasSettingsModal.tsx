/**
 * Canvas Settings Modal
 *
 * Allows users to configure canvas dimensions and other settings.
 */

import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';

interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset canvas sizes
const PRESETS = [
  { name: 'A4 Landscape', width: 1123, height: 794 },
  { name: 'A3 Landscape', width: 1587, height: 1123 },
  { name: 'A2 Landscape', width: 2245, height: 1587 },
  { name: 'A1 Landscape', width: 3178, height: 2245 },
  { name: 'A0 Landscape', width: 4494, height: 3178 },
  { name: 'Small (1000x800)', width: 1000, height: 800 },
  { name: 'Medium (2000x1500)', width: 2000, height: 1500 },
  { name: 'Large (3000x2000)', width: 3000, height: 2000 },
  { name: 'Extra Large (4000x3000)', width: 4000, height: 3000 },
];

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const canvasWidth = useUIStore((state) => state.canvasWidth);
  const canvasHeight = useUIStore((state) => state.canvasHeight);
  const setCanvasSize = useUIStore((state) => state.setCanvasSize);

  const [width, setWidth] = useState(canvasWidth);
  const [height, setHeight] = useState(canvasHeight);

  // Update local state when store changes
  useEffect(() => {
    setWidth(canvasWidth);
    setHeight(canvasHeight);
  }, [canvasWidth, canvasHeight]);

  if (!isOpen) {
    return null;
  }

  const handleApply = () => {
    setCanvasSize(width, height);
    onClose();
  };

  const handlePreset = (preset: { width: number; height: number }) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleCancel = () => {
    setWidth(canvasWidth);
    setHeight(canvasHeight);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-[450px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Canvas Settings</h2>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Custom Dimensions */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Canvas Dimensions</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Math.max(100, parseInt(e.target.value) || 100))}
                  min={100}
                  max={10000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Math.max(100, parseInt(e.target.value) || 100))}
                  min={100}
                  max={10000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Current: {width} x {height} px
            </p>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Presets</h3>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`px-3 py-2 text-xs text-left rounded border transition-colors ${
                    width === preset.width && height === preset.height
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-gray-400">{preset.width} x {preset.height}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasSettingsModal;
