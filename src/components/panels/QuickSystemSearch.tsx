/**
 * Quick System Search Panel
 *
 * A command palette style search panel for quickly finding and opening systems.
 * Supports searching by KKS code, system name, and description.
 * Triggered by Ctrl+K keyboard shortcut.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePlantStore } from '../../store/plantStore';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore } from '../../store/uiStore';
import type { System } from '../../types';

interface QuickSystemSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  system: System;
  unitKks: string;
  unitName: string;
  matchType: 'kks' | 'name' | 'description';
  matchText: string;
}

export const QuickSystemSearch: React.FC<QuickSystemSearchProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const plant = usePlantStore((state) => state.plant);
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);
  const saveViewportForSystem = useUIStore((state) => state.saveViewportForSystem);
  const selectedSystemKks = usePlantStore((state) => state.selectedSystemKks);

  // Get all systems with their unit info
  const allSystems = useMemo(() => {
    if (!plant) return [];

    const systems: { system: System; unitKks: string; unitName: string }[] = [];

    Object.values(plant.units).forEach((unit) => {
      Object.values(unit.systems).forEach((system) => {
        systems.push({
          system,
          unitKks: unit.kks,
          unitName: unit.name,
        });
      });
    });

    return systems;
  }, [plant]);

  // Search and filter systems
  const searchResults = useMemo((): SearchResult[] => {
    if (!query.trim()) {
      // When no query, show all systems
      return allSystems.map((item) => ({
        ...item,
        matchType: 'name' as const,
        matchText: item.system.name,
      }));
    }

    const lowerQuery = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    allSystems.forEach((item) => {
      const { system, unitKks, unitName } = item;

      // Check KKS match (highest priority)
      if (system.kks.toLowerCase().includes(lowerQuery)) {
        results.push({
          system,
          unitKks,
          unitName,
          matchType: 'kks',
          matchText: system.kks,
        });
        return;
      }

      // Check name match
      if (system.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          system,
          unitKks,
          unitName,
          matchType: 'name',
          matchText: system.name,
        });
        return;
      }

      // Check description match
      if (system.description && system.description.toLowerCase().includes(lowerQuery)) {
        results.push({
          system,
          unitKks,
          unitName,
          matchType: 'description',
          matchText: system.description,
        });
        return;
      }
    });

    // Sort: KKS matches first, then name, then description
    return results.sort((a, b) => {
      const priority = { kks: 0, name: 1, description: 2 };
      return priority[a.matchType] - priority[b.matchType];
    });
  }, [query, allSystems]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle opening a system
  const handleOpenSystem = useCallback((systemKks: string) => {
    // Save current viewport before switching
    if (selectedSystemKks) {
      saveViewportForSystem(selectedSystemKks);
    }

    // Select and switch to the system
    selectSystem(systemKks);
    switchToSystem(systemKks);

    onClose();
  }, [selectedSystemKks, saveViewportForSystem, selectSystem, switchToSystem, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, searchResults.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleOpenSystem(searchResults[selectedIndex].system.kks);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [searchResults, selectedIndex, handleOpenSystem, onClose]);

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-200 text-yellow-900 font-medium">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="relative w-[560px] max-w-[90vw] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <svg
            className="w-5 h-5 text-gray-400 mr-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search systems by KKS, name, or description..."
            className="flex-1 text-base text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">Esc</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[400px] overflow-y-auto"
        >
          {searchResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
              <p>No systems found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            searchResults.map((result, index) => (
              <div
                key={result.system.kks}
                className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 ${
                  index === selectedIndex
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleOpenSystem(result.system.kks)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* System Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  index === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <svg
                    className={`w-5 h-5 ${index === selectedIndex ? 'text-blue-600' : 'text-gray-500'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>

                {/* System Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm px-1.5 py-0.5 rounded ${
                      result.matchType === 'kks'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {result.matchType === 'kks'
                        ? highlightMatch(result.system.kks, query)
                        : result.system.kks
                      }
                    </span>
                    <span className="text-sm text-gray-400">
                      Unit {result.unitKks}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 truncate mt-0.5">
                    {result.matchType === 'name'
                      ? highlightMatch(result.system.name, query)
                      : result.system.name
                    }
                  </div>
                  {result.system.description && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {result.matchType === 'description'
                        ? highlightMatch(result.system.description, query)
                        : result.system.description
                      }
                    </div>
                  )}
                </div>

                {/* Open indicator */}
                {index === selectedIndex && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 flex-shrink-0">
                    <span>Open</span>
                    <kbd className="px-1.5 py-0.5 bg-blue-100 rounded border border-blue-200">Enter</kbd>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200">Enter</kbd>
              open system
            </span>
          </div>
          <span>{searchResults.length} system{searchResults.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default QuickSystemSearch;
