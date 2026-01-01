/**
 * Command History
 *
 * Manages the undo/redo stack for commands.
 * Provides functionality to execute, undo, and redo commands.
 */

import { Command } from './Command';

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  historyLength: number;
  currentIndex: number;
}

export type HistoryChangeListener = (state: HistoryState) => void;

/**
 * CommandHistory class for managing undo/redo
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number;
  private listeners: Set<HistoryChangeListener> = new Set();
  private mergeTimeout: number = 500; // ms to consider commands mergeable
  private lastExecuteTime: number = 0;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Execute a command and add it to the history
   */
  execute(command: Command): boolean {
    const success = command.execute();

    if (success) {
      const now = Date.now();
      const timeSinceLastExecute = now - this.lastExecuteTime;
      this.lastExecuteTime = now;

      // Try to merge with the previous command
      if (
        this.undoStack.length > 0 &&
        timeSinceLastExecute < this.mergeTimeout
      ) {
        const lastCommand = this.undoStack[this.undoStack.length - 1];
        if (lastCommand.canMergeWith?.(command)) {
          const merged = lastCommand.mergeWith?.(command);
          if (merged) {
            this.undoStack[this.undoStack.length - 1] = merged;
            this.notifyListeners();
            return true;
          }
        }
      }

      // Add to undo stack
      this.undoStack.push(command);

      // Clear redo stack when new command is executed
      this.redoStack = [];

      // Trim history if needed
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      this.notifyListeners();
    }

    return success;
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.undoStack.pop()!;
    const success = command.undo();

    if (success) {
      this.redoStack.push(command);
      this.notifyListeners();
    } else {
      // Put it back if undo failed
      this.undoStack.push(command);
    }

    return success;
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const command = this.redoStack.pop()!;
    const success = command.redo ? command.redo() : command.execute();

    if (success) {
      this.undoStack.push(command);
      this.notifyListeners();
    } else {
      // Put it back if redo failed
      this.redoStack.push(command);
    }

    return success;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the description of the command that would be undone
   */
  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  /**
   * Get the description of the command that would be redone
   */
  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }

  /**
   * Get current history state
   */
  getState(): HistoryState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.getUndoDescription(),
      redoDescription: this.getRedoDescription(),
      historyLength: this.undoStack.length,
      currentIndex: this.undoStack.length,
    };
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  /**
   * Subscribe to history changes
   */
  subscribe(listener: HistoryChangeListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Set merge timeout (ms)
   */
  setMergeTimeout(ms: number): void {
    this.mergeTimeout = ms;
  }

  /**
   * Get the undo stack (for debugging/display)
   */
  getUndoStack(): readonly Command[] {
    return this.undoStack;
  }

  /**
   * Get the redo stack (for debugging/display)
   */
  getRedoStack(): readonly Command[] {
    return this.redoStack;
  }
}

// Create a singleton instance
export const commandHistory = new CommandHistory();

export default CommandHistory;
