import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import './index.css';
import Konva from 'konva';
import { DiagramCanvas } from './components/canvas';
import { ToolPalette } from './components/panels/ToolPalette';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SearchPanel } from './components/panels/SearchPanel';
import { PlantExplorer } from './components/panels/PlantExplorer';
import { WorkspaceStatus } from './components/panels/WorkspaceStatus';
import { SystemTabs } from './components/tabs/DiagramTabs';
import { HomePage } from './components/panels/HomePage';
import { TechnicalPanel } from './components/panels/TechnicalPanel';
import { ResizableDivider } from './components/common/ResizableDivider';

// Lazy load modal components for better initial load performance
const SymbolLibraryManager = lazy(() => import('./components/panels/SymbolLibraryManager'));
const VisualComponentDesigner = lazy(() => import('./components/panels/VisualComponentDesigner'));
const QuickSystemSearch = lazy(() => import('./components/panels/QuickSystemSearch'));
const EditModeLogin = lazy(() => import('./components/panels/EditModeLogin'));
const SettingsModal = lazy(() => import('./components/panels/SettingsModal'));
const ReferencesModal = lazy(() => import('./components/panels/ReferencesModal'));
const PasteSegmentDialog = lazy(() => import('./components/panels/PasteSegmentDialog'));
import { useStorageService } from './hooks/useStorageService';
import { useUIStore, selectZoomPercent } from './store/uiStore';
import { useDiagramStore } from './store/diagramStore';
import { usePlantStore } from './store/plantStore';
import { useHistoryStore } from './store/historyStore';
import { useCustomSymbolStore } from './store/customSymbolStore';
import { useAutoSave } from './hooks/useAutoSave';
import { saveToFile, loadFromFile, addRecentFile } from './utils/fileIO';

// Simple Dropdown Component
const Dropdown = ({
  trigger,
  children,
  isOpen,
  onToggle,
  align = 'left'
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  align?: 'left' | 'right';
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative">
      <div onClick={onToggle}>{trigger}</div>
      {isOpen && (
        <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px] ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({
  onClick,
  icon,
  label,
  shortcut,
  active,
  disabled
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
}) => (
  <button
    className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 ${
      disabled ? 'text-gray-300 cursor-not-allowed' :
      active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
    }`}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
  >
    {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
    <span className="flex-1">{label}</span>
    {shortcut && <span className="text-xs text-gray-400">{shortcut}</span>}
  </button>
);

const DropdownDivider = () => <div className="h-px bg-gray-200 my-1" />;

function App() {
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<'file' | 'view' | null>(null);

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
  const canvasDarkMode = useUIStore((state) => state.canvasDarkMode);
  const toggleCanvasDarkMode = useUIStore((state) => state.toggleCanvasDarkMode);
  const pasteSegmentDialogOpen = useUIStore((state) => state.pasteSegmentDialogOpen);
  const quickSearchOpen = useUIStore((state) => state.quickSearchOpen);
  const toggleQuickSearch = useUIStore((state) => state.toggleQuickSearch);
  const closeQuickSearch = useUIStore((state) => state.closeQuickSearch);
  const openQuickSearch = useUIStore((state) => state.openQuickSearch);

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

  // Quick System Search state is now in uiStore

  // Edit Mode Login state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // References Modal state
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);

  // Storage service hook (auto-save enabled)
  useStorageService({
    autoSaveInterval: 3000,
    enabled: true,
  });

  // Left panel tab state
  const [leftPanelTab, setLeftPanelTab] = useState<'symbols' | 'plant' | 'search'>('symbols');

  // Right panel tab state
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'technical'>('properties');

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
        toggleQuickSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleOpen, toggleQuickSearch]);

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
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const selectedSystemKks = usePlantStore((state) => state.selectedSystemKks);

  // Switch to system from diagram store
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);

  // Handle opening a system from KKS hover tooltip
  const handleOpenSystem = useCallback((systemKks: string): { success: boolean; error?: string } => {
    console.log(`[App.handleOpenSystem] Called with systemKks: "${systemKks}"`);

    if (!systemKks) {
      console.warn('[App.handleOpenSystem] Empty systemKks provided');
      return { success: false, error: 'No system KKS provided' };
    }

    if (!plant) {
      console.warn('[App.handleOpenSystem] Plant data not loaded');
      return { success: false, error: 'Plant data not loaded' };
    }

    // Log available systems for debugging
    const allSystems: string[] = [];
    // units is an object keyed by unit ID, not an array
    Object.values(plant?.units || {}).forEach(unit => {
      console.log(`[App.handleOpenSystem] Checking unit: ${unit.kks} (${unit.name})`);
      // systems is also an object keyed by system KKS
      Object.values(unit.systems || {}).forEach(sys => {
        allSystems.push(sys.kks);
      });
    });
    console.log(`[App.handleOpenSystem] Available systems: ${allSystems.join(', ')}`);

    // Find matching system in plant - try different matching strategies
    let matchedSystemKks: string | null = null;

    Object.values(plant?.units || {}).forEach(unit => {
      Object.values(unit.systems || {}).forEach(sys => {
        const sysKksUpper = sys.kks.toUpperCase();
        const searchKksUpper = systemKks.toUpperCase();

        // Exact match (case-insensitive)
        if (sysKksUpper === searchKksUpper) {
          console.log(`[App.handleOpenSystem] Exact match found: ${sys.kks}`);
          matchedSystemKks = sys.kks;
        }
        // System KKS contains the search term (e.g., "10KBA" contains "KBA")
        else if (sysKksUpper.includes(searchKksUpper)) {
          console.log(`[App.handleOpenSystem] Partial match (sys contains search): ${sys.kks}`);
          matchedSystemKks = sys.kks;
        }
        // Search term contains the system KKS
        else if (searchKksUpper.includes(sysKksUpper)) {
          console.log(`[App.handleOpenSystem] Partial match (search contains sys): ${sys.kks}`);
          matchedSystemKks = sys.kks;
        }
      });
    });

    if (matchedSystemKks) {
      console.log(`[App.handleOpenSystem] SUCCESS - Opening system: ${matchedSystemKks}`);
      selectSystem(matchedSystemKks);
      switchToSystem(matchedSystemKks);
      return { success: true };
    } else {
      console.warn(`[App.handleOpenSystem] FAILED - System "${systemKks}" not found. Available: ${allSystems.join(', ')}`);
      return { success: false, error: 'System not found' };
    }
  }, [plant, selectSystem, switchToSystem]);

  // Initialize symbol library with default symbols on first load
  const initializeDefaultSymbols = useCustomSymbolStore((state) => state.initializeDefaultSymbols);

  // Get validateCache and updateComponentTypes from diagramStore
  const validateCache = useDiagramStore((state) => state.validateCache);
  const updateComponentTypes = useDiagramStore((state) => state.updateComponentTypes);

  useEffect(() => {
    // Load plant from file on startup
    loadPlantFromFile();

    // Initialize default symbols (only happens once if localStorage empty)
    initializeDefaultSymbols();

    // Validate diagram cache against actual files (cleans up stale tabs)
    validateCache().then(() => {
      console.log('[App] Diagram cache validated');
    });

    // Load custom symbols from file
    const loadSymbols = async () => {
      const symbolStore = useCustomSymbolStore.getState();
      const result = await symbolStore.loadFromFile();

      if (result.success) {
        console.log(`[App] Loaded ${result.count} custom symbols from file`);

        // Auto-fix: Migrate symbols to name-based IDs on startup
        const { migrated, oldToNewMap } = symbolStore.migrateToNameBasedIds();
        if (migrated > 0) {
          console.log(`[App] Auto-fixed ${migrated} symbol IDs on startup`);

          // Update component types in all diagrams
          for (const [oldId, newId] of Object.entries(oldToNewMap)) {
            const updated = updateComponentTypes(oldId, newId);
            if (updated > 0) {
              console.log(`[App] Updated ${updated} components from "${oldId}" to "${newId}"`);
            }
          }

          // Save updated symbols to file
          await symbolStore.saveToFile();
        }

        // Start auto-sync after initial load
        symbolStore.startAutoSync();
      } else {
        console.error('[App] Failed to load custom symbols:', result.error);
      }
    };

    loadSymbols();
  }, [loadPlantFromFile, initializeDefaultSymbols, validateCache, updateComponentTypes]);

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
      {/* Top Toolbar - Clean Professional Design with Dropdown Menus */}
      <header className="h-11 bg-white border-b border-gray-200 flex items-center px-3 shadow-sm flex-shrink-0">
        {/* Left Section: Logo + Menu Items */}
        <div className="flex items-center gap-1">
          {/* Logo */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-gray-200 mr-1">
            <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="font-semibold text-sm text-gray-800">FlowMark</span>
          </div>

          {/* File Menu */}
          <Dropdown
            isOpen={openDropdown === 'file'}
            onToggle={() => setOpenDropdown(openDropdown === 'file' ? null : 'file')}
            trigger={
              <button className="px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1">
                File
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            }
          >
            <DropdownItem
              onClick={() => { handleNew(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>}
              label="New Diagram"
              shortcut="Ctrl+N"
            />
            <DropdownItem
              onClick={() => { handleOpen(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>}
              label="Open..."
              shortcut="Ctrl+O"
            />
            <DropdownItem
              onClick={() => { handleSave(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" /></svg>}
              label={isDirty ? "Save *" : "Save"}
              shortcut="Ctrl+S"
            />
          </Dropdown>

          {/* View Menu */}
          <Dropdown
            isOpen={openDropdown === 'view'}
            onToggle={() => setOpenDropdown(openDropdown === 'view' ? null : 'view')}
            trigger={
              <button className="px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1">
                View
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            }
          >
            <DropdownItem
              onClick={() => { setGridVisible(!gridVisible); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>}
              label="Show Grid"
              active={gridVisible}
            />
            <DropdownItem
              onClick={() => { setSnapToGrid(!snapToGrid); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>}
              label="Snap to Grid"
              active={snapToGrid}
            />
            <DropdownItem
              onClick={() => { toggleAxisOverlay(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><text x="2" y="8" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">A</text><text x="2" y="18" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">1</text><line x1="10" y1="2" x2="10" y2="22" strokeDasharray="2,2" /></svg>}
              label="Axis Labels"
              active={axisOverlayVisible}
            />
            <DropdownDivider />
            <DropdownItem
              onClick={() => { zoomIn(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>}
              label="Zoom In"
              shortcut="Ctrl++"
            />
            <DropdownItem
              onClick={() => { zoomOut(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>}
              label="Zoom Out"
              shortcut="Ctrl+-"
            />
            <DropdownItem
              onClick={() => { resetZoom(); setOpenDropdown(null); }}
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3" /><path d="M21 8V5a2 2 0 00-2-2h-3" /><path d="M3 16v3a2 2 0 002 2h3" /><path d="M16 21h3a2 2 0 002-2v-3" /></svg>}
              label="Reset Zoom"
              shortcut="Ctrl+0"
            />
          </Dropdown>

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Mode Toggle - Sleek */}
          <div className="flex items-center bg-gray-100 rounded p-0.5">
            <button
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                mode === 'draw'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => mode !== 'draw' && setIsLoginModalOpen(true)}
              title="Edit Mode"
            >
              Edit
            </button>
            <button
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                mode === 'view'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setMode('view')}
              title="View Mode"
            >
              View
            </button>
          </div>
        </div>

        {/* Center Section: Edit Tools (only in edit mode) */}
        {mode === 'draw' && (
          <div className="flex items-center gap-1 ml-4 pl-4 border-l border-gray-200">
            {/* Quick Actions */}
            <button
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1"
              onClick={() => setIsSymbolLibraryOpen(true)}
              title="Symbol Library"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Symbols
            </button>
            <button
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1"
              onClick={() => setIsVisualDesignerOpen(true)}
              title="Create Symbol"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Create
            </button>
            <button
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                tool === 'building' || isDrawingBuilding
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => startBuildingDrawing()}
              title="Draw Building Area"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              Area
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Center: Search */}
        <button
          className="px-3 py-1 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 flex items-center gap-2"
          onClick={openQuickSearch}
          title="Quick Search (Ctrl+K)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span>Search...</span>
          <kbd className="px-1 py-0.5 text-[10px] bg-white text-gray-400 rounded border border-gray-200">⌘K</kbd>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Section: Undo/Redo + Settings */}
        <div className="flex items-center gap-1">
          {mode === 'draw' && (
            <>
              <button
                className={`p-1.5 rounded ${!canUndo ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => canUndo && undo()}
                disabled={!canUndo}
                title={undoDescription ? `Undo: ${undoDescription}` : 'Undo (Ctrl+Z)'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                </svg>
              </button>
              <button
                className={`p-1.5 rounded ${!canRedo ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => canRedo && redo()}
                disabled={!canRedo}
                title={redoDescription ? `Redo: ${redoDescription}` : 'Redo (Ctrl+Y)'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
                </svg>
              </button>
              <div className="h-4 w-px bg-gray-200 mx-1" />
            </>
          )}
          {/* References Button */}
          <button
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            onClick={() => setIsReferencesOpen(true)}
            title="References"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
              <path d="M8 15h4" />
            </svg>
          </button>
          {/* Dark Mode Toggle */}
          <button
            className={`p-1.5 rounded transition-colors ${
              canvasDarkMode
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={toggleCanvasDarkMode}
            title={canvasDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {canvasDarkMode ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <button
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
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
              onOpenSystem={handleOpenSystem}
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

        {/* Right Sidebar - Properties Panel / Technical Panel */}
        {rightPanelOpen && mode === 'draw' && (
          <aside className="bg-white flex flex-col flex-shrink-0" style={{ width: `${rightPanelWidth}px` }}>
            {/* Tab Header */}
            <div className="flex items-center border-b border-pid-border">
              <button
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  rightPanelTab === 'properties'
                    ? 'text-pid-primary border-b-2 border-pid-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRightPanelTab('properties')}
              >
                Properties
              </button>
              <button
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  rightPanelTab === 'technical'
                    ? 'text-pid-primary border-b-2 border-pid-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRightPanelTab('technical')}
              >
                Technical
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600"
                onClick={() => setRightPanelOpen(false)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Tab Content */}
            {rightPanelTab === 'properties' ? (
              <PropertiesPanel className="flex-1 p-3 overflow-y-auto" />
            ) : (
              <TechnicalPanel className="flex-1 overflow-y-auto" />
            )}
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

      {/* Lazy-loaded modal components wrapped in Suspense */}
      <Suspense fallback={null}>
        {/* Symbol Library Manager Modal */}
        {isSymbolLibraryOpen && (
          <SymbolLibraryManager
            isOpen={isSymbolLibraryOpen}
            onClose={() => setIsSymbolLibraryOpen(false)}
          />
        )}

        {/* Visual Component Designer Modal */}
        {isVisualDesignerOpen && (
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
        )}

        {/* Quick System Search (Ctrl+K) */}
        {quickSearchOpen && (
          <QuickSystemSearch
            isOpen={quickSearchOpen}
            onClose={closeQuickSearch}
          />
        )}

        {/* Edit Mode Login Modal */}
        {isLoginModalOpen && (
          <EditModeLogin
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}

        {/* References Modal */}
        {isReferencesOpen && (
          <ReferencesModal
            isOpen={isReferencesOpen}
            onClose={() => setIsReferencesOpen(false)}
          />
        )}

        {/* Paste Segment Dialog */}
        {pasteSegmentDialogOpen && <PasteSegmentDialog />}
      </Suspense>
    </div>
  );
}

export default App;
