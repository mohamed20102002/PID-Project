/**
 * Component Commands
 *
 * Command implementations for component operations:
 * - AddComponentCommand
 * - DeleteComponentCommand
 * - MoveComponentCommand
 * - RotateComponentCommand
 * - UpdateComponentCommand
 */

import { BaseCommand } from './Command';
import type { Command } from './Command';
import { useDiagramStore } from '../../store/diagramStore';
import type { Component, Point, ComponentRotation } from '../../types';

/**
 * Add Component Command
 */
export class AddComponentCommand extends BaseCommand {
  readonly type = 'addComponent';
  readonly description: string;

  private componentData: Omit<Component, 'kks'> & { kks?: string };
  private createdKks: string | null = null;

  constructor(componentData: Omit<Component, 'kks'> & { kks?: string }) {
    super();
    this.componentData = componentData;
    this.description = `Add ${componentData.type.split(':')[1] || componentData.type}`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    this.createdKks = store.addComponent(this.componentData);
    return this.createdKks !== null;
  }

  undo(): boolean {
    if (!this.createdKks) return false;
    const store = useDiagramStore.getState();
    store.deleteComponent(this.createdKks);
    return true;
  }

  getCreatedKks(): string | null {
    return this.createdKks;
  }
}

/**
 * Delete Component Command
 */
export class DeleteComponentCommand extends BaseCommand {
  readonly type = 'deleteComponent';
  readonly description: string;

  private kks: string;
  private deletedComponent: Component | null = null;
  private deletedConnections: Array<{ kks: string; data: unknown }> = [];

  constructor(kks: string) {
    super();
    this.kks = kks;
    this.description = `Delete component ${kks}`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();

    // Store the component data for undo
    this.deletedComponent = store.getComponent(this.kks) || null;
    if (!this.deletedComponent) return false;

    // Store connected connections for undo
    const connections = store.getConnectionsForComponent(this.kks);
    this.deletedConnections = connections.map((conn) => ({
      kks: conn.kks,
      data: { ...conn },
    }));

    // Delete the component (this also deletes connections)
    store.deleteComponent(this.kks);
    return true;
  }

  undo(): boolean {
    if (!this.deletedComponent) return false;

    const store = useDiagramStore.getState();

    // Restore the component
    store.addComponent(this.deletedComponent);

    // Restore connections
    this.deletedConnections.forEach((conn) => {
      store.addConnection(conn.data as Parameters<typeof store.addConnection>[0]);
    });

    return true;
  }
}

/**
 * Delete Multiple Components Command
 */
export class DeleteMultipleCommand extends BaseCommand {
  readonly type = 'deleteMultiple';
  readonly description: string;

  private componentKks: string[];
  private connectionIds: string[];
  private deletedComponents: Component[] = [];
  private deletedConnections: Array<{ id: string; data: unknown }> = [];

  constructor(componentKks: string[], connectionIds: string[] = []) {
    super();
    this.componentKks = componentKks;
    this.connectionIds = connectionIds;
    this.description = `Delete ${componentKks.length} component(s)`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();

    // Store components for undo
    this.deletedComponents = this.componentKks
      .map((kks) => store.getComponent(kks))
      .filter((c): c is Component => c !== undefined);

    // Store all affected connections
    const affectedConnections = new Set<string>(this.connectionIds);
    this.componentKks.forEach((kks) => {
      store.getConnectionsForComponent(kks).forEach((conn) => {
        affectedConnections.add(conn.id);
      });
    });

    this.deletedConnections = Array.from(affectedConnections)
      .map((id) => store.getConnection(id))
      .filter((c) => c !== undefined)
      .map((conn) => ({ id: conn!.id, data: { ...conn } }));

    // Delete
    store.deleteMultiple(this.componentKks, this.connectionIds);
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();

    // Restore components
    this.deletedComponents.forEach((component) => {
      store.addComponent(component);
    });

    // Restore connections
    this.deletedConnections.forEach((conn) => {
      store.addConnection(conn.data as Parameters<typeof store.addConnection>[0]);
    });

    return true;
  }
}

/**
 * Move Component Command
 */
export class MoveComponentCommand extends BaseCommand {
  readonly type = 'moveComponent';
  readonly description = 'Move component';

  private kks: string;
  private oldPosition: Point;
  private newPosition: Point;

  constructor(kks: string, oldPosition: Point, newPosition: Point) {
    super();
    this.kks = kks;
    // Deep copy positions to avoid mutation issues
    this.oldPosition = { x: oldPosition.x, y: oldPosition.y };
    this.newPosition = { x: newPosition.x, y: newPosition.y };
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    store.moveComponent(this.kks, this.newPosition);
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();
    store.moveComponent(this.kks, this.oldPosition);
    return true;
  }

  canMergeWith(other: Command): boolean {
    return (
      other instanceof MoveComponentCommand &&
      other.kks === this.kks
    );
  }

  mergeWith(other: Command): Command {
    if (other instanceof MoveComponentCommand && other.kks === this.kks) {
      // Keep original old position, use new position from other
      return new MoveComponentCommand(this.kks, this.oldPosition, other.newPosition);
    }
    return this;
  }
}

/**
 * Move Multiple Components Command
 */
export class MoveMultipleCommand extends BaseCommand {
  readonly type = 'moveMultiple';
  readonly description: string;

  private moves: Array<{ kks: string; oldPosition: Point; newPosition: Point }>;

  constructor(moves: Array<{ kks: string; oldPosition: Point; newPosition: Point }>) {
    super();
    // Deep copy positions to avoid mutation issues
    this.moves = moves.map(m => ({
      kks: m.kks,
      oldPosition: { x: m.oldPosition.x, y: m.oldPosition.y },
      newPosition: { x: m.newPosition.x, y: m.newPosition.y },
    }));
    this.description = `Move ${moves.length} component(s)`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    this.moves.forEach((move) => {
      store.moveComponent(move.kks, move.newPosition);
    });
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();
    this.moves.forEach((move) => {
      store.moveComponent(move.kks, move.oldPosition);
    });
    return true;
  }

  canMergeWith(other: Command): boolean {
    if (!(other instanceof MoveMultipleCommand)) return false;
    // Same set of components
    const thisKks = new Set(this.moves.map((m) => m.kks));
    const otherKks = new Set(other.moves.map((m) => m.kks));
    if (thisKks.size !== otherKks.size) return false;
    for (const kks of thisKks) {
      if (!otherKks.has(kks)) return false;
    }
    return true;
  }

  mergeWith(other: Command): Command {
    if (!(other instanceof MoveMultipleCommand)) return this;

    const mergedMoves = this.moves.map((move) => {
      const otherMove = other.moves.find((m) => m.kks === move.kks);
      return {
        kks: move.kks,
        oldPosition: move.oldPosition,
        newPosition: otherMove?.newPosition || move.newPosition,
      };
    });

    return new MoveMultipleCommand(mergedMoves);
  }
}

/**
 * Rotate Component Command
 */
export class RotateComponentCommand extends BaseCommand {
  readonly type = 'rotateComponent';
  readonly description = 'Rotate component';

  private kks: string;
  private oldRotation: ComponentRotation;
  private newRotation: ComponentRotation;

  constructor(kks: string, oldRotation: ComponentRotation, newRotation: ComponentRotation) {
    super();
    this.kks = kks;
    this.oldRotation = oldRotation;
    this.newRotation = newRotation;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    store.rotateComponent(this.kks, this.newRotation);
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();
    store.rotateComponent(this.kks, this.oldRotation);
    return true;
  }
}

/**
 * Update Component Properties Command
 */
export class UpdateComponentCommand extends BaseCommand {
  readonly type = 'updateComponent';
  readonly description: string;

  private kks: string;
  private oldValues: Partial<Component>;
  private newValues: Partial<Component>;

  constructor(kks: string, oldValues: Partial<Component>, newValues: Partial<Component>) {
    super();
    this.kks = kks;
    this.oldValues = oldValues;
    this.newValues = newValues;
    this.description = `Update ${kks}`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    store.updateComponent(this.kks, this.newValues);
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();
    store.updateComponent(this.kks, this.oldValues);
    return true;
  }

  canMergeWith(other: Command): boolean {
    return (
      other instanceof UpdateComponentCommand &&
      other.kks === this.kks
    );
  }

  mergeWith(other: Command): Command {
    if (other instanceof UpdateComponentCommand && other.kks === this.kks) {
      return new UpdateComponentCommand(
        this.kks,
        this.oldValues,
        { ...this.newValues, ...other.newValues }
      );
    }
    return this;
  }
}
