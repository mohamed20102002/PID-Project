# FlowMark P&ID Application - Chat Session Backup
**Date:** December 28, 2024
**Project:** C:\Users\SaMa\Desktop\P&ID

---

## Session Summary

This session covered multiple features and fixes for the FlowMark P&ID drawing application.

---

## Completed Tasks

### 1. Building Label Position Control
- Made building labels draggable when the building is selected
- Added green indicator circle showing the drag handle
- Added "Reset to Center" button in Properties Panel
- **Files Modified:**
  - `src/components/canvas/BuildingsLayer.tsx`
  - `src/components/panels/PropertiesPanel.tsx`

### 2. Canvas Origin Constraint (No Negative Area)
- Constrained viewport so users cannot pan/zoom into negative coordinates
- Canvas now starts from A,1 (origin 0,0 always visible at top-left)
- **Files Modified:**
  - `src/components/canvas/DiagramCanvas.tsx`
  - `src/store/uiStore.ts`

### 3. Vertical Pipe Labels Rotation
- Pipe labels now automatically rotate based on pipe orientation
- Horizontal pipes: label horizontal (above the pipe)
- Vertical pipes going down: label rotates 90° (reads top-to-bottom)
- Vertical pipes going up: label rotates -90° (reads bottom-to-top)
- **Files Modified:**
  - `src/components/canvas/ConnectionsLayer.tsx` (lines 153-166)

### 4. Quick System Search Panel
- Command palette style search (like VS Code's Ctrl+P)
- Search by KKS code, system name, or description
- Partial match support with highlighted results
- Keyboard navigation (↑↓ Enter Esc)
- Toolbar button with Ctrl+K shortcut hint
- **Files Created:**
  - `src/components/panels/QuickSystemSearch.tsx`
- **Files Modified:**
  - `src/App.tsx` (added import, state, keyboard shortcut, toolbar button, modal)

### 5. Robust File-Based Storage System (CRITICAL FIX)
**Problem:** Data was being lost when switching systems and reopening them.

**Solution:** Implemented file-based storage with:
- Workspace folder selection (user picks a folder)
- Each system saved to its own subfolder
- Automatic backups (keeps last 10 versions)
- Auto-save every 3 seconds
- Fallback to localStorage if no workspace selected

**Storage Structure:**
```
Your-Workspace-Folder/
├── flowmark.json          (workspace metadata)
├── plant.json             (plant hierarchy)
└── systems/
    ├── LAA10/
    │   ├── diagram.json   (main diagram data)
    │   └── backups/
    │       └── diagram_TIMESTAMP.json
    └── {systemKks}/
        └── ...
```

**Files Created:**
- `src/services/StorageService.ts` - Core file storage service using File System Access API
- `src/hooks/useStorageService.ts` - React hook for storage integration
- `src/components/panels/WorkspaceStatus.tsx` - UI for workspace selection and status

**Files Modified:**
- `src/store/diagramStore.ts`:
  - Added `import { StorageService }`
  - Changed `switchToSystem` to async, saves to file before switching, loads from file
  - Updated `saveCurrentDiagramToCache` to also save to file storage
- `src/App.tsx`:
  - Added WorkspaceStatus component imports
  - Added useStorageService hook
  - Added WorkspaceSetupModal state and auto-show logic
  - Added WorkspaceStatus to status bar
  - Added WorkspaceSetupModal to modals

---

## Project Setup Instructions (For New Machine)

```bash
# 1. Copy the P&ID folder to the new machine

# 2. Navigate to the project
cd path/to/P&ID

# 3. Install dependencies
npm install

# 4. Run development server
npm run dev

# 5. Build for production
npm run build
```

---

## Key Files Reference

### Stores
- `src/store/diagramStore.ts` - Diagram state, components, connections, buildings
- `src/store/uiStore.ts` - UI state, viewport, selection, tools
- `src/store/plantStore.ts` - Plant hierarchy (Plant → Units → Systems)
- `src/store/historyStore.ts` - Undo/redo

### Canvas Components
- `src/components/canvas/DiagramCanvas.tsx` - Main canvas with pan/zoom
- `src/components/canvas/ComponentsLayer.tsx` - Renders components
- `src/components/canvas/ConnectionsLayer.tsx` - Renders pipes/connections
- `src/components/canvas/BuildingsLayer.tsx` - Renders building polygons
- `src/components/canvas/GridLayer.tsx` - Grid background
- `src/components/canvas/AxisOverlay.tsx` - A-Z, 1-2-3 reference overlay

### Panels
- `src/components/panels/ToolPalette.tsx` - Symbol palette for drag-drop
- `src/components/panels/PropertiesPanel.tsx` - Properties editor
- `src/components/panels/PlantExplorer.tsx` - Plant hierarchy tree
- `src/components/panels/SearchPanel.tsx` - Component search
- `src/components/panels/QuickSystemSearch.tsx` - Quick system search (Ctrl+K)
- `src/components/panels/WorkspaceStatus.tsx` - Workspace folder status
- `src/components/panels/CanvasSettingsModal.tsx` - Canvas size settings
- `src/components/panels/SymbolLibraryManager.tsx` - Symbol library

### Services
- `src/services/StorageService.ts` - File-based storage using File System Access API

### Hooks
- `src/hooks/useStorageService.ts` - Storage service React integration
- `src/hooks/useAutoSave.ts` - Auto-save functionality

### Types
- `src/types/index.ts` - Re-exports all types
- `src/types/diagram.types.ts` - Diagram, Component, Connection types
- `src/types/kks.types.ts` - KKS system types (Plant, Unit, System, Building)
- `src/types/symbol.types.ts` - Symbol definition types

---

## Current Application Features

1. **Drawing Mode**
   - Place components from symbol palette (drag & drop)
   - Draw pipes between component ports
   - Draw building polygons (90-degree constrained)
   - Select, move, rotate components
   - Grid with snap-to-grid

2. **View Mode**
   - Read-only canvas
   - Search components by KKS, name, type

3. **Quick System Search (Ctrl+K)**
   - Search all systems by KKS, name, description
   - Instantly switch to selected system

4. **File Operations**
   - Save/Load diagrams as JSON
   - Export to PNG, SVG, PDF
   - Auto-save to workspace folder

5. **Plant Hierarchy**
   - Plant → Units → Systems → Components
   - KKS coding system support

---

## Known Issues / Notes

1. The path `C:\Users\SaMa\Desktop\P&ID` contains an ampersand (&) which can cause issues with some shell commands. Use quotes around paths.

2. File System Access API requires Chrome, Edge, or Opera. Firefox/Safari will fall back to localStorage.

3. When workspace folder is not selected, data is stored in browser localStorage (less reliable, size limited).

---

## Next Steps / Potential Improvements

1. Add more symbol types to the library
2. Implement copy/paste for components
3. Add layers support
4. Improve pipe routing algorithm
5. Add component grouping
6. Implement print preview
7. Add collaborative editing (future)

---

### 6. Custom Symbols File-Based Storage (2026-01-05)
**Problem:** Custom symbols were stored only in browser localStorage, which doesn't sync via git. When pulling code on another PC, user lost all custom symbols they designed.

**Solution:** Implemented file-based storage for custom symbols that syncs via git.

**Implementation:**
- Custom symbols now saved to `data/custom-symbols.json` file
- Auto-save with 3-second debounce (matches diagram auto-save pattern)
- File is git-tracked and syncs between machines
- File wins merge strategy: git file is source of truth
- Backward compatible: migrates localStorage symbols to file on first run
- localStorage kept as performance cache

**Storage Flow:**
1. **On App Startup:**
   - Load from `data/custom-symbols.json` if exists
   - If no file, migrate localStorage symbols to file
   - File symbols always override localStorage (git sync)

2. **During Use:**
   - Create/modify/delete symbol triggers auto-save
   - 3-second debounce prevents excessive writes
   - Console logs confirm save operations

3. **Git Workflow:**
   - Design symbols → auto-saved to file
   - `git push` → file synced to remote
   - Another PC: `git pull` → symbols load automatically

**Files Created:**
- `data/custom-symbols.json` - Custom symbols storage (auto-created on first run)

**Files Modified:**
- `vite-plugin-storage.ts`:
  - Added `CUSTOM_SYMBOLS_FILE` constant
  - Added `/api/storage/custom-symbols` endpoint (GET/POST)
  - Handles file read/write with pretty-print JSON
  - Returns empty array gracefully if file doesn't exist

- `src/services/StorageService.ts`:
  - Added `saveCustomSymbols(symbols)` method
  - Added `loadCustomSymbols()` method
  - Added import for `SymbolDefinition` type

- `src/store/customSymbolStore.ts`:
  - Added `isLoadedFromFile` state flag
  - Added `loadFromFile()` action - loads from StorageService, file wins merge
  - Added `saveToFile()` action - saves symbols array to file
  - Added `startAutoSync()` action - subscribes to changes with 3s debounce
  - Updated `partialize` to exclude runtime-only `isLoadedFromFile` flag

- `src/App.tsx`:
  - Updated initialization `useEffect` to call `loadFromFile()` on startup
  - Starts auto-sync after successful load
  - Console logs symbol load count

**Result:** Custom symbols now sync seamlessly between PCs via git. No more lost symbols!

---

## Session End State

- All TypeScript compilation passes
- Dev server running
- Storage system implemented and integrated
- Quick search working
- Custom symbols file-based storage implemented and tested

---

*This backup was created to preserve the conversation context for future sessions.*
