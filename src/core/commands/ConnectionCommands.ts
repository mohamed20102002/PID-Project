/**
 * Connection Commands
 *
 * Command implementations for connection operations:
 * - AddConnectionCommand
 * - DeleteConnectionCommand
 * - UpdateConnectionCommand
 */

import { BaseCommand } from './Command';
import { useDiagramStore } from '../../store/diagramStore';
import { Connection, Point } from '../../types';

/**
 * Add Connection Command
 */
export class AddConnectionCommand extends BaseCommand {
  readonly type = 'addConnection';
  readonly description: string;

  private connectionData: Omit<Connection, 'kks'> & { kks?: string };
  private createdKks: string | null = null;

  constructor(connectionData: Omit<Connection, 'kks'> & { kks?: string }) {
    super();
    this.connectionData = connectionData;
    this.description = `Add ${connectionData.type} connection`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    this.createdKks = store.addConnection(this.connectionData);
    return this.createdKks !== null;
  }

  undo(): boolean {
    if (!this.createdKks) return false;
    const store = useDiagramStore.getState();
    store.deleteConnection(this.createdKks);
    return true;
  }

  getCreatedKks(): string | null {
    return this.createdKks;
  }
}

/**
 * Delete Connection Command
 */
export class DeleteConnectionCommand extends BaseCommand {
  readonly type = 'deleteConnection';
  readonly description: string;

  private kks: string;
  private deletedConnection: Connection | null = null;

  constructor(kks: string) {
    super();
    this.kks = kks;
    this.description = `Delete connection ${kks}`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();

    // Store the connection data for undo
    this.deletedConnection = store.getConnection(this.kks) || null;
    if (!this.deletedConnection) return false;

    // Delete the connection
    store.deleteConnection(this.kks);
    return true;
  }

  undo(): boolean {
    if (!this.deletedConnection) return false;

    const store = useDiagramStore.getState();
    store.addConnection(this.deletedConnection);
    return true;
  }
}

/**
 * Update Connection Waypoints Command
 */
export class UpdateWaypointsCommand extends BaseCommand {
  readonly type = 'updateWaypoints';
  readonly description = 'Update connection path';

  private id: string;
  private oldWaypoints: Point[];
  private newWaypoints: Point[];

  constructor(id: string, oldWaypoints: Point[], newWaypoints: Point[]) {
    super();
    this.id = id;
    this.oldWaypoints = oldWaypoints;
    this.newWaypoints = newWaypoints;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    store.updateConnectionWaypoints(this.id, this.newWaypoints);
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();
    store.updateConnectionWaypoints(this.id, this.oldWaypoints);
    return true;
  }

  canMergeWith(other: unknown): boolean {
    return (
      other instanceof UpdateWaypointsCommand &&
      other.id === this.id
    );
  }

  mergeWith(other: unknown): UpdateWaypointsCommand {
    if (other instanceof UpdateWaypointsCommand && other.id === this.id) {
      return new UpdateWaypointsCommand(
        this.id,
        this.oldWaypoints,
        other.newWaypoints
      );
    }
    return this;
  }
}

/**
 * Update Connection Properties Command
 */
export class UpdateConnectionCommand extends BaseCommand {
  readonly type = 'updateConnection';
  readonly description: string;

  private kks: string;
  private oldValues: Partial<Connection>;
  private newValues: Partial<Connection>;

  constructor(kks: string, oldValues: Partial<Connection>, newValues: Partial<Connection>) {
    super();
    this.kks = kks;
    this.oldValues = oldValues;
    this.newValues = newValues;
    this.description = `Update connection ${kks}`;
  }

  execute(): boolean {
    const store = useDiagramStore.getState();
    store.updateConnection(this.kks, this.newValues);
    return true;
  }

  undo(): boolean {
    const store = useDiagramStore.getState();
    store.updateConnection(this.kks, this.oldValues);
    return true;
  }
}
