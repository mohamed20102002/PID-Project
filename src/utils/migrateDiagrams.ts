/**
 * Diagram Migration Utility
 *
 * Migrates old diagram format (connections keyed by KKS) to new format (connections keyed by unique ID)
 */

import { nanoid } from 'nanoid';
import type { Diagram, Connection } from '../types';

/**
 * Migrate a diagram from old format to new format
 * - Generates unique IDs for all connections
 * - Re-keys connections object by ID instead of KKS
 * - Updates all port.connectionKks to port.connectionId
 */
export function migrateDiagram(diagram: Diagram): Diagram {
  console.log('🔄 Migrating diagram to new connection ID format:', diagram.systemKks);

  // Map from old KKS to new ID
  const kksToIdMap = new Map<string, string>();

  // Step 1: Generate IDs for all connections and create mapping
  const oldConnections = diagram.connections;
  const newConnections: Record<string, Connection> = {};

  Object.entries(oldConnections).forEach(([oldKey, connection]) => {
    // Generate new unique ID
    const newId = nanoid();

    // Store mapping from old key to new ID
    kksToIdMap.set(oldKey, newId);

    // Create migrated connection with ID field
    const migratedConnection: Connection = {
      ...connection,
      id: newId,
      // Keep KKS as display field (oldKey was the KKS)
      kks: connection.kks || oldKey,
    };

    // Store in new connections object keyed by ID
    newConnections[newId] = migratedConnection;
  });

  // Step 2: Update all component ports to use new connectionId instead of old connectionKks
  const migratedComponents = { ...diagram.components };

  Object.values(migratedComponents).forEach(component => {
    component.ports.forEach(port => {
      if ((port as any).connectionKks) {
        // Old format: port has connectionKks
        const oldKks = (port as any).connectionKks;
        const newId = kksToIdMap.get(oldKks);

        if (newId) {
          // Update to new format
          port.connectionId = newId;
        }

        // Remove old field
        delete (port as any).connectionKks;
      }
    });
  });

  console.log(`✅ Migrated ${Object.keys(newConnections).length} connections - DIAGRAM NEEDS SAVING`);

  return {
    ...diagram,
    connections: newConnections,
    components: migratedComponents,
    // Mark as modified so it gets saved
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Check if a diagram needs migration
 */
export function needsMigration(diagram: Diagram): boolean {
  // Check if any connection is missing the 'id' field
  const connections = Object.values(diagram.connections);
  if (connections.length === 0) return false;

  const needsMigration = connections.some(conn => !conn.id);

  if (needsMigration) {
    console.log('⚠️ Diagram needs migration (old format detected)');
  }

  return needsMigration;
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
