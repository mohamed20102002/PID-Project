import { useEffect, useRef, useState, useCallback } from 'react';
import './index.css';
import Konva from 'konva';
import { DiagramCanvas } from './components/canvas';
import { ToolPalette } from './components/panels/ToolPalette';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { PlantExplorer } from './components/panels/PlantExplorer';
import { SymbolLibraryManager } from './components/panels/SymbolLibraryManager';
import { VisualComponentDesigner } from './components/panels/VisualComponentDesigner';
import { QuickSystemSearch } from './components/panels/QuickSystemSearch';
import { WorkspaceStatus } from './components/panels/WorkspaceStatus';
import { SystemTabs } from './components/tabs/DiagramTabs';
import { HomePage } from './components/panels/HomePage';
import { EditModeLogin } from './components/panels/EditModeLogin';
import { ResizableDivider } from './components/common/ResizableDivider';
import { useStorageService } from './hooks/useStorageService';
import { useUIStore, selectZoomPercent } from './store/uiStore';
import { useDiagramStore } from './store/diagramStore';
import { usePlantStore } from './store/plantStore';
import { useHistoryStore } from './store/historyStore';
import { useCustomSymbolStore } from './store/customSymbolStore';
import { useAutoSave } from './hooks/useAutoSave';
import { saveToFile, loadFromFile, addRecentFile } from './utils/fileIO';

function App() {
  // UI Store
  const mode = useUIStore((state) => state.mode);
  const setMode = useUIStore((state) => state.setMode);
  const leftPanelOpen = useUIStore((state) => state.leftPanelOpen);
  const rightPanelOpen = useUIStore((state) => state.rightPanelOpen);
  const setLeftPanelOpen = useUIStore((state) => state.setLeftPanelOpen);
  const setRightPanelOpen = useUIStore((state) => state.setRightPanelOpen);
  const leftPanelWidth = useUIStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useUIStore((state) => state.rightPanelWidth);
  const setLeftPanelWidth = useUIStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useUIStore((state) => state.setRightPanelWidth);
  const gridVisible = useUIStore((state) => state.gridVisible);
  const setGridVisible = useUIStore((state) => state.setGridVisible);
  const snapToGrid = useUIStore((state) => state.snapToGrid);
  const setSnapToGrid = useUIStore((state) => state.setSnapToGrid);
  const gridSize = useUIStore((state) => state.gridSize);
  const axisOverlayVisible = useUIStore((state) => state.axisOverlayVisible);
  const toggleAxisOverlay = useUIStore((state) => state.toggleAxisOverlay);
  const tool = useUIStore((state) => state.tool);
  const isDrawingBuilding = useUIStore((state) => state.isDrawingBuilding);
  const startBuildingDrawing = useUIStore((state) => state.startBuildingDrawing);
  const selection = useUIStore((state) => state.selection);
  const zoomPercent = useUIStore(selectZoomPercent);
  const zoomIn = useUIStore((state) => state.zoomIn);
  const zoomOut = useUIStore((state) => state.zoomOut);
  const resetZoom = useUIStore((state) => state.resetZoom);
  const mousePosition = useUIStore((state) => state.mousePosition);

  // Diagram Store
  const diagram = useDiagramStore((state) => state.diagram);
  const isDirty = useDiagramStore((state) => state.isDirty);
  const newDiagram = useDiagramStore((state) => state.newDiagram);
  const loadDiagram = useDiagramStore((state) => state.loadDiagram);
  const markClean = useDiagramStore((state) => state.markClean);

  // History Store
  const { undo, redo, canUndo, canRedo, undoDescription, redoDescription, clear: clearHistory } = useHistoryStore();

  // Auto-save hook
  const { lastSaveTime, isSaving, checkAutoSave, loadAutoSave } = useAutoSave({
    debounceMs: 2000,
    enabled: true,
  });

  // Save/Load state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  // Export state
  const [stage, setStage] = useState<Konva.Stage | null>(null);

  // Symbol Library Manager state
  const [isSymbolLibraryOpen, setIsSymbolLibraryOpen] = useState(false);

  // Visual Component Designer state
  const [isVisualDesignerOpen, setIsVisualDesignerOpen] = useState(false);
  const [editingSymbolId, setEditingSymbolId] = useState<string | null>(null);

  // Quick System Search state
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  // Edit Mode Login state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Storage service hook (auto-save enabled)
  useStorageService({
    autoSaveInterval: 3000,
    enabled: true,
  });

  // Left panel tab state
  const [leftPanelTab, setLeftPanelTab] = useState<'symbols' | 'plant' | 'search'>('symbols');

  // Canvas container ref for measuring size
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Handle stage ready callback
  const handleStageReady = useCallback((newStage: Konva.Stage | null) => {
    setStage(newStage);
  }, []);

  // Handle Save
  const handleSave = useCallback(async () => {
    if (!diagram) return;

    setSaveStatus('saving');
    const result = await saveToFile(diagram);

    if (result.success) {
      setSaveStatus('saved');
      markClean();
      if (result.filename) {
        setCurrentFileName(result.filename);
        addRecentFile(result.filename);
      }
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      console.error('Save failed:', result.error);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [diagram, markClean]);

  // Handle Open
  const handleOpen = useCallback(async () => {
    const result = await loadFromFile();

    if (result.success && result.diagram) {
      loadDiagram(result.diagram);
      clearHistory();
      if (result.filename) {
        setCurrentFileName(result.filename);
        addRecentFile(result.filename);
      }
    } else if (result.error && result.error !== 'Open cancelled') {
      console.error('Open failed:', result.error);
      alert(`Failed to open file: ${result.error}`);
    }
  }, [loadDiagram, clearHistory]);

  // Handle New
  const handleNew = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Create a new diagram anyway?');
      if (!confirmed) return;
    }
    newDiagram('DEFAULT', 'New Diagram');
    clearHistory();
    setCurrentFileName(null);
  }, [isDirty, newDiagram, clearHistory]);

  // Keyboard shortcuts for save/open/quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpen();
      }
      // Ctrl+K for quick system search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleOpen]);

  // Auto-save is handled silently via localStorage persistence
  // No restore dialog - data is automatically persisted

  // Measure canvas container size
  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCanvasSize({ width: rect.width, height: rect.height });
        }
      }
    };

    // Initial measurement
    updateSize();

    // Re-measure after a frame to ensure layout is complete
    requestAnimationFrame(() => {
      updateSize();
      // Also measure after a short delay for slow renders
      setTimeout(updateSize, 100);
    });

    window.addEventListener('resize', updateSize);

    // Use ResizeObserver for more accurate size tracking
    const resizeObserver = new ResizeObserver(updateSize);
    if (canvasContainerRef.current) {
      resizeObserver.observe(canvasContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
    };
  }, [leftPanelOpen, rightPanelOpen, mode]);

  // Load plant data from file on startup
  const loadPlantFromFile = usePlantStore((state) => state.loadPlantFromFile);
  const plant = usePlantStore((state) => state.plant);

  // Initialize symbol library with default symbols on first load
  const initializeDefaultSymbols = useCustomSymbolStore((state) => state.initializeDefaultSymbols);

  useEffect(() => {
    // Load plant from file on startup
    loadPlantFromFile();

    // Initialize default symbols (only happens once if localStorage empty)
    initializeDefaultSymbols();

    // Load custom symbols from file
    const loadSymbols = async () => {
      const symbolStore = useCustomSymbolStore.getState();
      const result = await symbolStore.loadFromFile();

      if (result.success) {
        console.log(`[App] Loaded ${result.count} custom symbols from file`);

        // Start auto-sync after initial load
        symbolStore.startAutoSync();
      } else {
        console.error('[App] Failed to load custom symbols:', result.error);
      }
    };

    loadSymbols();
  }, [loadPlantFromFile, initializeDefaultSymbols]);

  // Show loading state if plant is not loaded yet
  if (!plant) {
    return (
      <div className="flex items-center justify-center h-screen bg-pid-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-12 h-12 text-pid-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0110 10" />
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-pid-background">
      {/* Top Toolbar */}
      <header className="h-12 bg-white border-b border-pid-border flex items-center px-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-pid-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="font-semibold text-gray-800">FlowMark</span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-pid-border" />

          {/* File Actions */}
          <div className="flex items-center gap-1">
            <button
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={handleNew}
              title="New Diagram (Ctrl+N)"
            >
              New
            </button>
            <button
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={handleOpen}
              title="Open Diagram (Ctrl+O)"
            >
              Open
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                saveStatus === 'saving'
                  ? 'text-gray-400'
                  : saveStatus === 'saved'
                  ? 'text-green-600'
                  : saveStatus === 'error'
                  ? 'text-red-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              title="Save Diagram (Ctrl+S)"
            >
              {saveStatus === 'saving' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                  Saving...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  Save
                  {isDirty && <span className="text-orange-500">*</span>}
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-pid-border" />

          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'draw'
                  ? 'bg-white text-pid-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => mode !== 'draw' && setIsLoginModalOpen(true)}
              title="Enter Edit Mode (requires admin password)"
            >
              Edit
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'view'
                  ? 'bg-white text-pid-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setMode('view')}
            >
              View
            </button>
          </div>

          {/* Exit Edit Mode Button (only shown in edit mode) */}
          {mode === 'draw' && (
            <>
              <div className="h-6 w-px bg-pid-border" />
              <button
                className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-1"
                onClick={() => setMode('view')}
                title="Exit edit mode"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Exit Edit
              </button>
            </>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-pid-border" />

          {/* Symbol Library */}
          <button
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
              mode === 'view'
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => mode === 'draw' && setIsSymbolLibraryOpen(true)}
            disabled={mode === 'view'}
            title={mode === 'view' ? 'Enter Edit Mode to access Symbol Library' : 'Symbol Library'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Library
          </button>

          {/* Component Designer */}
          <button
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
              mode === 'view'
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => mode === 'draw' && setIsVisualDesignerOpen(true)}
            disabled={mode === 'view'}
            title={mode === 'view' ? 'Enter Edit Mode to create symbols' : 'Visual Component Designer'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Create Symbol
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-pid-border" />

          {/* Grid Controls */}
          <div className="flex items-center gap-2">
            <button
              className={`px-2 py-1 text-sm rounded transition-colors ${
                mode === 'view'
                  ? 'text-gray-300 cursor-not-allowed'
                  : gridVisible ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => mode === 'draw' && setGridVisible(!gridVisible)}
              disabled={mode === 'view'}
              title={mode === 'view' ? 'Enter Edit Mode to toggle grid' : 'Toggle Grid'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
            <button
              className={`px-2 py-1 text-sm rounded transition-colors ${
                mode === 'view'
                  ? 'text-gray-300 cursor-not-allowed'
                  : snapToGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => mode === 'draw' && setSnapToGrid(!snapToGrid)}
              disabled={mode === 'view'}
              title={mode === 'view' ? 'Enter Edit Mode to toggle snap' : 'Toggle Snap to Grid'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="2" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </button>
            <button
              className={`px-2 py-1 text-sm rounded transition-colors ${
                mode === 'view'
                  ? 'text-gray-300 cursor-not-allowed'
                  : axisOverlayVisible ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => mode === 'draw' && toggleAxisOverlay()}
              disabled={mode === 'view'}
              title={mode === 'view' ? 'Enter Edit Mode to toggle axis' : 'Toggle Axis Reference (A-Z, 1-2-3)'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <text x="3" y="10" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">A</text>
                <text x="14" y="10" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">B</text>
                <text x="3" y="20" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none">1</text>
                <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2,2" />
                <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2,2" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-pid-border" />

          {/* Building Tool */}
          <button
            className={`px-2 py-1 text-sm rounded transition-colors flex items-center gap-1 ${
              mode === 'view'
                ? 'text-gray-300 cursor-not-allowed'
                : tool === 'building' || isDrawingBuilding
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => mode === 'draw' && startBuildingDrawing()}
            disabled={mode === 'view'}
            title={mode === 'view' ? 'Enter Edit Mode to draw buildings' : 'Draw Building Area (click to place vertices, close near start point)'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3,3 21,3 21,14 12,21 3,14" strokeLinejoin="round" />
              <line x1="3" y1="14" x2="21" y2="14" />
            </svg>
            Building
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-pid-border" />

          {/* Quick System Search */}
          <button
            className="px-2 py-1 text-sm rounded transition-colors flex items-center gap-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setIsQuickSearchOpen(true)}
            title="Quick System Search (Ctrl+K)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span>Search Systems</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded border border-gray-200">Ctrl+K</kbd>
          </button>
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              className={`p-1.5 rounded transition-colors ${
                mode === 'view' || !canUndo
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={mode === 'view' ? 'Enter Edit Mode to undo' : undoDescription ? `Undo: ${undoDescription} (Ctrl+Z)` : 'Undo (Ctrl+Z)'}
              onClick={() => mode === 'draw' && canUndo && undo()}
              disabled={mode === 'view' || !canUndo}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
              </svg>
            </button>
            <button
              className={`p-1.5 rounded transition-colors ${
                mode === 'view' || !canRedo
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={mode === 'view' ? 'Enter Edit Mode to redo' : redoDescription ? `Redo: ${redoDescription} (Ctrl+Y)` : 'Redo (Ctrl+Y)'}
              onClick={() => mode === 'draw' && canRedo && redo()}
              disabled={mode === 'view' || !canRedo}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* System Tabs */}
      <SystemTabs />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Tool Palette / Plant Explorer / Search (hidden in View mode) */}
        {leftPanelOpen && mode === 'draw' && (
          <aside className="bg-white flex flex-col flex-shrink-0" style={{ width: `${leftPanelWidth}px` }}>
            {/* Tab Header */}
            <div className="flex items-center border-b border-pid-border">
              <button
                className={`flex-1 px-2 py-2 text-sm font-medium transition-colors ${
                  leftPanelTab === 'symbols'
                    ? 'text-pid-primary border-b-2 border-pid-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setLeftPanelTab('symbols')}
              >
                Symbols
              </button>
              <button
                className={`flex-1 px-2 py-2 text-sm font-medium transition-colors ${
                  leftPanelTab === 'plant'
                    ? 'text-pid-primary border-b-2 border-pid-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setLeftPanelTab('plant')}
              >
                Plant
              </button>
              <button
                className={`flex-1 px-2 py-2 text-sm font-medium transition-colors ${
                  leftPanelTab === 'search'
                    ? 'text-pid-primary border-b-2 border-pid-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setLeftPanelTab('search')}
              >
                Search
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600"
                onClick={() => setLeftPanelOpen(false)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {/* Tab Content */}
            {leftPanelTab === 'symbols' ? (
              <ToolPalette
                className="flex-1"
                onEditSymbol={(symbolId) => {
                  setEditingSymbolId(symbolId);
                  setIsVisualDesignerOpen(true);
                }}
              />
            ) : leftPanelTab === 'plant' ? (
              <PlantExplorer className="flex-1" />
            ) : (
              <SearchPanel className="flex-1 p-3" />
            )}
          </aside>
        )}

        {/* Left Panel Resizable Divider */}
        {leftPanelOpen && mode === 'draw' && (
          <ResizableDivider
            onResize={(delta) => setLeftPanelWidth(leftPanelWidth + delta)}
            className="flex-shrink-0"
          />
        )}

        {/* Sidebar Toggle (when closed) - hidden in View mode */}
        {!leftPanelOpen && mode === 'draw' && (
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-l-0 border-pid-border rounded-r-lg p-1 shadow-sm hover:bg-gray-50"
            onClick={() => setLeftPanelOpen(true)}
          >
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Canvas Area */}
        <main ref={canvasContainerRef} className={`flex-1 relative bg-gray-100 ${!diagram ? 'overflow-auto' : 'overflow-hidden'}`}>
          {!diagram ? (
            <HomePage />
          ) : canvasSize.width === 0 || canvasSize.height === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading canvas...</div>
            </div>
          ) : (
            <DiagramCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              onStageReady={handleStageReady}
            />
          )}

          {/* Zoom Controls - only show when diagram is active */}
          {diagram && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-lg shadow-md border border-pid-border p-1">
              <button
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Zoom Out"
                onClick={zoomOut}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <button
                className="px-2 text-sm text-gray-600 min-w-[50px] text-center hover:bg-gray-100 rounded"
                onClick={resetZoom}
                title="Reset Zoom"
              >
                {zoomPercent}%
              </button>
              <button
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Zoom In"
                onClick={zoomIn}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <button
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Fit to Screen"
                onClick={resetZoom}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3" />
                  <path d="M21 8V5a2 2 0 00-2-2h-3" />
                  <path d="M3 16v3a2 2 0 002 2h3" />
                  <path d="M16 21h3a2 2 0 002-2v-3" />
                </svg>
              </button>
            </div>
          )}
        </main>

        {/* Right Panel Resizable Divider */}
        {rightPanelOpen && mode === 'draw' && (
          <ResizableDivider
            onResize={(delta) => setRightPanelWidth(rightPanelWidth - delta)}
            className="flex-shrink-0"
          />
        )}

        {/* Right Sidebar - Properties Panel */}
        {rightPanelOpen && mode === 'draw' && (
          <aside className="bg-white flex flex-col flex-shrink-0" style={{ width: `${rightPanelWidth}px` }}>
            {/* Header */}
            <div className="h-10 px-3 flex items-center justify-between border-b border-pid-border">
              <span className="text-sm font-medium text-gray-700">Properties</span>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                onClick={() => setRightPanelOpen(false)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Properties Content */}
            <PropertiesPanel className="flex-1 p-3 overflow-y-auto" />
          </aside>
        )}

        {/* Properties Panel Toggle (when closed) */}
        {!rightPanelOpen && mode === 'draw' && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-r-0 border-pid-border rounded-l-lg p-1 shadow-sm hover:bg-gray-50"
            onClick={() => setRightPanelOpen(true)}
          >
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Status Bar */}
      <footer className="h-7 bg-gray-50 border-t border-pid-border flex items-center px-4 text-xs text-gray-500 flex-shrink-0">
        {/* Workspace Status */}
        <WorkspaceStatus />

        <span className="mx-3 text-gray-300">|</span>

        <span>{currentFileName || diagram?.name || 'No diagram'}</span>
        {isDirty && mode === 'draw' && <span className="ml-1 text-orange-500">*</span>}

        {/* Draw mode specific info */}
        {mode === 'draw' && (
          <>
            <span className="mx-2">|</span>
            <span>Tool: {tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
            <span className="mx-2">|</span>
            <span>Grid: {gridSize}px</span>
            <span className="mx-2">|</span>
            <span>Snap: {snapToGrid ? 'ON' : 'OFF'}</span>
            {selection.componentKks.length > 0 && (
              <>
                <span className="mx-2">|</span>
                <span className="text-blue-600">
                  {selection.componentKks.length} selected (R to rotate)
                </span>
              </>
            )}
            {mousePosition && (
              <>
                <span className="mx-2">|</span>
                <span>
                  X: {Math.round(mousePosition.x)}, Y: {Math.round(mousePosition.y)}
                </span>
              </>
            )}
            {isSaving && (
              <>
                <span className="mx-2">|</span>
                <span className="text-blue-500">Auto-saving...</span>
              </>
            )}
            {lastSaveTime && !isSaving && (
              <>
                <span className="mx-2">|</span>
                <span className="text-gray-400" title={`Last saved: ${new Date(lastSaveTime).toLocaleString()}`}>
                  Saved
                </span>
              </>
            )}
          </>
        )}

        {/* View mode indicator */}
        {mode === 'view' && (
          <>
            <span className="mx-2">|</span>
            <span className="text-green-600">View Mode</span>
          </>
        )}

        <span className="ml-auto">FlowMark v0.1.0 | Developed by Mohamed Ahmed Darwish</span>
      </footer>

      {/* Symbol Library Manager Modal */}
      <SymbolLibraryManager
        isOpen={isSymbolLibraryOpen}
        onClose={() => setIsSymbolLibraryOpen(false)}
      />

      {/* Visual Component Designer Modal */}
      <VisualComponentDesigner
        isOpen={isVisualDesignerOpen}
        onClose={() => {
          setIsVisualDesignerOpen(false);
          setEditingSymbolId(null);
        }}
        onSave={(definition) => {
          setIsVisualDesignerOpen(false);
          setEditingSymbolId(null);
          setIsSymbolLibraryOpen(true); // Show in library after creation
        }}
        symbolId={editingSymbolId}
      />

      {/* Quick System Search (Ctrl+K) */}
      <QuickSystemSearch
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
      />

      {/* Edit Mode Login Modal */}
      <EditModeLogin
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default App;
