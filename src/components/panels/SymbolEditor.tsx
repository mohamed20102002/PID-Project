/**
 * Symbol Editor Component
 *
 * Allows editing symbol properties, creating custom symbols,
 * and managing the symbol library.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { SymbolDefinition, SymbolCategory, PathStyle } from '../../types/symbol.types';
import { SymbolRegistry } from '../../data/symbols/SymbolRegistry';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { useDiagramStore } from '../../store/diagramStore';

interface SymbolEditorProps {
  /** Symbol ID to edit */
  symbolId: string | null;
  /** Callback when editing is complete */
  onClose: () => void;
  /** Callback when symbol is saved */
  onSave?: (symbol: SymbolDefinition) => void;
  /** Callback when symbol ID changes (due to rename) */
  onSymbolIdChange?: (oldId: string, newId: string) => void;
}

type EditorTab = 'properties' | 'appearance' | 'ports' | 'advanced';

export const SymbolEditor: React.FC<SymbolEditorProps> = ({
  symbolId,
  onClose,
  onSave,
  onSymbolIdChange,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('properties');
  const [isDirty, setIsDirty] = useState(false);

  const {
    customSymbols,
    symbolOverrides,
    addCustomSymbol,
    updateCustomSymbol,
    setSymbolOverride,
    duplicateSymbol,
    renameSymbol,
  } = useCustomSymbolStore();

  const updateComponentTypes = useDiagramStore((state) => state.updateComponentTypes);

  // Get the symbol definition
  const symbol = useMemo(() => {
    if (!symbolId) return null;

    // Check custom symbols first
    if (customSymbols[symbolId]) {
      return customSymbols[symbolId];
    }

    // Get built-in symbol
    const builtIn = SymbolRegistry.getSymbol(symbolId);
    if (!builtIn) return null;

    // Apply any overrides
    if (symbolOverrides[symbolId]) {
      return { ...builtIn, ...symbolOverrides[symbolId] };
    }

    return builtIn;
  }, [symbolId, customSymbols, symbolOverrides]);

  const isCustomSymbol = useMemo(
    () => symbolId ? !!customSymbols[symbolId] : false,
    [symbolId, customSymbols]
  );

  // Local editing state
  const [editedSymbol, setEditedSymbol] = useState<Partial<SymbolDefinition>>({});

  // Get merged symbol with edits
  const currentSymbol = useMemo(() => {
    if (!symbol) return null;
    return { ...symbol, ...editedSymbol };
  }, [symbol, editedSymbol]);

  // Update a property
  const updateProperty = useCallback((key: keyof SymbolDefinition, value: unknown) => {
    setEditedSymbol((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  // Update a path style
  const updatePathStyle = useCallback((pathIndex: number, style: Partial<PathStyle>) => {
    if (!currentSymbol) return;

    const newPaths = [...currentSymbol.paths];
    newPaths[pathIndex] = {
      ...newPaths[pathIndex],
      style: { ...newPaths[pathIndex].style, ...style },
    };

    updateProperty('paths', newPaths);
  }, [currentSymbol, updateProperty]);

  // Save changes
  const handleSave = useCallback(() => {
    if (!symbolId || !currentSymbol) return;

    if (isCustomSymbol) {
      // Check if displayName changed - if so, rename the symbol (which changes the ID)
      const originalSymbol = customSymbols[symbolId];
      const newDisplayName = editedSymbol.displayName || originalSymbol?.displayName;

      if (newDisplayName && newDisplayName !== originalSymbol?.displayName) {
        // Rename the symbol (this updates the ID based on the new name)
        const { newId, success } = renameSymbol(symbolId, newDisplayName);

        if (success && newId !== symbolId) {
          // Update all components using the old symbol type
          const updatedCount = updateComponentTypes(symbolId, newId);
          console.log(`[SymbolEditor] Renamed symbol and updated ${updatedCount} components`);

          // Apply any other changes to the renamed symbol
          const otherChanges = { ...editedSymbol };
          delete otherChanges.displayName;
          delete otherChanges.name;

          if (Object.keys(otherChanges).length > 0) {
            updateCustomSymbol(newId, otherChanges);
          }

          // Notify parent about the ID change
          onSymbolIdChange?.(symbolId, newId);

          setIsDirty(false);
          onSave?.({ ...currentSymbol, id: newId } as SymbolDefinition);
          return;
        }
      }

      // No rename needed, just update the symbol
      updateCustomSymbol(symbolId, editedSymbol);
    } else {
      // Save as override for built-in symbol
      setSymbolOverride(symbolId, editedSymbol);
    }

    setIsDirty(false);
    onSave?.(currentSymbol as SymbolDefinition);
  }, [symbolId, currentSymbol, isCustomSymbol, editedSymbol, customSymbols, renameSymbol, updateComponentTypes, updateCustomSymbol, setSymbolOverride, onSave, onSymbolIdChange]);

  // Create a copy as custom symbol
  const handleDuplicate = useCallback(() => {
    if (!symbolId || !currentSymbol) return;

    const baseName = `${currentSymbol.displayName} Copy`;
    const sanitizedName = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newId = `custom:${sanitizedName}`;
    const newName = baseName;

    duplicateSymbol(symbolId, newId, newName);

    // Could switch to editing the new symbol here
    alert(`Created custom symbol: ${newName}\n\nRemember to rename it to something meaningful!`);
  }, [symbolId, currentSymbol, duplicateSymbol]);

  // Reset to default
  const handleReset = useCallback(() => {
    setEditedSymbol({});
    setIsDirty(false);
  }, []);

  if (!symbol || !currentSymbol) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No symbol selected</p>
        <button
          className="mt-2 text-pid-primary hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-pid-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-gray-900">{currentSymbol.displayName}</h2>
            <p className="text-xs text-gray-500">{currentSymbol.id}</p>
          </div>
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
        <div className="flex gap-1 mt-3">
          {(['properties', 'appearance', 'ports', 'advanced'] as EditorTab[]).map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-pid-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' && (
          <PropertiesTab symbol={currentSymbol} onChange={updateProperty} />
        )}

        {activeTab === 'appearance' && (
          <AppearanceTab
            symbol={currentSymbol}
            onChange={updateProperty}
            onPathStyleChange={updatePathStyle}
          />
        )}

        {activeTab === 'ports' && (
          <PortsTab symbol={currentSymbol} onChange={updateProperty} />
        )}

        {activeTab === 'advanced' && (
          <AdvancedTab symbol={currentSymbol} onChange={updateProperty} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-pid-border flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
            onClick={handleDuplicate}
          >
            Duplicate as Custom
          </button>
          {isDirty && (
            <button
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-1.5 text-xs rounded ${
              isDirty
                ? 'bg-pid-primary text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={handleSave}
            disabled={!isDirty}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Properties Tab
// ============================================================================

interface PropertiesTabProps {
  symbol: SymbolDefinition;
  onChange: (key: keyof SymbolDefinition, value: unknown) => void;
}

const PropertiesTab: React.FC<PropertiesTabProps> = ({ symbol, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Display Name
        </label>
        <input
          type="text"
          value={symbol.displayName}
          onChange={(e) => onChange('displayName', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={symbol.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={symbol.category}
            onChange={(e) => onChange('category', e.target.value as SymbolCategory)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="valves">Valves</option>
            <option value="pumps">Pumps</option>
            <option value="vessels">Vessels</option>
            <option value="instruments">Instruments</option>
            <option value="piping">Piping</option>
            <option value="heat-exchangers">Heat Exchangers</option>
            <option value="misc">Miscellaneous</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            KKS Equipment Code
          </label>
          <input
            type="text"
            value={symbol.kksEquipmentCode}
            onChange={(e) => onChange('kksEquipmentCode', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            placeholder="e.g., AA, AP"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Standard
          </label>
          <select
            value={symbol.standard}
            onChange={(e) => onChange('standard', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="ISA">ISA 5.1</option>
            <option value="ISO">ISO</option>
            <option value="DIN">DIN</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Appearance Tab
// ============================================================================

interface AppearanceTabProps {
  symbol: SymbolDefinition;
  onChange: (key: keyof SymbolDefinition, value: unknown) => void;
  onPathStyleChange: (pathIndex: number, style: Partial<PathStyle>) => void;
}

const AppearanceTab: React.FC<AppearanceTabProps> = ({
  symbol,
  onChange,
  onPathStyleChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Size */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2">Default Size</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width</label>
            <input
              type="number"
              value={symbol.defaultSize.width}
              onChange={(e) =>
                onChange('defaultSize', {
                  ...symbol.defaultSize,
                  width: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={500}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <input
              type="number"
              value={symbol.defaultSize.height}
              onChange={(e) =>
                onChange('defaultSize', {
                  ...symbol.defaultSize,
                  height: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={500}
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2">Rotation</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={symbol.rotatable}
            onChange={(e) => onChange('rotatable', e.target.checked)}
            className="rounded text-pid-primary"
          />
          <span className="text-sm text-gray-700">Allow rotation</span>
        </label>
      </div>

      {/* Path Styles */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2">
          Path Styles ({symbol.paths.length} paths)
        </h3>
        <div className="space-y-3">
          {symbol.paths.map((path, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Path {index + 1} ({path.type})
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stroke</label>
                  <input
                    type="color"
                    value={path.style.stroke || '#000000'}
                    onChange={(e) =>
                      onPathStyleChange(index, { stroke: e.target.value })
                    }
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fill</label>
                  <input
                    type="color"
                    value={path.style.fill === 'none' ? '#ffffff' : path.style.fill || '#ffffff'}
                    onChange={(e) =>
                      onPathStyleChange(index, { fill: e.target.value })
                    }
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Width</label>
                  <input
                    type="number"
                    value={path.style.strokeWidth || 2}
                    onChange={(e) =>
                      onPathStyleChange(index, { strokeWidth: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Ports Tab
// ============================================================================

interface PortsTabProps {
  symbol: SymbolDefinition;
  onChange: (key: keyof SymbolDefinition, value: unknown) => void;
}

const PortsTab: React.FC<PortsTabProps> = ({ symbol, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-700">
          Connection Ports ({symbol.ports.length})
        </h3>
      </div>

      <div className="space-y-3">
        {symbol.ports.map((port, index) => (
          <div key={port.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{port.name}</span>
              <span className="text-xs text-gray-500">{port.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Position:</span>
                <span className="ml-1">
                  ({port.relativePosition.x.toFixed(2)}, {port.relativePosition.y.toFixed(2)})
                </span>
              </div>
              <div>
                <span className="text-gray-500">Direction:</span>
                <span className="ml-1">{port.direction}</span>
              </div>
              <div>
                <span className="text-gray-500">Angle:</span>
                <span className="ml-1">{port.defaultAngle}°</span>
              </div>
            </div>
            <div className="mt-2 text-xs">
              <span className="text-gray-500">Allowed:</span>
              <span className="ml-1">{port.allowedConnections.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>

      {symbol.ports.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          No ports defined for this symbol
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Advanced Tab
// ============================================================================

interface AdvancedTabProps {
  symbol: SymbolDefinition;
  onChange: (key: keyof SymbolDefinition, value: unknown) => void;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({ symbol, onChange }) => {
  return (
    <div className="space-y-4">
      {/* Size Constraints */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2">Size Constraints</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Width</label>
            <input
              type="number"
              value={symbol.minSize.width}
              onChange={(e) =>
                onChange('minSize', { ...symbol.minSize, width: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Width</label>
            <input
              type="number"
              value={symbol.maxSize.width}
              onChange={(e) =>
                onChange('maxSize', { ...symbol.maxSize, width: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Behavior */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2">Behavior</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={symbol.resizable}
              onChange={(e) => onChange('resizable', e.target.checked)}
              className="rounded text-pid-primary"
            />
            <span className="text-sm text-gray-700">Resizable</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={symbol.aspectRatioLocked}
              onChange={(e) => onChange('aspectRatioLocked', e.target.checked)}
              className="rounded text-pid-primary"
            />
            <span className="text-sm text-gray-700">Lock aspect ratio</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={symbol.freeRotation}
              onChange={(e) => onChange('freeRotation', e.target.checked)}
              className="rounded text-pid-primary"
            />
            <span className="text-sm text-gray-700">Free rotation (any angle)</span>
          </label>
        </div>
      </div>

      {/* JSON Preview */}
      <div>
        <h3 className="text-xs font-medium text-gray-700 mb-2">Symbol Definition (JSON)</h3>
        <pre className="p-3 bg-gray-900 text-gray-100 text-xs rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(symbol, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default SymbolEditor;
