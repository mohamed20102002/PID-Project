# Claude Project Context - P&ID Designer Application

> **IMPORTANT FOR CLAUDE:** Always read this file at the start of any conversation about this project. After completing any task, UPDATE THIS FILE with new details, changes made, and current state. Do this automatically without asking for permission.

---

## Last Updated: 2026-01-02 02:30 AM

## Project Overview

This is a **P&ID (Piping and Instrumentation Diagram) Designer Application** built with:
- **React 18** + **TypeScript**
- **Vite** for build tooling
- **Konva.js** (react-konva) for canvas rendering
- **Zustand** for state management
- **Tailwind CSS** for styling

### Running the Application
```bash
cd C:\Users\SaMa\Downloads\Compressed\PID-Project-main\PID-Project-main
npm install
npx vite
# Runs on http://localhost:5173 or 5174 if 5173 is busy
```

---

## Project Architecture

### Directory Structure
```
src/
├── components/
│   ├── canvas/
│   │   ├── DiagramCanvas.tsx      # Main canvas component
│   │   ├── ComponentsLayer.tsx    # Renders symbols on canvas
│   │   └── ConnectionsLayer.tsx   # Renders pipes/connections
│   ├── panels/
│   │   ├── ToolPalette.tsx        # Left panel - symbol list (hierarchical KKS)
│   │   ├── PropertiesPanel.tsx    # Right panel - component properties
│   │   ├── VisualComponentDesigner.tsx  # Modal for creating symbols
│   │   └── designer/
│   │       ├── DesignerCanvas.tsx     # Drawing canvas for symbol designer
│   │       ├── ToolPalette.tsx        # Drawing tools (line, rect, circle, etc.)
│   │       ├── PropertiesPanel.tsx    # Symbol properties editor
│   │       └── SymbolPreview.tsx      # Live preview of symbol
│   └── symbols/
│       └── base/
│           └── BaseSymbol.tsx     # Renders any symbol from definition
├── store/
│   ├── diagramStore.ts            # Main diagram state
│   ├── uiStore.ts                 # UI state (mode, tool, selection)
│   ├── designerStore.ts           # Symbol designer state
│   └── customSymbolStore.ts       # Custom symbols storage
├── data/
│   ├── kks/
│   │   └── equipmentCodes.ts      # KKS equipment codes (A, B, C categories)
│   └── symbols/
│       ├── SymbolRegistry.ts      # Symbol registry & category definitions
│       ├── valves.ts              # Valve symbol definitions
│       ├── pumps.ts               # Pump symbol definitions
│       └── ...                    # Other symbol files
├── types/
│   ├── diagram.types.ts           # Diagram-related types
│   ├── symbol.types.ts            # Symbol definition types
│   └── index.ts                   # Type exports
└── core/
    ├── commands/                  # Undo/redo command pattern
    └── grid/
        └── SnapEngine.ts          # Grid snapping logic
```

---

## Key Concepts

### 1. Symbol Definitions
Symbols are defined declaratively with paths, ports, labels, and metadata:
```typescript
interface SymbolDefinition {
  id: string;                    // e.g., "custom:my-valve"
  category: SymbolCategory;      // e.g., "AP" (KKS code)
  name: string;                  // Internal name
  displayName: string;           // UI display name
  kksEquipmentCode: string;      // KKS equipment code (AA, AP, CT, etc.)
  paths: SymbolPath[];           // Drawing paths (line, rect, circle, polygon)
  ports: PortDefinition[];       // Connection points
  labels: LabelDefinition[];     // Text labels
  centerPoint?: Point;           // Custom center point for alignment (0-1 relative)
  defaultSize: Size;
  // ... other properties
}
```

### 2. Coordinate Systems
- **Canvas coordinates**: Pixel positions on the Konva canvas
- **Relative coordinates (0-1)**: Used in symbol definitions, normalized to symbol size
- **Design Area**: Fixed 200x200 virtual space for symbol design (DESIGN_AREA_SIZE constant)

### 3. KKS Categories (Sector No. 4)
Symbols are organized by KKS equipment codes:

**A - Aggregates:**
- AA: Fittings, breaking devices
- AB: Gateways, hatches, doors
- AC: Heat exchangers, heating surfaces
- AG: Generator sets
- AH: Heaters, coolers, air conditioners
- AM: Mixers, stirrers
- AN: Compressors, fans
- AP: Pumping units
- AT: Devices for cleaning, drying, filtering and separating media

**B - Devices:**
- BB: Storage devices (vessels, containers)
- BN: Jet pumps, ejectors, injectors
- BP: Restriction devices, flow limiters, throttle washers
- BQ: Supports, load-bearing structures, brackets, pipeline penetrations
- BR: Pipelines, channels, trays
- BS: Silencers

**C - Sensors (Direct measuring circuits):**
- CE: Electrical quantities
- CF: Flow, mass flow
- CJ: Power (mechanical, thermal)
- CL: Level (also media separation line)
- CM: Humidity
- CP: Pressure
- CQ: Quality indicators (analyses, properties of substances)
- CS: Speed, revolutions, frequency (mechanical), acceleration
- CT: Temperature

### 4. Symbol Center Point
Symbols can have a custom `centerPoint` property (relative 0-1 coordinates) that determines the alignment/rotation pivot point. If not set, defaults to geometric center (0.5, 0.5).

---

## Recent Changes Log

### 2026-01-02 02:30 AM - Complete Legacy Cleanup
**Files Modified:**
- `src/types/symbol.types.ts` - Removed legacy categories, kept 'terminals' and 'corners' as special categories
- `src/data/symbols/SymbolRegistry.ts` - Removed built-in symbol imports, only KKS + special categories
- `src/data/symbols/*.ts` - DELETED: valves.ts, pumps.ts, vessels.ts, instruments.ts, piping.ts, terminals.ts
- `src/components/panels/ToolPalette.tsx` - Removed LegacyCategorySection, added special categories section
- `src/components/panels/SymbolLibraryManager.tsx` - Added "Cleanup Legacy" button and category filter
- `src/components/panels/designer/PropertiesPanel.tsx` - Added special categories group to category dropdown
- `src/store/customSymbolStore.ts` - Added `cleanupLegacySymbols()` function to remove invalid symbols

**Changes:**
- SymbolCategory type now only contains KKS codes (AA-CT) + 'terminals' + 'corners'
- All built-in symbol files deleted - symbols now only come from customSymbolStore
- Added "Cleanup Legacy" button in Symbol Library to remove symbols with old categories
- Tool palette shows A, B, C hierarchical categories plus special categories section
- Special categories (terminals, corners) auto-set noKks=true (no KKS required)

**User Action Required:**
- Click "Cleanup Legacy" button in Symbol Library to remove old symbols from localStorage

### 2026-01-02 01:25 AM - KKS Names Enhancement
**Files Modified:**
- `src/types/kks.types.ts` - Fixed KKS_EQUIPMENT_TYPES with correct Sector 4 codes and descriptive names
- `src/data/kks/equipmentCodes.ts` - Updated all sub-category names with full descriptive text
- `src/data/symbols/SymbolRegistry.ts` - Updated getCategoryDisplayName() with descriptive labels
- `src/components/panels/designer/PropertiesPanel.tsx` - Updated category dropdown labels

**Changes:**
- KKS category names now include multiple descriptive words instead of just first word
- Example: "AA - Fittings" → "AA - Fittings & Breaking Devices"
- All 24 KKS sub-categories updated with proper descriptions from Sector No. 4 standard

### 2026-01-02 01:10 AM - KKS Categories Implementation
**Files Modified:**
- `src/data/kks/equipmentCodes.ts` (NEW) - KKS equipment codes data structure
- `src/types/symbol.types.ts` - Added all KKS category codes to SymbolCategory type
- `src/data/symbols/SymbolRegistry.ts` - Added KKS_HIERARCHY, display names, icons
- `src/components/panels/ToolPalette.tsx` - Hierarchical category display (A, B, C main categories)
- `src/components/panels/designer/PropertiesPanel.tsx` - KKS categories in dropdown with optgroups
- `src/store/designerStore.ts` - Default category changed to 'AA'

**Changes:**
- Implemented hierarchical KKS category structure
- Tool palette now shows collapsible main categories (A - Aggregates, B - Devices, C - Sensors)
- Designer properties panel shows categories grouped by KKS main category
- Category selection auto-sets KKS equipment code

### 2026-01-02 - Center Point Feature
**Files Modified:**
- `src/types/symbol.types.ts` - Added `centerPoint?: Point` to SymbolDefinition
- `src/store/designerStore.ts` - Added centerPoint state, setCenterPoint/clearCenterPoint actions
- `src/components/panels/designer/ToolPalette.tsx` - Added centerpoint tool button
- `src/components/panels/designer/DesignerCanvas.tsx` - Centerpoint tool handling and rendering
- `src/components/symbols/base/BaseSymbol.tsx` - Uses centerPoint for offsetX/offsetY
- `src/components/canvas/ComponentsLayer.tsx` - Updated bounds calculation for centerPoint

**Changes:**
- Added center point tool to symbol designer
- Symbols can have custom alignment/pivot points
- Center point displayed as orange crosshair in designer

### 2026-01-02 - Symbol Designer Improvements
**Files Modified:**
- `src/components/panels/designer/DesignerCanvas.tsx`

**Changes:**
1. Fixed hover color for new symbols (stroke: 'inherit' instead of '#000000')
2. Fixed canvas size to 1200x1200
3. Added angle display while drawing lines/polygons
4. Added line length display at midpoint
5. Mouse X,Y coordinates shown next to cursor
6. Angle calculated between connecting lines (or from X-axis if no connection)

### 2026-01-02 - Properties Panel Fix
**Files Modified:**
- `src/components/panels/PropertiesPanel.tsx`

**Changes:**
- Fixed properties panel not opening for custom symbols
- Now checks customSymbolStore before SymbolRegistry

---

## Known Issues / TODOs

1. **Angle display**: Only shows for lines connected at endpoints, not for crossing lines
2. **GitHub Repository**: https://github.com/mohamed20102002/PID-Project

---

## Important Code Patterns

### 1. Reading/Writing to Stores
```typescript
// Zustand store pattern
const { metadata, setMetadata } = useDesignerStore();
setMetadata('category', 'AP');

// Multiple values
const { customSymbols } = useCustomSymbolStore();
```

### 2. Coordinate Conversion
```typescript
// Pixel to relative (0-1)
const pixelToRelative = (pixel: Point, designAreaOffset: Point): Point => ({
  x: (pixel.x - designAreaOffset.x) / DESIGN_AREA_SIZE,
  y: (pixel.y - designAreaOffset.y) / DESIGN_AREA_SIZE,
});

// Relative to pixel
const relativeToPixel = (relative: Point, designAreaOffset: Point): Point => ({
  x: relative.x * DESIGN_AREA_SIZE + designAreaOffset.x,
  y: relative.y * DESIGN_AREA_SIZE + designAreaOffset.y,
});
```

### 3. Symbol Rendering with Center Point
```typescript
// In BaseSymbol.tsx
const centerX = definition.centerPoint?.x ?? 0.5;
const centerY = definition.centerPoint?.y ?? 0.5;
const offsetX = centerX * width;
const offsetY = centerY * height;

<Group
  x={component.position.x}
  y={component.position.y}
  offsetX={offsetX}
  offsetY={offsetY}
  rotation={rotation}
>
```

---

## File-Specific Notes

### designerStore.ts
- `DESIGN_AREA_SIZE = 200` - Fixed virtual design space
- Default metadata category: 'AA'
- Default kksEquipmentCode: 'AA'
- Contains undo/redo history management

### SymbolRegistry.ts
- `CATEGORY_ORDER` - Order for displaying categories
- `KKS_HIERARCHY` - Main categories with sub-categories for hierarchical display
- `getCategoryDisplayName()` - Returns display name for category code
- `getCategoryIcon()` - Returns emoji icon for category

### ToolPalette.tsx (main)
- Uses `KKS_HIERARCHY` for hierarchical display
- `MainCategorySection` - Collapsible main category (A, B, C)
- `SubCategorySection` - Expandable sub-category (AA, AB, etc.)
- `LegacyCategorySection` - For backward compatibility with old categories

### BaseSymbol.tsx
- Core component for rendering any symbol
- Uses `centerPoint` for offset calculation
- Handles selection, hover, highlight states

### ComponentsLayer.tsx
- `getComponentBounds()` - Calculates bounding box using centerPoint
- `calculateAlignmentGuides()` - Shows alignment guides during drag

---

## Testing Checklist

When making changes, verify:
- [ ] New symbols can be created in designer
- [ ] Symbols appear in correct KKS category in tool palette
- [ ] Symbols can be placed on canvas
- [ ] Properties panel opens when selecting symbols
- [ ] Hover/selection colors work correctly
- [ ] Center point alignment works as expected
- [ ] Undo/redo works in designer
- [ ] App compiles without errors

---

## Contact / Notes

- Project location: `C:\Users\SaMa\Downloads\Compressed\PID-Project-main\PID-Project-main`
- Dev server typically runs on port 5174 (5173 often in use)
- All symbols are stored in `customSymbolStore` (unified storage)

---

> **REMINDER TO CLAUDE:** After completing any task on this project, come back to this file and:
> 1. Update the "Last Updated" timestamp
> 2. Add new entries to "Recent Changes Log"
> 3. Update "Known Issues / TODOs" if applicable
> 4. Add any new "Important Code Patterns" discovered
> 5. Update "File-Specific Notes" for modified files
