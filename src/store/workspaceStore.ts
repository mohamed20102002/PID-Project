/**
 * Workspace Store
 *
 * Manages multiple open diagrams in a tabbed interface.
 * Handles tab creation, switching, reordering, and closing.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Diagram } from '../types/diagram.types';

// ============================================================================
// Types
// ============================================================================

export interface DiagramTab {
  /** Unique tab ID */
  id: string;
  /** Diagram KKS */
  diagramKks: string;
  /** Display title */
  title: string;
  /** System KKS this diagram belongs to */
  systemKks: string;
  /** Whether the tab has unsaved changes */
  isDirty: boolean;
  /** The diagram data */
  diagram: Diagram;
}

interface WorkspaceState {
  /** All open tabs */
  tabs: DiagramTab[];

  /** Currently active tab ID */
  activeTabId: string | null;

  /** Maximum number of open tabs */
  maxTabs: number;
}

interface WorkspaceActions {
  /** Open a diagram in a new tab (or switch to existing) */
  openDiagram: (diagram: Diagram) => void;

  /** Close a tab by ID */
  closeTab: (tabId: string) => void;

  /** Close all tabs */
  closeAllTabs: () => void;

  /** Close tabs except the specified one */
  closeOtherTabs: (tabId: string) => void;

  /** Switch to a tab */
  setActiveTab: (tabId: string) => void;

  /** Update tab diagram data */
  updateTabDiagram: (tabId: string, diagram: Diagram) => void;

  /** Mark tab as dirty/clean */
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  /** Reorder tabs */
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  /** Get tab by ID */
  getTab: (tabId: string) => DiagramTab | undefined;

  /** Get active tab */
  getActiveTab: () => DiagramTab | undefined;

  /** Check if diagram is already open */
  isDiagramOpen: (diagramKks: string) => boolean;

  /** Find tab by diagram KKS */
  findTabByDiagram: (diagramKks: string) => DiagramTab | undefined;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: WorkspaceState = {
  tabs: [],
  activeTabId: null,
  maxTabs: 10,
};

// ============================================================================
// Store
// ============================================================================

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  immer((set, get) => ({
    ...initialState,

    openDiagram: (diagram) => set((state) => {
      // Check if already open
      const existingTab = state.tabs.find((t) => t.diagramKks === diagram.kks);
      if (existingTab) {
        state.activeTabId = existingTab.id;
        return;
      }

      // Check max tabs
      if (state.tabs.length >= state.maxTabs) {
        // Close oldest non-dirty tab
        const nonDirtyTab = state.tabs.find((t) => !t.isDirty);
        if (nonDirtyTab) {
          state.tabs = state.tabs.filter((t) => t.id !== nonDirtyTab.id);
        } else {
          // All tabs are dirty, don't open new one
          console.warn('Cannot open more tabs. Close some tabs first.');
          return;
        }
      }

      // Create new tab
      const newTab: DiagramTab = {
        id: `tab-${Date.now()}`,
        diagramKks: diagram.kks,
        title: diagram.name || diagram.kks,
        systemKks: diagram.systemKks,
        isDirty: false,
        diagram,
      };

      state.tabs.push(newTab);
      state.activeTabId = newTab.id;
    }),

    closeTab: (tabId) => set((state) => {
      const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return;

      const tab = state.tabs[tabIndex];

      // Warn if dirty
      if (tab.isDirty) {
        // In a real app, this would show a confirmation dialog
        console.warn('Closing tab with unsaved changes');
      }

      // Remove tab
      state.tabs.splice(tabIndex, 1);

      // Update active tab
      if (state.activeTabId === tabId) {
        if (state.tabs.length > 0) {
          // Switch to next tab, or previous if at end
          const newIndex = Math.min(tabIndex, state.tabs.length - 1);
          state.activeTabId = state.tabs[newIndex].id;
        } else {
          state.activeTabId = null;
        }
      }
    }),

    closeAllTabs: () => set((state) => {
      // Warn about dirty tabs
      const dirtyTabs = state.tabs.filter((t) => t.isDirty);
      if (dirtyTabs.length > 0) {
        console.warn(`Closing ${dirtyTabs.length} tabs with unsaved changes`);
      }

      state.tabs = [];
      state.activeTabId = null;
    }),

    closeOtherTabs: (tabId) => set((state) => {
      const keepTab = state.tabs.find((t) => t.id === tabId);
      if (!keepTab) return;

      // Warn about dirty tabs being closed
      const dirtyTabs = state.tabs.filter((t) => t.id !== tabId && t.isDirty);
      if (dirtyTabs.length > 0) {
        console.warn(`Closing ${dirtyTabs.length} tabs with unsaved changes`);
      }

      state.tabs = [keepTab];
      state.activeTabId = tabId;
    }),

    setActiveTab: (tabId) => set((state) => {
      if (state.tabs.some((t) => t.id === tabId)) {
        state.activeTabId = tabId;
      }
    }),

    updateTabDiagram: (tabId, diagram) => set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (tab) {
        tab.diagram = diagram;
        tab.title = diagram.name || diagram.kks;
        tab.diagramKks = diagram.kks;
        tab.systemKks = diagram.systemKks;
      }
    }),

    setTabDirty: (tabId, isDirty) => set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (tab) {
        tab.isDirty = isDirty;
      }
    }),

    reorderTabs: (fromIndex, toIndex) => set((state) => {
      if (
        fromIndex < 0 ||
        fromIndex >= state.tabs.length ||
        toIndex < 0 ||
        toIndex >= state.tabs.length
      ) {
        return;
      }

      const [removed] = state.tabs.splice(fromIndex, 1);
      state.tabs.splice(toIndex, 0, removed);
    }),

    getTab: (tabId) => {
      return get().tabs.find((t) => t.id === tabId);
    },

    getActiveTab: () => {
      const { tabs, activeTabId } = get();
      return tabs.find((t) => t.id === activeTabId);
    },

    isDiagramOpen: (diagramKks) => {
      return get().tabs.some((t) => t.diagramKks === diagramKks);
    },

    findTabByDiagram: (diagramKks) => {
      return get().tabs.find((t) => t.diagramKks === diagramKks);
    },
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectTabs = (state: WorkspaceState) => state.tabs;
export const selectActiveTabId = (state: WorkspaceState) => state.activeTabId;
export const selectActiveTab = (state: WorkspaceState & WorkspaceActions) =>
  state.getActiveTab();
export const selectTabCount = (state: WorkspaceState) => state.tabs.length;
export const selectHasDirtyTabs = (state: WorkspaceState) =>
  state.tabs.some((t) => t.isDirty);

export default useWorkspaceStore;
