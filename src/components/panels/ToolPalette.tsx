/**
 * Tool Palette
 *
 * Left panel displaying P&ID symbols organized by category.
 * Supports drag-and-drop to place components on the canvas.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { SymbolRegistry, KKS_HIERARCHY, KKSMainCategoryInfo } from '../../data/symbols/SymbolRegistry';
import { SymbolPreview } from '../symbols/base/BaseSymbol';
import { SymbolDefinition, SymbolCategory } from '../../types/symbol.types';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { Point } from '../../types';

interface ToolPaletteProps {
  className?: string;
  onEditSymbol?: (symbolId: string) => void;
}

interface SymbolItemProps {
  symbol: SymbolDefinition;
  onDragStart: (symbol: SymbolDefinition, e: React.DragEvent) => void;
  onClick: (symbol: SymbolDefinition) => void;
  onEdit?: (symbol: SymbolDefinition) => void;
}

/**
 * Symbol Item Component - Memoized for performance
 * Uses CSS for hover states to avoid re-renders
 */
const SymbolItem: React.FC<SymbolItemProps> = React.memo(({ symbol, onDragStart, onClick, onEdit }) => {
  const previewSize = 40;

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(symbol);
  }, [onEdit, symbol]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    onDragStart(symbol, e);
  }, [onDragStart, symbol]);

  const handleClick = useCallback(() => {
    onClick(symbol);
  }, [onClick, symbol]);

  // Memoize the Stage to prevent recreation on parent re-renders
  const preview = useMemo(() => (
    <Stage width={previewSize} height={previewSize}>
      <Layer>
        <SymbolPreview
          definition={symbol}
          size={previewSize - 4}
          strokeColor="#1a1a1a"
        />
      </Layer>
    </Stage>
  ), [symbol]);

  return (
    <div
      className="symbol-item relative flex flex-col items-center p-2 rounded cursor-grab bg-white hover:bg-gray-100 transition-colors duration-150"
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      title={symbol.description}
    >
      {/* Edit Button (visible on hover via CSS) */}
      {onEdit && (
        <button
          onClick={handleEditClick}
          className="symbol-edit-btn absolute top-1 right-1 p-1 bg-white rounded shadow-md hover:bg-blue-50 transition-colors z-10 opacity-0"
          title="Edit symbol"
        >
          <svg className="w-3 h-3 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Symbol Preview - Memoized */}
      <div className="w-10 h-10 flex items-center justify-center">
        {preview}
      </div>

      {/* Symbol Name */}
      <span className="text-xs text-center mt-1 text-gray-700 leading-tight">
        {symbol.displayName}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if symbol changes
  return prevProps.symbol.id === nextProps.symbol.id;
});

/**
 * Sub-Category Section Component (for KKS sub-categories like AA, AB, etc.)
 */
const SubCategorySection: React.FC<{
  category: SymbolCategory;
  symbols: SymbolDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  onSymbolDragStart: (symbol: SymbolDefinition, e: React.DragEvent) => void;
  onSymbolClick: (symbol: SymbolDefinition) => void;
  onSymbolEdit?: (symbol: SymbolDefinition) => void;
}> = ({
  category,
  symbols,
  isExpanded,
  onToggle,
  onSymbolDragStart,
  onSymbolClick,
  onSymbolEdit,
}) => {
  const displayName = SymbolRegistry.getCategoryDisplayName(category);
  const icon = SymbolRegistry.getCategoryIcon(category);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Sub-Category Header */}
      <button
        className="w-full px-4 py-1.5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm text-gray-600">{displayName}</span>
          <span className="text-xs text-gray-400">({symbols.length})</span>
        </div>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Symbols Grid */}
      {isExpanded && symbols.length > 0 && (
        <div className="grid grid-cols-3 gap-1 p-2 pl-4 bg-gray-50">
          {symbols.map((symbol) => (
            <SymbolItem
              key={symbol.id}
              symbol={symbol}
              onDragStart={onSymbolDragStart}
              onClick={onSymbolClick}
              onEdit={onSymbolEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main Category Section Component (for KKS main categories: A, B, C)
 */
const MainCategorySection: React.FC<{
  mainCategory: KKSMainCategoryInfo;
  getSymbolsByCategory: (category: SymbolCategory) => SymbolDefinition[];
  expandedMain: boolean;
  expandedSubs: Set<SymbolCategory>;
  onToggleMain: () => void;
  onToggleSub: (category: SymbolCategory) => void;
  onSymbolDragStart: (symbol: SymbolDefinition, e: React.DragEvent) => void;
  onSymbolClick: (symbol: SymbolDefinition) => void;
  onSymbolEdit?: (symbol: SymbolDefinition) => void;
}> = ({
  mainCategory,
  getSymbolsByCategory,
  expandedMain,
  expandedSubs,
  onToggleMain,
  onToggleSub,
  onSymbolDragStart,
  onSymbolClick,
  onSymbolEdit,
}) => {
  // Count total symbols in this main category
  const totalSymbols = mainCategory.subCategories.reduce(
    (sum, sub) => sum + getSymbolsByCategory(sub).length,
    0
  );

  // Get sub-categories that have symbols
  const subCategoriesWithSymbols = mainCategory.subCategories.filter(
    (sub) => getSymbolsByCategory(sub).length > 0
  );

  return (
    <div className="border-b border-gray-300">
      {/* Main Category Header */}
      <button
        className="w-full px-3 py-2.5 flex items-center justify-between bg-gray-100 hover:bg-gray-200 transition-colors"
        onClick={onToggleMain}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-600 text-lg">{mainCategory.code}</span>
          <span className="font-semibold text-gray-800">{mainCategory.name}</span>
          <span className="text-xs text-gray-500">({totalSymbols})</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            expandedMain ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Sub-Categories */}
      {expandedMain && (
        <div className="bg-white">
          {subCategoriesWithSymbols.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400 italic">
              No symbols in this category
            </div>
          ) : (
            subCategoriesWithSymbols.map((subCategory) => (
              <SubCategorySection
                key={subCategory}
                category={subCategory}
                symbols={getSymbolsByCategory(subCategory)}
                isExpanded={expandedSubs.has(subCategory)}
                onToggle={() => onToggleSub(subCategory)}
                onSymbolDragStart={onSymbolDragStart}
                onSymbolClick={onSymbolClick}
                onSymbolEdit={onSymbolEdit}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Tool Palette Component
 */
export const ToolPalette: React.FC<ToolPaletteProps> = ({ className = '', onEditSymbol }) => {
  // State for expanded main categories (A, B, C)
  const [expandedMainCategories, setExpandedMainCategories] = useState<Set<string>>(
    new Set(['A'])
  );

  // State for expanded sub-categories (AA, AB, etc.)
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<SymbolCategory>>(
    new Set(['AP'] as SymbolCategory[])
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get UI store actions
  const { setPlacingComponentType, setTool } = useUIStore();
  const { diagram, addComponent } = useDiagramStore();

  // Get custom symbols
  const { customSymbols } = useCustomSymbolStore();

  // Drag data ref
  const dragDataRef = useRef<SymbolDefinition | null>(null);

  // Get all symbols by category (all symbols are now in customSymbols)
  const getSymbolsByCategory = useCallback((category: SymbolCategory): SymbolDefinition[] => {
    return Object.values(customSymbols).filter(
      (symbol) => symbol.category === category
    );
  }, [customSymbols]);

  // Get all symbols for search
  const getAllSymbols = useCallback((): SymbolDefinition[] => {
    return Object.values(customSymbols);
  }, [customSymbols]);

  // Toggle main category expansion (A, B, C)
  const toggleMainCategory = useCallback((code: string) => {
    setExpandedMainCategories((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  // Toggle sub-category expansion (AA, AB, etc.)
  const toggleSubCategory = useCallback((category: SymbolCategory) => {
    setExpandedSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Get filtered symbols
  const getFilteredSymbols = useCallback(() => {
    if (!searchQuery.trim()) {
      return null; // Return null to use category view
    }

    // Search in all symbols (built-in + custom)
    const allSymbols = getAllSymbols();
    const query = searchQuery.toLowerCase();

    return allSymbols.filter(
      (symbol) =>
        symbol.displayName.toLowerCase().includes(query) ||
        symbol.description.toLowerCase().includes(query) ||
        symbol.id.toLowerCase().includes(query) ||
        symbol.name.toLowerCase().includes(query)
    );
  }, [searchQuery, getAllSymbols]);

  // Handle symbol drag start
  const handleSymbolDragStart = useCallback(
    (symbol: SymbolDefinition, e: React.DragEvent) => {
      dragDataRef.current = symbol;
      setPlacingComponentType(symbol.id);

      // Set drag data
      e.dataTransfer.setData('application/json', JSON.stringify({ symbolId: symbol.id }));
      e.dataTransfer.effectAllowed = 'copy';

      // Create drag image
      const dragImage = document.createElement('div');
      dragImage.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: ${symbol.defaultSize.width}px;
        height: ${symbol.defaultSize.height}px;
        background: rgba(37, 99, 235, 0.2);
        border: 2px dashed #2563eb;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #2563eb;
      `;
      dragImage.textContent = symbol.displayName;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, symbol.defaultSize.width / 2, symbol.defaultSize.height / 2);

      // Clean up drag image after drag
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    },
    [setPlacingComponentType]
  );

  // Handle symbol click (single click to select tool)
  const handleSymbolClick = useCallback(
    (symbol: SymbolDefinition) => {
      setPlacingComponentType(symbol.id);
      setTool('component');
    },
    [setPlacingComponentType, setTool]
  );

  // Handle symbol edit
  const handleSymbolEdit = useCallback(
    (symbol: SymbolDefinition) => {
      onEditSymbol?.(symbol.id);
    },
    [onEditSymbol]
  );

  const filteredSymbols = getFilteredSymbols();

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Components</h2>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Symbols List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSymbols ? (
          // Search results view
          <div className="p-2">
            {filteredSymbols.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No symbols found
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {filteredSymbols.map((symbol) => (
                  <SymbolItem
                    key={symbol.id}
                    symbol={symbol}
                    onDragStart={handleSymbolDragStart}
                    onClick={handleSymbolClick}
                    onEdit={handleSymbolEdit}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Hierarchical category view
          <>
            {/* KKS Main Categories (A, B, C) */}
            {KKS_HIERARCHY.map((mainCategory) => (
              <MainCategorySection
                key={mainCategory.code}
                mainCategory={mainCategory}
                getSymbolsByCategory={getSymbolsByCategory}
                expandedMain={expandedMainCategories.has(mainCategory.code)}
                expandedSubs={expandedSubCategories}
                onToggleMain={() => toggleMainCategory(mainCategory.code)}
                onToggleSub={toggleSubCategory}
                onSymbolDragStart={handleSymbolDragStart}
                onSymbolClick={handleSymbolClick}
                onSymbolEdit={handleSymbolEdit}
              />
            ))}

            {/* Special Categories (Terminals, Corners, Electrical, Additional) */}
            {(['terminals', 'corners', 'electrical', 'additional'] as SymbolCategory[])
              .filter((category) => getSymbolsByCategory(category).length > 0)
              .map((category) => (
                <SubCategorySection
                  key={category}
                  category={category}
                  symbols={getSymbolsByCategory(category)}
                  isExpanded={expandedSubCategories.has(category)}
                  onToggle={() => toggleSubCategory(category)}
                  onSymbolDragStart={handleSymbolDragStart}
                  onSymbolClick={handleSymbolClick}
                  onSymbolEdit={handleSymbolEdit}
                />
              ))}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          Drag symbols to canvas or click to select, then click on canvas to place.
        </p>
      </div>
    </div>
  );
};

export default ToolPalette;
