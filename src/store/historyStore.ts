/**
 * History Store
 *
 * Zustand store that wraps the CommandHistory for undo/redo functionality.
 * Provides reactive state updates for UI components.
 */

import { create } from 'zustand';
import { CommandHistory, commandHistory } from '../core/commands/CommandHistory';
import type { HistoryState } from '../core/commands/CommandHistory';
import type { Command } from '../core/commands/Command';

// Re-export command types for convenience
export type { Command } from '../core/commands/Command';
export * from '../core/commands/ComponentCommands';
export * from '../core/commands/ConnectionCommands';

interface HistoryStoreState extends HistoryState {
  // The command history instance
  history: CommandHistory;

  // Actions
  execute: (command: Command) => boolean;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;

  // Internal
  _syncFromHistory: () => void;
}

/**
 * History Store
 */
export const useHistoryStore = create<HistoryStoreState>((set) => ({
  // Initial state
  history: commandHistory,
  canUndo: false,
  canRedo: false,
  undoDescription: null,
  redoDescription: null,
  historyLength: 0,
  currentIndex: 0,

  // Sync state from command history
  _syncFromHistory: () => {
    const state = commandHistory.getState();
    set({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undoDescription: state.undoDescription,
      redoDescription: state.redoDescription,
      historyLength: state.historyLength,
      currentIndex: state.currentIndex,
    });
  },

  // Actions
  execute: (command: Command) => {
    const result = commandHistory.execute(command);
    // Sync state after execute
    const state = commandHistory.getState();
    set({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undoDescription: state.undoDescription,
      redoDescription: state.redoDescription,
      historyLength: state.historyLength,
      currentIndex: state.currentIndex,
    });
    return result;
  },

  undo: () => {
    const result = commandHistory.undo();
    // Sync state after undo
    const state = commandHistory.getState();
    set({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undoDescription: state.undoDescription,
      redoDescription: state.redoDescription,
      historyLength: state.historyLength,
      currentIndex: state.currentIndex,
    });
    return result;
  },

  redo: () => {
    const result = commandHistory.redo();
    // Sync state after redo
    const state = commandHistory.getState();
    set({
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      undoDescription: state.undoDescription,
      redoDescription: state.redoDescription,
      historyLength: state.historyLength,
      currentIndex: state.currentIndex,
    });
    return result;
  },

  clear: () => {
    commandHistory.clear();
    set({
      canUndo: false,
      canRedo: false,
      undoDescription: null,
      redoDescription: null,
      historyLength: 0,
      currentIndex: 0,
    });
  },
}));

// Selectors
export const selectCanUndo = (state: HistoryStoreState) => state.canUndo;
export const selectCanRedo = (state: HistoryStoreState) => state.canRedo;
export const selectUndoDescription = (state: HistoryStoreState) => state.undoDescription;
export const selectRedoDescription = (state: HistoryStoreState) => state.redoDescription;

export default useHistoryStore;
