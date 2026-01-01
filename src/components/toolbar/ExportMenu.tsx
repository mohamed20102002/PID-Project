/**
 * Export Menu Component
 *
 * Dropdown menu for exporting diagrams to various formats.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { exportManager, ExportOptions } from '../../core/export/ExportManager';
import { useDiagramStore } from '../../store/diagramStore';

interface ExportMenuProps {
  className?: string;
  stageRef?: React.RefObject<any>;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ className = '', stageRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    includeTitleBlock: true,
    paperSize: 'A3',
    orientation: 'landscape',
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const diagram = useDiagramStore((state) => state.diagram);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowOptions(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Set up export manager when stage is available
  useEffect(() => {
    if (stageRef?.current) {
      exportManager.setStage(stageRef.current);
    }
  }, [stageRef]);

  useEffect(() => {
    exportManager.setDiagram(diagram);
  }, [diagram]);

  const getFilename = useCallback((extension: string) => {
    const name = diagram?.name || 'diagram';
    const sanitized = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${sanitized}.${extension}`;
  }, [diagram]);

  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    setIsExporting(true);
    setExportFormat(format);

    try {
      let success = false;

      switch (format) {
        case 'png':
          success = await exportManager.downloadPNG(getFilename('png'), options);
          break;
        case 'svg':
          success = exportManager.downloadSVG(getFilename('svg'), options);
          break;
        case 'pdf':
          success = await exportManager.downloadPDF(getFilename('pdf'), options);
          break;
      }

      if (!success) {
        alert(`Failed to export as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
      setIsOpen(false);
    }
  }, [getFilename, options]);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Export Button */}
      <button
        className="px-3 py-1.5 text-sm bg-pid-primary text-white rounded hover:bg-blue-700 flex items-center gap-1"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            Export
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-pid-border z-50">
          {/* Format Options */}
          <div className="p-2 space-y-1">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => handleExport('png')}
            >
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export as PNG</div>
                <div className="text-xs text-gray-500">High-quality raster image</div>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => handleExport('svg')}
            >
              <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export as SVG</div>
                <div className="text-xs text-gray-500">Scalable vector graphics</div>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              onClick={() => handleExport('pdf')}
            >
              <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M10 12h4" />
                <path d="M10 16h4" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export as PDF</div>
                <div className="text-xs text-gray-500">Document with title block</div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-pid-border" />

          {/* Options Toggle */}
          <div className="p-2">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setShowOptions(!showOptions)}
            >
              <span>Export Options</span>
              <svg
                className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Options Panel */}
            {showOptions && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-3">
                {/* Resolution */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Resolution (PNG)
                  </label>
                  <select
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    value={options.pixelRatio}
                    onChange={(e) => setOptions({ ...options, pixelRatio: Number(e.target.value) })}
                  >
                    <option value={1}>Standard (1x)</option>
                    <option value={2}>High (2x)</option>
                    <option value={3}>Very High (3x)</option>
                    <option value={4}>Ultra (4x)</option>
                  </select>
                </div>

                {/* Paper Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Paper Size (PDF)
                  </label>
                  <select
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    value={options.paperSize}
                    onChange={(e) => setOptions({ ...options, paperSize: e.target.value as ExportOptions['paperSize'] })}
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="A2">A2</option>
                    <option value="A1">A1</option>
                    <option value="A0">A0</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                    <option value="Tabloid">Tabloid</option>
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Orientation (PDF)
                  </label>
                  <select
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    value={options.orientation}
                    onChange={(e) => setOptions({ ...options, orientation: e.target.value as 'portrait' | 'landscape' })}
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>

                {/* Title Block */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.includeTitleBlock}
                    onChange={(e) => setOptions({ ...options, includeTitleBlock: e.target.checked })}
                    className="rounded text-pid-primary"
                  />
                  <span className="text-xs text-gray-700">Include title block</span>
                </label>

                {/* Background Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={options.backgroundColor}
                      onChange={(e) => setOptions({ ...options, backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={options.backgroundColor}
                      onChange={(e) => setOptions({ ...options, backgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
