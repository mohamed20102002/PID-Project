/**
 * System Tabs Component
 *
 * Tab bar for managing multiple open system diagrams.
 * Supports tab switching, closing, and context menu actions.
 */

import React, { useState, useCallback } from 'react';
import { useDiagramStore } from '../../store/diagramStore';
import { usePlantStore } from '../../store/plantStore';
import { useUIStore } from '../../store/uiStore';

interface SystemTab {
  systemKks: string;
  name: string;
}

interface SystemTabsProps {
  className?: string;
}

export const SystemTabs: React.FC<SystemTabsProps> = ({ className = '' }) => {
  // Get state from stores
  const diagram = useDiagramStore((state) => state.diagram);
  const diagramCache = useDiagramStore((state) => state.diagramCache);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);
  const saveCurrentDiagram = useDiagramStore((state) => state.saveCurrentDiagram);
  const closeDiagram = useDiagramStore((state) => state.closeDiagram);

  const plant = usePlantStore((state) => state.plant);
  const selectSystem = usePlantStore((state) => state.selectSystem);

  // UI Store for viewport management
  const saveViewportForSystem = useUIStore((state) => state.saveViewportForSystem);
  const restoreViewportForSystem = useUIStore((state) => state.restoreViewportForSystem);

  // Build tabs from diagramCache
  const tabs: SystemTab[] = Object.entries(diagramCache)
    .filter(([systemKks]) => systemKks && systemKks !== 'undefined' && systemKks !== 'null')
    .map(([systemKks, diag]) => {
      // Try to find system name from plant
      let name = diag?.name || systemKks;
      if (plant) {
        for (const unit of Object.values(plant.units)) {
          const system = unit.systems[systemKks];
          if (system) {
            name = system.name || systemKks;
            break;
          }
        }
      }
      return { systemKks, name };
    });

  // Handle Home tab click
  const handleHomeClick = useCallback(async () => {
    // Save current diagram first
    if (diagram) {
      await saveCurrentDiagram();
    }
    // Close current diagram to show Home
    closeDiagram();
    selectSystem(null);
  }, [diagram, saveCurrentDiagram, closeDiagram, selectSystem]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    systemKks: string;
  } | null>(null);

  // Handle tab click
  const handleTabClick = useCallback(
    async (systemKks: string) => {
      if (diagram?.systemKks === systemKks) return; // Already active

      // Save current viewport before switching
      if (diagram?.systemKks) {
        saveViewportForSystem(diagram.systemKks);
      }

      // Save current diagram first
      await saveCurrentDiagram();

      // Switch to the selected system
      selectSystem(systemKks);
      await switchToSystem(systemKks);

      // Restore viewport for target system after a brief delay
      setTimeout(() => {
        restoreViewportForSystem(systemKks);
      }, 50);
    },
    [diagram, saveCurrentDiagram, selectSystem, switchToSystem, saveViewportForSystem, restoreViewportForSystem]
  );

  // Handle tab close
  const handleTabClose = useCallback(
    (e: React.MouseEvent, systemKks: string) => {
      e.stopPropagation();
      e.preventDefault();

      // Remove from cache
      useDiagramStore.setState((state) => {
        const newCache = { ...state.diagramCache };
        delete newCache[systemKks];

        // If closing the active tab, switch to another or go to Home
        if (state.diagram?.systemKks === systemKks) {
          const remainingTabs = Object.keys(newCache);
          if (remainingTabs.length > 0) {
            const nextSystemKks = remainingTabs[0];
            return {
              diagramCache: newCache,
              diagram: newCache[nextSystemKks] ? { ...newCache[nextSystemKks] } : null,
            };
          } else {
            // No remaining tabs - go to Home
            return {
              diagramCache: newCache,
              diagram: null,
            };
          }
        }

        return { diagramCache: newCache };
      });

      // Update plant store selection if needed
      if (diagram?.systemKks === systemKks) {
        const remainingTabs = tabs.filter(t => t.systemKks !== systemKks);
        if (remainingTabs.length > 0) {
          selectSystem(remainingTabs[0].systemKks);
        } else {
          selectSystem(null);
        }
      }
    },
    [tabs, diagram, selectSystem]
  );

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, systemKks: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, systemKks });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle context menu actions
  const handleCloseTab = useCallback(() => {
    if (contextMenu) {
      handleTabClose({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent, contextMenu.systemKks);
      closeContextMenu();
    }
  }, [contextMenu, handleTabClose, closeContextMenu]);

  const handleCloseOthers = useCallback(() => {
    if (contextMenu) {
      // Keep only the selected tab
      useDiagramStore.setState((state) => {
        const keepDiagram = state.diagramCache[contextMenu.systemKks];
        if (!keepDiagram) return {};

        return {
          diagramCache: { [contextMenu.systemKks]: keepDiagram },
          diagram: state.diagram?.systemKks === contextMenu.systemKks
            ? state.diagram
            : { ...keepDiagram },
        };
      });

      selectSystem(contextMenu.systemKks);
      closeContextMenu();
    }
  }, [contextMenu, selectSystem, closeContextMenu]);

  const handleCloseAll = useCallback(() => {
    // Keep only the current active tab
    if (diagram) {
      useDiagramStore.setState((state) => ({
        diagramCache: state.diagram
          ? { [state.diagram.systemKks]: state.diagram }
          : {},
      }));
    }
    closeContextMenu();
  }, [diagram, closeContextMenu]);

  // Click outside to close context menu
  React.useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = () => closeContextMenu();
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <div className={`flex items-center bg-gray-100 border-b border-pid-border ${className}`}>
      {/* Tabs Container */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
        {/* Home Tab - Always visible */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 min-w-[80px] cursor-pointer border-r border-gray-200 transition-colors ${
            !diagram
              ? 'bg-white border-b-2 border-b-pid-primary -mb-px'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={handleHomeClick}
        >
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 ${!diagram ? 'text-pid-primary' : 'text-gray-400'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className={`text-xs ${!diagram ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
            Home
          </span>
        </div>

        {/* System Tabs */}
        {tabs.map((tab) => (
          <div
            key={tab.systemKks}
            className={`flex items-center gap-2 px-3 py-1.5 min-w-[100px] max-w-[180px] cursor-pointer border-r border-gray-200 group transition-colors ${
              tab.systemKks === diagram?.systemKks
                ? 'bg-white border-b-2 border-b-pid-primary -mb-px'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => handleTabClick(tab.systemKks)}
            onContextMenu={(e) => handleContextMenu(e, tab.systemKks)}
          >
            {/* Icon */}
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                tab.systemKks === diagram?.systemKks ? 'text-pid-primary' : 'text-gray-400'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>

            {/* System KKS */}
            <span
              className={`flex-1 text-xs truncate ${
                tab.systemKks === diagram?.systemKks ? 'text-gray-900 font-medium' : 'text-gray-600'
              }`}
              title={`${tab.systemKks}: ${tab.name}`}
            >
              {tab.systemKks}
            </span>

            {/* Close button - always visible */}
            <button
              className="p-0.5 rounded hover:bg-gray-300 transition-colors ml-1"
              onClick={(e) => handleTabClose(e, tab.systemKks)}
              title="Close tab"
            >
              <svg
                className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-pid-border py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-1.5 text-sm text-left hover:bg-gray-100"
            onClick={handleCloseTab}
          >
            Close
          </button>
          <button
            className="w-full px-4 py-1.5 text-sm text-left hover:bg-gray-100"
            onClick={handleCloseOthers}
            disabled={tabs.length <= 1}
          >
            Close Others
          </button>
          <button
            className="w-full px-4 py-1.5 text-sm text-left hover:bg-gray-100"
            onClick={handleCloseAll}
            disabled={tabs.length <= 1}
          >
            Close All
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemTabs;
