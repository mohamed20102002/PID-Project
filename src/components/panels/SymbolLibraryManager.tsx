/**
 * Symbol Library Manager Component
 *
 * Manages the symbol library including custom symbols,
 * favorites, and import/export functionality.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import { SymbolDefinition, SymbolCategory } from '../../types/symbol.types';
import { SymbolRegistry, KKS_HIERARCHY } from '../../data/symbols/SymbolRegistry';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { SymbolEditor } from './SymbolEditor';
import { VisualComponentDesigner } from './VisualComponentDesigner';
import { SymbolPreview } from '../symbols/base/BaseSymbol';

interface SymbolLibraryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type LibraryTab = 'all' | 'custom' | 'favorites' | 'recent';

export const SymbolLibraryManager: React.FC<SymbolLibraryManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SymbolCategory | 'all'>('all');
  const [editingSymbolId, setEditingSymbolId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    customSymbols,
    favorites,
    recentlyUsed,
    toggleFavorite,
    deleteCustomSymbol,
    addCustomSymbol,
    importSymbols,
    exportSymbols,
    migrateAllSymbols,
  } = useCustomSymbolStore();

  // Get all symbols based on tab and filters (all symbols are now in customSymbols)
  const getSymbols = useCallback((): SymbolDefinition[] => {
    let symbols: SymbolDefinition[] = [];

    switch (activeTab) {
      case 'all':
      case 'custom': // 'custom' and 'all' are now the same
        symbols = Object.values(customSymbols);
        break;
      case 'favorites':
        symbols = favorites
          .map((id) => customSymbols[id])
          .filter(Boolean) as SymbolDefinition[];
        break;
      case 'recent':
        symbols = recentlyUsed
          .map((id) => customSymbols[id])
          .filter(Boolean) as SymbolDefinition[];
        break;
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      symbols = symbols.filter((s) => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      symbols = symbols.filter(
        (s) =>
          s.displayName.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query)
      );
    }

    return symbols;
  }, [activeTab, customSymbols, favorites, recentlyUsed, selectedCategory, searchQuery]);

  const symbols = getSymbols();

  // Handle import
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.type !== 'symbol-library' || !Array.isArray(data.symbols)) {
          alert('Invalid symbol library file');
          return;
        }

        const result = importSymbols(data.symbols);
        alert(`Imported ${result.added} symbols (${result.skipped} skipped)`);
      } catch (error) {
        alert('Failed to import symbols: ' + (error as Error).message);
      }

      // Reset input
      e.target.value = '';
    },
    [importSymbols]
  );

  // Handle export
  const handleExport = useCallback(() => {
    const customSymbolIds = Object.keys(customSymbols);

    if (customSymbolIds.length === 0) {
      alert('No custom symbols to export');
      return;
    }

    const json = exportSymbols();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowmark-symbols.json';
    link.click();

    URL.revokeObjectURL(url);
  }, [customSymbols, exportSymbols]);

  // Handle delete
  const handleDelete = useCallback(
    (id: string) => {
      if (confirm('Are you sure you want to delete this custom symbol?')) {
        deleteCustomSymbol(id);
      }
    },
    [deleteCustomSymbol]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    (symbol: SymbolDefinition) => {
      const timestamp = Date.now();
      const newId = `${symbol.id}-copy-${timestamp}`;
      const newDisplayName = `${symbol.displayName} (Copy)`;
      // Create unique Symbol Name by appending timestamp suffix
      const newName = `${symbol.name}-copy-${timestamp}`;

      const duplicatedSymbol: SymbolDefinition = {
        ...symbol,
        id: newId,
        name: newName,  // Unique symbol name with timestamp
        displayName: newDisplayName,  // User-friendly display name
      };

      const success = addCustomSymbol(duplicatedSymbol);
      if (success) {
        alert(`Symbol duplicated as "${newDisplayName}"`);
      }
    },
    [addCustomSymbol]
  );

  // Handle migration
  const handleMigrateAll = useCallback(() => {
    if (confirm('This will update all symbols to fix coordinate scaling issues from the old designer. This cannot be undone. Continue?')) {
      const result = migrateAllSymbols();
      alert(`Migration complete!\n${result.migrated} symbols migrated successfully.\n${result.failed} symbols failed.`);
    }
  }, [migrateAllSymbols]);

  if (!isOpen) return null;

  // Show symbol editor if editing (all symbols use Visual Component Designer now)
  if (editingSymbolId) {
    return (
      <VisualComponentDesigner
        isOpen={true}
        onClose={() => setEditingSymbolId(null)}
        onSave={() => setEditingSymbolId(null)}
        symbolId={editingSymbolId}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-pid-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Symbol Library</h2>
            <button
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              onClick={onClose}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(['all', 'custom', 'favorites', 'recent'] as LibraryTab[]).map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-pid-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'custom' && Object.keys(customSymbols).length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {Object.keys(customSymbols).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-pid-border flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbols..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as SymbolCategory | 'all')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="all">All Categories</option>
            {KKS_HIERARCHY.map((mainCategory) => (
              <optgroup key={mainCategory.code} label={`${mainCategory.code} - ${mainCategory.name}`}>
                {mainCategory.subCategories.map((subCat) => (
                  <option key={subCat} value={subCat}>
                    {SymbolRegistry.getCategoryDisplayName(subCat)}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Special Categories">
              <option value="terminals">System Terminals</option>
              <option value="corners">Pipe Corners & Bends</option>
            </optgroup>
          </select>

          {/* Import/Export/Migrate */}
          <button
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            onClick={handleImport}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Import
          </button>
          <button
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            onClick={handleExport}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Export
          </button>
          <button
            className="px-3 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center gap-1"
            onClick={handleMigrateAll}
            title="Fix stretched symbols from old designer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Fix Old Symbols
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Symbol Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {symbols.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <p className="text-sm">
                {activeTab === 'custom'
                  ? 'No custom symbols yet'
                  : activeTab === 'favorites'
                  ? 'No favorite symbols'
                  : activeTab === 'recent'
                  ? 'No recently used symbols'
                  : 'No symbols found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {symbols.map((symbol) => (
                <SymbolCard
                  key={symbol.id}
                  symbol={symbol}
                  isFavorite={favorites.includes(symbol.id)}
                  isCustom={true} // All symbols are now custom/user-managed
                  onEdit={() => setEditingSymbolId(symbol.id)}
                  onToggleFavorite={() => toggleFavorite(symbol.id)}
                  onDuplicate={() => handleDuplicate(symbol)}
                  onDelete={() => handleDelete(symbol.id)} // All symbols can be deleted
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-pid-border flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500">
            {symbols.length} symbol{symbols.length !== 1 ? 's' : ''}
          </span>
          <button
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Symbol Card Component
// ============================================================================

interface SymbolCardProps {
  symbol: SymbolDefinition;
  isFavorite: boolean;
  isCustom: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const SymbolCard: React.FC<SymbolCardProps> = ({
  symbol,
  isFavorite,
  isCustom,
  onEdit,
  onToggleFavorite,
  onDelete,
  onDuplicate,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow group">
      {/* Preview */}
      <div className="h-20 flex items-center justify-center bg-gray-50 rounded mb-2 relative">
        {/* Render actual symbol preview */}
        <Stage width={80} height={80}>
          <Layer>
            <SymbolPreview
              definition={symbol}
              size={70}
              strokeColor="#1a1a1a"
            />
          </Layer>
        </Stage>

        {/* Badges - removed custom badge since all symbols are now user-managed */}
        <div className="absolute top-1 right-1 flex gap-1">
        </div>
      </div>

      {/* Info */}
      <div className="mb-2">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {symbol.displayName}
        </h4>
        <p className="text-xs text-gray-500 truncate">{symbol.category}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex gap-1">
          <button
            className={`p-1 rounded transition-colors ${
              isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
            }`}
            onClick={onToggleFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          {onDuplicate && (
            <button
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              onClick={onDuplicate}
              title="Duplicate symbol"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              onClick={onDelete}
              title="Delete custom symbol"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
        <button
          className="px-2 py-1 text-xs bg-pid-primary text-white rounded hover:bg-blue-700 transition-colors"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default SymbolLibraryManager;
