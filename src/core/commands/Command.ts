/**
 * Command Interface
 *
 * Base interface for all undoable commands following the Command Pattern.
 * Each command encapsulates an action that can be executed and undone.
 */

export interface Command {
  /**
   * Unique identifier for the command type
   */
  readonly type: string;

  /**
   * Human-readable description for UI display
   */
  readonly description: string;

  /**
   * Execute the command
   * @returns true if the command was executed successfully
   */
  execute(): boolean;

  /**
   * Undo the command (reverse the action)
   * @returns true if the command was undone successfully
   */
  undo(): boolean;

  /**
   * Optional: Redo the command (same as execute but may have optimizations)
   * Default implementation calls execute()
   */
  redo?(): boolean;

  /**
   * Optional: Check if this command can be merged with another
   * Used for combining multiple small changes (e.g., continuous dragging)
   */
  canMergeWith?(other: Command): boolean;

  /**
   * Optional: Merge this command with another
   * Returns a new merged command
   */
  mergeWith?(other: Command): Command;
}

/**
 * Abstract base class for commands with common functionality
 */
export abstract class BaseCommand implements Command {
  abstract readonly type: string;
  abstract readonly description: string;

  abstract execute(): boolean;
  abstract undo(): boolean;

  redo(): boolean {
    return this.execute();
  }

  canMergeWith(_other: Command): boolean {
    return false;
  }

  mergeWith(_other: Command): Command {
    return this;
  }
}

/**
 * Batch command for grouping multiple commands as one undo unit
 */
export class BatchCommand implements Command {
  readonly type = 'batch';
  readonly description: string;
  private commands: Command[];

  constructor(commands: Command[], description?: string) {
    this.commands = commands;
    this.description = description || `Batch: ${commands.length} operations`;
  }

  execute(): boolean {
    let success = true;
    for (const cmd of this.commands) {
      if (!cmd.execute()) {
        success = false;
        // Rollback on failure
        const executed = this.commands.slice(0, this.commands.indexOf(cmd));
        for (const execCmd of executed.reverse()) {
          execCmd.undo();
        }
        break;
      }
    }
    return success;
  }

  undo(): boolean {
    let success = true;
    // Undo in reverse order
    for (const cmd of [...this.commands].reverse()) {
      if (!cmd.undo()) {
        success = false;
      }
    }
    return success;
  }

  redo(): boolean {
    return this.execute();
  }

  getCommands(): Command[] {
    return [...this.commands];
  }
}
