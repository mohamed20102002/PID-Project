/**
 * Diagram Migration Utility
 *
 * Migrates old diagram formats to new format:
 * - Components keyed by internal ID instead of KKS
 * - Connections keyed by internal ID
 * - Connection references use component ID instead of KKS
 */

import { nanoid } from 'nanoid';
import type { Diagram, Connection, Component } from '../types';

/**
 * Migrate a diagram from old format to new format
 * - Generates unique IDs for all components
 * - Generates unique IDs for all connections
 * - Re-keys objects by ID instead of KKS
 * - Updates connection references to use component IDs
 */
export function migrateDiagram(diagram: Diagram): Diagram {
  console.log('🔄 Migrating diagram to new ID format:', diagram.systemKks);

  // Maps from old keys to new IDs
  const componentKksToIdMap = new Map<string, string>();
  const connectionKksToIdMap = new Map<string, string>();

  // Step 1: Generate IDs for all components and create mapping
  const oldComponents = diagram.components;
  const newComponents: Record<string, Component> = {};

  Object.entries(oldComponents).forEach(([oldKey, component]) => {
    // Check if component already has an ID (new format)
    let componentId = (component as any).id;
    if (!componentId) {
      // Generate new unique ID
      componentId = nanoid(10);
    }

    // Store mapping from old key (KKS) to new ID
    componentKksToIdMap.set(oldKey, componentId);

    // Create migrated component with ID field
    const migratedComponent: Component = {
      ...component,
      id: componentId,
      // Keep KKS as display field
      kks: component.kks || oldKey,
    };

    // Store in new components object keyed by ID
    newComponents[componentId] = migratedComponent;
  });

  // Step 2: Generate IDs for all connections and update references
  const oldConnections = diagram.connections;
  const newConnections: Record<string, Connection> = {};

  Object.entries(oldConnections).forEach(([oldKey, connection]) => {
    // Check if connection already has an ID (new format)
    let connectionId = connection.id;
    if (!connectionId) {
      // Generate new unique ID
      connectionId = nanoid();
    }

    // Store mapping from old key to new ID
    connectionKksToIdMap.set(oldKey, connectionId);

    // Map old component KKS references to new component IDs
    const sourceComponentId = componentKksToIdMap.get(
      (connection as any).sourceComponentKks || (connection as any).sourceComponentId
    ) || (connection as any).sourceComponentId;

    const targetComponentId = componentKksToIdMap.get(
      (connection as any).targetComponentKks || (connection as any).targetComponentId
    ) || (connection as any).targetComponentId;

    // Create migrated connection with ID field and updated references
    const migratedConnection: Connection = {
      ...connection,
      id: connectionId,
      kks: connection.kks || oldKey,
      sourceComponentId,
      targetComponentId,
    };

    // Remove old fields if present
    delete (migratedConnection as any).sourceComponentKks;
    delete (migratedConnection as any).targetComponentKks;

    // Store in new connections object keyed by ID
    newConnections[connectionId] = migratedConnection;
  });

  // Step 3: Update all component ports to use new connectionId instead of old connectionKks
  Object.values(newComponents).forEach(component => {
    component.ports.forEach(port => {
      if ((port as any).connectionKks) {
        // Old format: port has connectionKks
        const oldKks = (port as any).connectionKks;
        const newId = connectionKksToIdMap.get(oldKks);

        if (newId) {
          // Update to new format
          port.connectionId = newId;
        }

        // Remove old field
        delete (port as any).connectionKks;
      }
    });
  });

  console.log(`✅ Migrated ${Object.keys(newComponents).length} components and ${Object.keys(newConnections).length} connections - DIAGRAM NEEDS SAVING`);

  return {
    ...diagram,
    connections: newConnections,
    components: newComponents,
    // Mark as modified so it gets saved
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Check if a diagram needs migration
 */
export function needsMigration(diagram: Diagram): boolean {
  // Check if any component is missing the 'id' field
  const components = Object.values(diagram.components);
  const componentNeedsMigration = components.some(comp => !(comp as any).id);

  // Check if any connection is missing the 'id' field or still uses old KKS references
  const connections = Object.values(diagram.connections);
  const connectionNeedsMigration = connections.some(
    conn => !conn.id ||
    (conn as any).sourceComponentKks ||
    (conn as any).targetComponentKks
  );

  const needsMig = componentNeedsMigration || connectionNeedsMigration;

  if (needsMig) {
    console.log('⚠️ Diagram needs migration (old format detected)');
  }

  return needsMig;
}

/**
 * Migrate diagram if needed
 */
export function migrateIfNeeded(diagram: Diagram): Diagram {
  if (needsMigration(diagram)) {
    return migrateDiagram(diagram);
  }
  return diagram;
}
