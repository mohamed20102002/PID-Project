/**
 * Visual Component Designer
 *
 * A standalone modal for visually designing custom P&ID symbols.
 * Features:
 * - Visual drawing tools (line, circle, rectangle, polygon)
 * - Port editor with drag-and-drop
 * - Live preview with grid and rulers
 * - Comprehensive symbol configuration
 */

import React, { useState, useEffect } from 'react';
import { useDesignerStore } from '../../store/designerStore';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { DesignerCanvas } from './designer/DesignerCanvas';
import { ToolPalette } from './designer/ToolPalette';
import { PropertiesPanel } from './designer/PropertiesPanel';
import { SymbolPreview } from './designer/SymbolPreview';
import type { SymbolDefinition } from '../../types/symbol.types';

interface VisualComponentDesignerProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback when symbol is saved */
  onSave?: (definition: SymbolDefinition) => void;
  /** Optional symbol ID to edit (if not provided, creates new) */
  symbolId?: string | null;
}

// Fixed canvas size - 1200x1200
const FIXED_CANVAS_SIZE = { width: 1200, height: 1200 };

export const VisualComponentDesigner: React.FC<VisualComponentDesignerProps> = ({
  isOpen,
  onClose,
  onSave,
  symbolId,
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    metadata,
    paths,
    ports,
    reset,
    loadFromDefinition,
    exportDefinition,
    loadDraft,
    clearDraft,
    setCanvasSize: setStoreCanvasSize,
  } = useDesignerStore();

  const { customSymbols, addCustomSymbol, updateCustomSymbol } = useCustomSymbolStore();

  // Load symbol or draft when opened
  useEffect(() => {
    if (!isOpen) return;

    // Reset saving state when opening
    setIsSaving(false);

    // Set fixed canvas size
    setStoreCanvasSize(FIXED_CANVAS_SIZE);

    if (symbolId) {
      // Get symbol from customSymbols (all symbols are now here)
      const symbol = customSymbols[symbolId];

      if (symbol) {
        // Edit existing symbol
        loadFromDefinition(symbol);
      } else {
        // Symbol not found, reset
        console.warn(`Symbol ${symbolId} not found in customSymbols`);
        reset();
      }
    } else {
      // New symbol - check for draft
      const hasDraft = loadDraft();
      if (hasDraft) {
        // Prompt user to restore draft
        const restore = window.confirm('Found an unsaved draft. Would you like to restore it?');
        if (!restore) {
          reset();
        }
      } else {
        reset();
      }
    }
  }, [isOpen, symbolId, customSymbols, loadFromDefinition, reset, loadDraft, setStoreCanvasSize]);

  // Handle close with confirmation if unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    clearDraft();
    onClose();
  };

  // Handle save
  const handleSave = () => {
    // Prevent double-saves
    if (isSaving) return;

    try {
      setIsSaving(true);

      // Validate
      if (!metadata.name.trim()) {
        alert('Please enter a symbol name');
        setIsSaving(false);
        return;
      }
      if (!metadata.displayName.trim()) {
        alert('Please enter a display name');
        setIsSaving(false);
        return;
      }
      if (paths.length === 0) {
        alert('Please draw at least one shape');
        setIsSaving(false);
        return;
      }

      // Export definition
      const definition = exportDefinition();

      console.log('=== SAVE VALIDATION ===');
      console.log('Saving symbol with name:', definition.name);
      console.log('Saving symbol with id:', definition.id);
      console.log('Edit mode (symbolId):', symbolId);
      console.log('Existing symbols:', Object.values(customSymbols).map(s => ({ name: s.name, id: s.id })));

      // Save to custom symbols
      if (symbolId) {
        // EDITING mode: Update the existing symbol we're editing
        // Check if renaming to an existing symbol name (excluding self)
        const duplicateName = Object.values(customSymbols).find(
          s => s.id !== symbolId && s.name === definition.name
        );
        if (duplicateName) {
          alert(`Error: Symbol name "${definition.name}" is already used by another symbol.\nPlease use a different Symbol Name.`);
          setIsSaving(false);
          return;
        }

        updateCustomSymbol(symbolId, definition);
        alert('Symbol updated successfully!');
      } else {
        // NEW symbol mode: Check for duplicate ID or Name before adding
        if (customSymbols[definition.id]) {
          alert(`Error: A symbol with ID "${definition.id}" already exists.\nPlease use a different name to create a unique symbol ID.`);
          setIsSaving(false);
          return;
        }

        // Check for duplicate Symbol Name
        const duplicateName = Object.values(customSymbols).find(s => s.name === definition.name);
        if (duplicateName) {
          alert(`Error: Symbol name "${definition.name}" is already used.\nPlease use a different Symbol Name.`);
          setIsSaving(false);
          return;
        }

        // Add new custom symbol
        const success = addCustomSymbol(definition);
        if (!success) {
          setIsSaving(false);
          return;
        }
        alert('Symbol saved successfully!');
      }

      // Clear draft and close
      clearDraft();
      setHasUnsavedChanges(false);
      onSave?.(definition);
      onClose();
    } catch (error) {
      console.error('Failed to save symbol:', error);
      alert('Failed to save symbol. Please try again.');
      setIsSaving(false);
    }
  };

  // Prevent keyboard shortcuts from affecting parent app
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+A, Ctrl+C, Ctrl+V, Delete from propagating
      if (
        (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v')) ||
        e.key === 'Delete'
      ) {
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[1400px] h-[900px] max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {symbolId ? 'Edit Symbol' : 'Create New Symbol'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {metadata.displayName || 'Untitled Symbol'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Canvas Size Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600 font-medium">Canvas: {FIXED_CANVAS_SIZE.width}×{FIXED_CANVAS_SIZE.height}</span>
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-pid-primary text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {isSaving ? 'Saving...' : 'Save Symbol'}
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tool Palette (Left) */}
          <ToolPalette />

          {/* Canvas Area (Center) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-gray-100">
              <DesignerCanvas width={FIXED_CANVAS_SIZE.width} height={FIXED_CANVAS_SIZE.height} />
            </div>

            {/* Preview (Bottom) */}
            <div className="h-48 border-t border-gray-200 bg-gray-50">
              <SymbolPreview />
            </div>
          </div>

          {/* Properties Panel (Right) */}
          <PropertiesPanel />
        </div>

        {/* Footer / Status Bar */}
        <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>Paths: {paths.length}</span>
            <span>Ports: {ports.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Press Ctrl+Z to undo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualComponentDesigner;
