/**
 * Tool Palette for Visual Component Designer
 *
 * Vertical toolbar with drawing tool buttons:
 * - Select/Move
 * - Line
 * - Rectangle
 * - Circle
 * - Polygon
 * - Port
 * - Delete
 */

import React from 'react';
import { useDesignerStore, DrawingTool } from '../../../store/designerStore';

export const ToolPalette: React.FC = () => {
  const { activeTool, setActiveTool, canUndo, canRedo, undo, redo, gridVisible, toggleGrid } = useDesignerStore();

  const tools: Array<{
    id: DrawingTool;
    label: string;
    icon: JSX.Element;
    description: string;
  }> = [
    {
      id: 'select',
      label: 'Select',
      description: 'Select shapes and labels',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      ),
    },
    {
      id: 'line',
      label: 'Line',
      description: 'Draw straight lines',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
      ),
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      description: 'Draw rectangles',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="6" width="16" height="12" rx="1" />
        </svg>
      ),
    },
    {
      id: 'circle',
      label: 'Circle',
      description: 'Draw circles',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
    },
    {
      id: 'arc',
      label: 'Arc',
      description: 'Draw arcs (2-point)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20a8 8 0 0 1 0-16" />
        </svg>
      ),
    },
    {
      id: 'polygon',
      label: 'Polygon',
      description: 'Draw custom polygons',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 22,8.5 18,19.5 6,19.5 2,8.5" />
        </svg>
      ),
    },
    {
      id: 'port',
      label: 'Port',
      description: 'Add connection ports',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
    },
    {
      id: 'label',
      label: 'Label',
      description: 'Add text labels',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
      ),
    },
    {
      id: 'centerpoint',
      label: 'Center',
      description: 'Set center point for alignment',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="2" fill="#f59e0b" stroke="#f59e0b" />
          <line x1="12" y1="2" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="22" />
          <line x1="2" y1="12" x2="8" y2="12" />
          <line x1="16" y1="12" x2="22" y2="12" />
        </svg>
      ),
    },
    {
      id: 'measure',
      label: 'Measure',
      description: 'Measure distances in pixels',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h18M3 19h18M5 3v18M19 3v18" />
          <path d="M9 7v4M15 7v4M9 13v4M15 13v4" />
        </svg>
      ),
    },
    {
      id: 'delete',
      label: 'Delete',
      description: 'Delete shapes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-16 border-r border-gray-200 bg-gray-50 flex flex-col">
      {/* Drawing Tools */}
      <div className="flex flex-col gap-1 p-2 border-b border-gray-300">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              activeTool === tool.id
                ? 'bg-pid-primary text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={`${tool.label}: ${tool.description}`}
          >
            <div className="w-5 h-5">{tool.icon}</div>
          </button>
        ))}
      </div>

      {/* Undo/Redo */}
      <div className="flex flex-col gap-1 p-2 border-b border-gray-300">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
            canUndo()
              ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
            canRedo()
              ? 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
          </svg>
        </button>
      </div>

      {/* View Options */}
      <div className="flex flex-col gap-1 p-2">
        <button
          onClick={toggleGrid}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
            gridVisible
              ? 'bg-blue-100 text-pid-primary'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
          title={gridVisible ? 'Hide Grid' : 'Show Grid'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help */}
      <div className="p-2 border-t border-gray-300">
        <button
          className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all"
          title="Keyboard Shortcuts:
• Ctrl+Z: Undo
• Ctrl+Y: Redo
• Escape: Cancel drawing
• Double-click: Complete polygon"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ToolPalette;
