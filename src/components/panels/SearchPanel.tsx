/**
 * Search Panel Component
 *
 * Provides search functionality for finding components in the diagram.
 * Searches by KKS code and component type only.
 * Supports filtering by building and safety class.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDiagramStore } from '../../store/diagramStore';
import { useUIStore } from '../../store/uiStore';
import { usePlantStore } from '../../store/plantStore';
import { SearchEngine, SearchResult, SearchOptions } from '../../core/search/SearchEngine';
import { SafetyClass, System } from '../../types/kks.types';

interface SearchPanelProps {
  className?: string;
  onResultSelect?: (result: SearchResult) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  className = '',
  onResultSelect,
}) => {
  const diagram = useDiagramStore((state) => state.diagram);
  const diagramCache = useDiagramStore((state) => state.diagramCache);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);
  const select = useUIStore((state) => state.select);
  const setViewport = useUIStore((state) => state.setViewport);
  const viewport = useUIStore((state) => state.viewport);
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const getAllBuildings = usePlantStore((state) => state.getAllBuildings);
  const plant = usePlantStore((state) => state.plant);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAllSystems, setSearchAllSystems] = useState(true);
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [safetyClassFilter, setSafetyClassFilter] = useState<SafetyClass | ''>('');

  // Get buildings list
  const buildings = useMemo(() => getAllBuildings(), [getAllBuildings]);

  // Build systems lookup for safety class filtering
  const systemsLookup = useMemo(() => {
    const lookup: Record<string, System> = {};
    if (plant) {
      for (const unit of Object.values(plant.units)) {
        for (const [systemKks, system] of Object.entries(unit.systems)) {
          lookup[systemKks] = system;
        }
      }
    }
    return lookup;
  }, [plant]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchEngine = useMemo(() => new SearchEngine(), []);

  // Update search engine when diagram or cache changes
  useEffect(() => {
    searchEngine.setDiagram(diagram);
    searchEngine.setAllDiagrams(diagramCache);
  }, [diagram, diagramCache, searchEngine]);

  // Perform search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      const searchOptions: SearchOptions = {
        searchKks: true,
        searchType: true,  // Enabled to search by component type (Valve, Pump, etc.)
        searchProperties: false,
        searchConnections: true,
        buildingFilter: buildingFilter || undefined,
        safetyClassFilter: safetyClassFilter || undefined,
        systemsLookup: safetyClassFilter ? systemsLookup : undefined,
        minScore: 0.6,  // Only show strong matches
      };
      const searchResults = searchEngine.search(query, searchOptions, searchAllSystems);
      setResults(searchResults);
      setSelectedIndex(searchResults.length > 0 ? 0 : -1);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timeout);
  }, [query, searchAllSystems, buildingFilter, safetyClassFilter, systemsLookup, searchEngine]);

  // Handle result selection with index for highlighting
  const handleSelectResult = useCallback(
    (result: SearchResult, index: number) => {
      // Validate result
      if (result.type === 'connection' && !result.id) {
        console.error('[SearchPanel] Cannot select connection without ID:', result.kks);
        alert('This pipe cannot be selected (old data format). Please delete and recreate it.');
        return;
      }

      // Update the selected index for highlighting
      setSelectedIndex(index);

      // If result is from a different system, switch to it first
      if (result.systemKks && result.systemKks !== diagram?.systemKks) {
        selectSystem(result.systemKks);
        switchToSystem(result.systemKks);
        // After switching, we need to find the component in the new diagram
        // Use a short delay to let the diagram load
        setTimeout(() => {
          // Select the component or connection using ID
          if (result.type === 'component') {
            select([result.id], []);
          } else {
            // For connections, use the ID field
            select([], [result.id!]);
          }

          // Get the diagram from cache to find the component position
          const targetDiagram = diagramCache[result.systemKks!];
          if (result.type === 'component' && targetDiagram) {
            const component = targetDiagram.components[result.id];
            if (component) {
              const targetScale = Math.max(viewport.scale, 0.8);
              setViewport({
                x: window.innerWidth / 2 - component.position.x * targetScale,
                y: window.innerHeight / 2 - component.position.y * targetScale,
                scale: targetScale,
              });
            }
          }
        }, 50);
      } else {
        // Same system - immediate navigation
        // Select the component or connection using ID
        if (result.type === 'component') {
          select([result.id], []);
        } else {
          // For connections, use the ID field
          select([], [result.id!]);
        }

        // Get component position and center viewport on it
        if (result.type === 'component' && diagram) {
          const component = diagram.components[result.id];
          if (component) {
            const targetScale = Math.max(viewport.scale, 0.8);
            setViewport({
              x: window.innerWidth / 2 - component.position.x * targetScale,
              y: window.innerHeight / 2 - component.position.y * targetScale,
              scale: targetScale,
            });
          }
        } else if (result.type === 'connection' && diagram && result.id) {
          // Use connection ID to find the connection
          const connection = diagram.connections[result.id];
          if (connection) {
            // Get source and target components to calculate center position
            const sourceComponent = diagram.components[connection.sourceComponentKks];
            const targetComponent = diagram.components[connection.targetComponentKks];

            let centerX = 0;
            let centerY = 0;

            if (connection.waypoints.length > 0) {
              // Use middle waypoint
              const midIndex = Math.floor(connection.waypoints.length / 2);
              const midPoint = connection.waypoints[midIndex];
              centerX = midPoint.x;
              centerY = midPoint.y;
            } else if (sourceComponent && targetComponent) {
              // No waypoints - calculate center between source and target
              centerX = (sourceComponent.position.x + targetComponent.position.x) / 2;
              centerY = (sourceComponent.position.y + targetComponent.position.y) / 2;
            } else if (sourceComponent) {
              // Only source available
              centerX = sourceComponent.position.x;
              centerY = sourceComponent.position.y;
            } else if (targetComponent) {
              // Only target available
              centerX = targetComponent.position.x;
              centerY = targetComponent.position.y;
            }

            const targetScale = Math.max(viewport.scale, 0.8);
            setViewport({
              x: window.innerWidth / 2 - centerX * targetScale,
              y: window.innerHeight / 2 - centerY * targetScale,
              scale: targetScale,
            });
          }
        }
      }

      onResultSelect?.(result);
    },
    [diagram, diagramCache, select, selectSystem, switchToSystem, setViewport, viewport.scale, onResultSelect]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleSelectResult(results[selectedIndex], selectedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setQuery('');
          inputRef.current?.blur();
          break;
      }
    },
    [results, selectedIndex, handleSelectResult]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Get icon for result type
  const getResultIcon = (result: SearchResult) => {
    if (result.type === 'connection') {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  };

  // Highlight matched text
  const highlightMatch = (text: string, matchText: string) => {
    if (!matchText) return text;

    const lowerText = text.toLowerCase();
    const lowerMatch = matchText.toLowerCase();
    const index = lowerText.indexOf(lowerMatch);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-200 text-yellow-900 font-medium">
          {text.slice(index, index + matchText.length)}
        </span>
        {text.slice(index + matchText.length)}
      </>
    );
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search components and pipes..."
          className="w-full pl-8 pr-4 py-2 text-sm border border-pid-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pid-primary focus:border-transparent"
        />
        <svg
          className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        {/* Loading indicator */}
        {isSearching && (
          <svg
            className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
        )}
      </div>

      {/* Filters */}
      <div className="mt-3 space-y-2 flex-shrink-0">
        {/* Search scope toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
          <input
            type="checkbox"
            checked={searchAllSystems}
            onChange={(e) => setSearchAllSystems(e.target.checked)}
            className="rounded text-pid-primary"
          />
          <span>Search all systems</span>
        </label>

        {/* Building Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Building</label>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pid-primary"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.kks} value={building.kks}>
                {building.kks} - {building.name}
              </option>
            ))}
          </select>
        </div>

        {/* Safety Class Filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Safety Class</label>
          <select
            value={safetyClassFilter}
            onChange={(e) => setSafetyClassFilter(e.target.value as SafetyClass | '')}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pid-primary"
          >
            <option value="">All Safety Classes</option>
            <option value="SC1">SC1 - Safety Class 1</option>
            <option value="SC2">SC2 - Safety Class 2</option>
            <option value="SC3">SC3 - Safety Class 3</option>
            <option value="NNS">NNS - Non-Nuclear Safety</option>
            <option value="N/A">N/A - Not Applicable</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {query && (
        <div className="mt-2 flex-1 flex flex-col min-h-0">
          {results.length > 0 ? (
            <>
              <div className="text-xs text-gray-500 mb-1 flex-shrink-0">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              <div
                ref={resultsRef}
                className="flex-1 overflow-y-auto space-y-1 min-h-0"
              >
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id || result.kks}-${result.matchField}-${result.systemKks}`}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      index === selectedIndex
                        ? 'bg-pid-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleSelectResult(result, index)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={index === selectedIndex ? 'text-white' : 'text-gray-400'}
                      >
                        {getResultIcon(result)}
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* For connections, show KKS prominently */}
                        {result.type === 'connection' ? (
                          <>
                            <div className="font-medium truncate font-mono">
                              KKS: {highlightMatch(result.kks, query)}
                            </div>
                            {result.label && result.label !== result.kks && (
                              <div
                                className={`text-xs truncate ${
                                  index === selectedIndex ? 'text-blue-100' : 'text-gray-600'
                                }`}
                              >
                                Label: {highlightMatch(result.label, query)}
                              </div>
                            )}
                            <div
                              className={`text-xs truncate ${
                                index === selectedIndex ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {result.description}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium truncate">
                              {highlightMatch(result.label, query)}
                            </div>
                            <div
                              className={`text-xs truncate ${
                                index === selectedIndex ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {result.description}
                            </div>
                            {/* Show match field and text for type searches */}
                            {result.matchField === 'Type' && result.matchText && (
                              <div
                                className={`text-xs mt-0.5 truncate ${
                                  index === selectedIndex ? 'text-blue-200' : 'text-gray-400'
                                }`}
                              >
                                Type: <span className="font-medium">{result.matchText}</span>
                              </div>
                            )}
                          </>
                        )}
                        {/* System label - Made more prominent */}
                        {result.systemKks && (
                          <div
                            className={`text-xs mt-1 font-semibold ${
                              index === selectedIndex ? 'text-blue-100' : 'text-blue-600'
                            }`}
                          >
                            📁 System: <span className="font-mono">{result.systemKks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : !isSearching ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}

      {/* Empty state */}
      {!query && (
        <div className="mt-4 text-center text-xs text-gray-400">
          <p>Search for components and pipes by:</p>
          <ul className="mt-1 space-y-0.5">
            <li>Component KKS code (e.g., "10LAA10AP001")</li>
            <li>Component type (e.g., "Valve", "Pump")</li>
            <li>Pipe KKS code (e.g., "PL-101")</li>
            <li>Pipe label (e.g., "DN100", "Cooling Water")</li>
          </ul>
          <p className="mt-2 text-gray-300">Use arrow keys to navigate, Enter to select</p>
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
