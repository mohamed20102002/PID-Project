/**
 * Terminal Link Dialog
 *
 * A modal dialog for quickly linking terminals to other systems/terminals.
 * Shows a browsable list of systems and their terminals for easy selection.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { usePlantStore } from '../../store/plantStore';
import { useDiagramStore } from '../../store/diagramStore';
import { StorageService } from '../../services/StorageService';
import type { Component, Diagram } from '../../types';

interface TerminalLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    targetSystemKks: string,
    targetTerminalKks: string,
    targetTerminalProperties?: Record<string, unknown>
  ) => void;
  currentSystemKks: string;
  currentTerminalKks: string;
}

interface TerminalInfo {
  kks: string;
  label: string;
  targetSystemKks?: string;
  targetTerminalKks?: string;
}

interface SystemTerminals {
  systemKks: string;
  systemName: string;
  unitKks: string;
  terminals: TerminalInfo[];
}

export const TerminalLinkDialog: React.FC<TerminalLinkDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentSystemKks,
  currentTerminalKks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystemKks, setSelectedSystemKks] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get all systems from plant store
  const getAllSystems = usePlantStore((state) => state.getAllSystems);
  const getAllUnits = usePlantStore((state) => state.getAllUnits);

  // Get diagram cache and current diagram - we'll load diagrams directly via StorageService
  const diagramCache = useDiagramStore((state) => state.diagramCache);
  const currentDiagram = useDiagramStore((state) => state.diagram);

  // Use ref to store loaded diagrams to avoid stale closure issues
  const loadedDiagramsRef = useRef<Record<string, Diagram>>({});
  // State to trigger re-render when diagrams are loaded
  const [loadedDiagrams, setLoadedDiagrams] = useState<Record<string, Diagram>>({});

  // Load all system diagrams when dialog opens
  useEffect(() => {
    if (isOpen) {
      const loadAllDiagrams = async () => {
        setIsLoading(true);
        const systems = getAllSystems();
        const newlyLoaded: Record<string, Diagram> = {};

        // Load diagrams for all systems (including current system for same-system terminal linking)
        for (const system of systems) {
          if (system.kks === currentSystemKks) {
            // Use the current active diagram for the current system
            if (currentDiagram) {
              newlyLoaded[system.kks] = currentDiagram;
            }
          } else {
            // Check cache first
            if (diagramCache[system.kks]) {
              newlyLoaded[system.kks] = diagramCache[system.kks];
            } else {
              // Load from file
              const result = await StorageService.loadDiagram(system.kks);
              if (result.success && result.diagram) {
                newlyLoaded[system.kks] = result.diagram;
              }
            }
          }
        }

        // Update both ref and state
        loadedDiagramsRef.current = newlyLoaded;
        setLoadedDiagrams(newlyLoaded);
        setIsLoading(false);
      };

      loadAllDiagrams();
    }
  }, [isOpen, getAllSystems, currentSystemKks, currentDiagram, diagramCache]);

  // Build list of systems with their terminals
  const systemsWithTerminals = useMemo((): SystemTerminals[] => {
    const systems = getAllSystems();
    const units = getAllUnits();

    // Create a map of unit KKS to unit name
    const unitMap = new Map<string, string>();
    units.forEach(unit => {
      unitMap.set(unit.kks, unit.name);
      // Also map systems to their unit
      Object.keys(unit.systems).forEach(sysKks => {
        unitMap.set(`sys:${sysKks}`, unit.kks);
      });
    });

    return systems
      .map(system => {
        // Use loadedDiagrams which contains both cached and freshly loaded diagrams
        const diagram = loadedDiagrams[system.kks];
        const terminals: TerminalInfo[] = [];
        const isCurrentSystem = system.kks === currentSystemKks;

        if (diagram?.components) {
          Object.values(diagram.components).forEach((comp: Component) => {
            if (comp.type.startsWith('terminals:')) {
              // Exclude the current terminal being linked (can't link to itself)
              if (isCurrentSystem && comp.kks === currentTerminalKks) {
                return;
              }
              const props = comp.properties as Record<string, string>;
              terminals.push({
                kks: comp.kks,
                label: props.label || comp.kks,
                targetSystemKks: props.targetSystemKks,
                targetTerminalKks: props.targetTerminalKks,
              });
            }
          });
        }

        // Find unit for this system
        let unitKks = '';
        units.forEach(unit => {
          if (unit.systems[system.kks]) {
            unitKks = unit.kks;
          }
        });

        return {
          systemKks: system.kks,
          systemName: system.name + (isCurrentSystem ? ' (Current)' : ''),
          unitKks,
          terminals,
        };
      })
      .filter(sys => sys.terminals.length > 0 || searchQuery.length === 0); // Show systems with terminals, or all if no search
  }, [getAllSystems, getAllUnits, loadedDiagrams, currentSystemKks, currentTerminalKks, searchQuery]);

  // Filter by search query
  const filteredSystems = useMemo(() => {
    if (!searchQuery.trim()) return systemsWithTerminals;

    const query = searchQuery.toUpperCase();
    return systemsWithTerminals
      .map(sys => ({
        ...sys,
        terminals: sys.terminals.filter(
          t => t.kks.toUpperCase().includes(query) ||
               t.label.toUpperCase().includes(query)
        ),
      }))
      .filter(
        sys =>
          sys.systemKks.toUpperCase().includes(query) ||
          sys.systemName.toUpperCase().includes(query) ||
          sys.terminals.length > 0
      );
  }, [systemsWithTerminals, searchQuery]);

  // Get terminals for selected system
  const selectedSystemTerminals = useMemo(() => {
    if (!selectedSystemKks) return [];
    const system = filteredSystems.find(s => s.systemKks === selectedSystemKks);
    return system?.terminals || [];
  }, [selectedSystemKks, filteredSystems]);

  const handleSystemClick = useCallback((systemKks: string) => {
    setSelectedSystemKks(prev => prev === systemKks ? null : systemKks);
  }, []);

  const handleTerminalSelect = useCallback((systemKks: string, terminalKks: string) => {
    // Use ref to get the latest loaded diagrams (avoids stale closure)
    const diagrams = loadedDiagramsRef.current;
    const targetDiagram = diagrams[systemKks];
    const targetTerminal = targetDiagram?.components?.[terminalKks];
    const targetTerminalProperties = targetTerminal?.properties as Record<string, unknown> | undefined;

    onSelect(systemKks, terminalKks, targetTerminalProperties);
    onClose();
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedSystemKks(null);
    loadedDiagramsRef.current = {}; // Clear ref
    setLoadedDiagrams({}); // Clear state
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Link Terminal</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search systems or terminals..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px] max-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-8 h-8 mb-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              <p className="text-sm">Loading systems...</p>
            </div>
          ) : filteredSystems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 9h.01M15 9h.01M9 15h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No systems with terminals found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSystems.map(system => (
                <div key={system.systemKks} className="rounded-lg overflow-hidden">
                  {/* System Header */}
                  <button
                    onClick={() => handleSystemClick(system.systemKks)}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${
                      selectedSystemKks === system.systemKks
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          selectedSystemKks === system.systemKks ? 'rotate-90' : ''
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <div>
                        <span className="font-mono font-medium">{system.systemKks}</span>
                        <span className="text-gray-400 mx-2">-</span>
                        <span className="text-sm">{system.systemName}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {system.terminals.length} terminal{system.terminals.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Terminals List */}
                  {selectedSystemKks === system.systemKks && system.terminals.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      {system.terminals.map(terminal => {
                        // Check if this terminal links back to our current system
                        const linksToCurrentSystem = terminal.targetSystemKks === currentSystemKks;
                        const linksToCurrentTerminal = terminal.targetTerminalKks === currentTerminalKks;

                        return (
                          <button
                            key={terminal.kks}
                            onClick={() => handleTerminalSelect(system.systemKks, terminal.kks)}
                            className="w-full px-3 py-2 pl-10 flex items-center justify-between text-left hover:bg-blue-50 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                              </svg>
                              <span className="font-mono text-sm">{terminal.kks}</span>
                              {terminal.label && terminal.label !== terminal.kks && (
                                <span className="text-xs text-gray-400">({terminal.label})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {linksToCurrentSystem && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  linksToCurrentTerminal
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {linksToCurrentTerminal ? 'Linked to you' : 'Links to your system'}
                                </span>
                              )}
                              <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500">
            Select a terminal to link. Bidirectional links are created automatically.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TerminalLinkDialog;
