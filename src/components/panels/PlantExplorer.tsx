/**
 * Plant Explorer Component
 *
 * Hierarchical tree view for navigating the plant structure:
 * Plant → Units → Systems / Buildings
 * Also shows Common Buildings at plant level.
 */

import React, { useState, useCallback } from 'react';
import { usePlantStore } from '../../store/plantStore';
import { useDiagramStore } from '../../store/diagramStore';
import { Unit, System, Building, SafetyClass, SeismicClass, SystemType, SystemConnection } from '../../types/kks.types';

interface PlantExplorerProps {
  className?: string;
}

type TreeNodeType = 'plant' | 'unit' | 'systems-folder' | 'system' | 'buildings-folder' | 'building' | 'common-buildings';
type DialogType = 'editPlant' | 'addUnit' | 'addSystem' | 'editSystem' | 'addUnitBuilding' | 'addCommonBuilding' | 'deleteConfirm' | null;

interface TreeNode {
  id: string;
  type: TreeNodeType;
  label: string;
  parentUnitKks?: string;
  children?: TreeNode[];
  data?: Unit | System | Building;
}

const SAFETY_CLASSES: SafetyClass[] = ['SC1', 'SC2', 'SC3', 'NNS', 'N/A'];
const SEISMIC_CLASSES: SeismicClass[] = ['S1', 'S2', 'S3', 'NS', 'N/A'];

export const PlantExplorer: React.FC<PlantExplorerProps> = ({ className = '' }) => {
  const plant = usePlantStore((state) => state.plant);
  const selectedUnitKks = usePlantStore((state) => state.selectedUnitKks);
  const selectedSystemKks = usePlantStore((state) => state.selectedSystemKks);
  const selectUnit = usePlantStore((state) => state.selectUnit);
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const updatePlant = usePlantStore((state) => state.updatePlant);
  const addUnit = usePlantStore((state) => state.addUnit);
  const addSystem = usePlantStore((state) => state.addSystem);
  const updateSystem = usePlantStore((state) => state.updateSystem);
  const deleteUnit = usePlantStore((state) => state.deleteUnit);
  const deleteSystem = usePlantStore((state) => state.deleteSystem);
  const addBuilding = usePlantStore((state) => state.addBuilding);
  const deleteBuilding = usePlantStore((state) => state.deleteBuilding);
  const addUnitBuilding = usePlantStore((state) => state.addUnitBuilding);
  const deleteUnitBuilding = usePlantStore((state) => state.deleteUnitBuilding);
  const addSystemConnection = usePlantStore((state) => state.addSystemConnection);
  const removeSystemConnection = usePlantStore((state) => state.removeSystemConnection);
  const getAllSystems = usePlantStore((state) => state.getAllSystems);

  const switchToSystem = useDiagramStore((state) => state.switchToSystem);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['plant', 'common-buildings']));
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemKks, setNewItemKks] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newSafetyClass, setNewSafetyClass] = useState<SafetyClass>('N/A');
  const [newSeismicClass, setNewSeismicClass] = useState<SeismicClass>('N/A');
  const [selectedSystemTypes, setSelectedSystemTypes] = useState<SystemType[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<SystemConnection[]>([]);
  const [connectionInput, setConnectionInput] = useState('');

  // For editing
  const [editingSystemKks, setEditingSystemKks] = useState<string | null>(null);
  const [editingUnitKks, setEditingUnitKks] = useState<string | null>(null);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{
    type: TreeNodeType;
    id: string;
    label: string;
    parentUnitKks?: string;
    systemCount?: number;
    buildingCount?: number;
  } | null>(null);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle node selection
  const handleNodeSelect = useCallback(
    (node: TreeNode) => {
      // Prevent selection when a dialog is open or switching systems
      if (activeDialog || isSwitching) return;

      switch (node.type) {
        case 'unit':
          selectUnit(node.id);
          break;
        case 'system':
          setIsSwitching(true);
          selectSystem(node.id);
          switchToSystem(node.id);
          // Reset switching state after a brief delay
          setTimeout(() => setIsSwitching(false), 500);
          break;
      }
    },
    [selectUnit, selectSystem, switchToSystem, activeDialog, isSwitching]
  );

  // Reset dialog state
  const resetDialogState = useCallback(() => {
    setActiveDialog(null);
    setNewItemName('');
    setNewItemKks('');
    setNewItemDescription('');
    setNewSafetyClass('N/A');
    setNewSeismicClass('N/A');
    setSelectedSystemTypes([]);
    setSelectedConnections([]);
    setConnectionInput('');
    setDeleteTarget(null);
    setEditingSystemKks(null);
    setEditingUnitKks(null);
    setIsSwitching(false);
  }, []);

  // Handle update plant name
  const handleUpdatePlant = useCallback(() => {
    if (newItemName && newItemKks) {
      updatePlant({ name: newItemName, kks: newItemKks });
      resetDialogState();
    }
  }, [newItemName, newItemKks, updatePlant, resetDialogState]);

  // Handle add unit
  const handleAddUnit = useCallback(() => {
    if (newItemKks && newItemName) {
      addUnit(newItemKks.toUpperCase(), newItemName, newItemDescription);
      resetDialogState();
    }
  }, [newItemKks, newItemName, newItemDescription, addUnit, resetDialogState]);

  // Handle add system
  const handleAddSystem = useCallback(() => {
    if (editingUnitKks && newItemKks && newItemName) {
      addSystem(
        editingUnitKks,
        newItemKks.toUpperCase(),
        newItemName,
        newItemDescription,
        newSafetyClass,
        newSeismicClass,
        selectedSystemTypes
      );
      // Add connections after creating the system
      for (const conn of selectedConnections) {
        addSystemConnection(newItemKks.toUpperCase(), conn);
      }
      resetDialogState();
    }
  }, [editingUnitKks, newItemKks, newItemName, newItemDescription, newSafetyClass, newSeismicClass, selectedSystemTypes, selectedConnections, addSystem, addSystemConnection, resetDialogState]);

  // Handle edit system
  const handleEditSystem = useCallback(() => {
    if (editingSystemKks && newItemName) {
      updateSystem(editingSystemKks, {
        name: newItemName,
        description: newItemDescription,
        safetyClass: newSafetyClass,
        seismicClass: newSeismicClass,
        systemTypes: selectedSystemTypes,
        connectedSystems: selectedConnections,
      });
      resetDialogState();
    }
  }, [editingSystemKks, newItemName, newItemDescription, newSafetyClass, newSeismicClass, selectedSystemTypes, selectedConnections, updateSystem, resetDialogState]);

  // Add connection to list
  const handleAddConnection = useCallback(() => {
    if (connectionInput) {
      const kks = connectionInput.toUpperCase();
      // Check if already added
      if (!selectedConnections.some(c => c.targetSystemKks === kks)) {
        setSelectedConnections([...selectedConnections, { targetSystemKks: kks }]);
      }
      setConnectionInput('');
    }
  }, [connectionInput, selectedConnections]);

  // Remove connection from list
  const handleRemoveConnection = useCallback((targetKks: string) => {
    setSelectedConnections(selectedConnections.filter(c => c.targetSystemKks !== targetKks));
  }, [selectedConnections]);

  // Handle add unit building
  const handleAddUnitBuilding = useCallback(() => {
    if (editingUnitKks && newItemKks && newItemName) {
      addUnitBuilding(editingUnitKks, {
        kks: newItemKks.toUpperCase(),
        name: newItemName,
        abbreviation: newItemKks.toUpperCase(),
        floors: [{ id: 'L0', name: 'Level 0', elevation: 0 }],
      });
      resetDialogState();
    }
  }, [editingUnitKks, newItemKks, newItemName, addUnitBuilding, resetDialogState]);

  // Handle add common building
  const handleAddCommonBuilding = useCallback(() => {
    if (newItemKks && newItemName) {
      addBuilding({
        kks: newItemKks.toUpperCase(),
        name: newItemName,
        abbreviation: newItemKks.toUpperCase(),
        floors: [{ id: 'L0', name: 'Level 0', elevation: 0 }],
      });
      resetDialogState();
    }
  }, [newItemKks, newItemName, addBuilding, resetDialogState]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;

    switch (deleteTarget.type) {
      case 'unit':
        deleteUnit(deleteTarget.id);
        break;
      case 'system':
        deleteSystem(deleteTarget.id);
        break;
      case 'building':
        if (deleteTarget.parentUnitKks) {
          deleteUnitBuilding(deleteTarget.parentUnitKks, deleteTarget.id);
        } else {
          deleteBuilding(deleteTarget.id);
        }
        break;
    }
    resetDialogState();
  }, [deleteTarget, deleteUnit, deleteSystem, deleteBuilding, deleteUnitBuilding, resetDialogState]);

  // Open delete confirmation with detailed info
  const confirmDelete = useCallback((type: TreeNodeType, id: string, label: string, parentUnitKks?: string) => {
    let systemCount = 0;
    let buildingCount = 0;

    if (type === 'unit' && plant) {
      const unit = plant.units[id];
      if (unit) {
        systemCount = Object.keys(unit.systems).length;
        buildingCount = unit.buildings ? Object.keys(unit.buildings).length : 0;
      }
    }

    setDeleteTarget({ type, id, label, parentUnitKks, systemCount, buildingCount });
    setActiveDialog('deleteConfirm');
  }, [plant]);

  // Open edit system dialog
  const openEditSystem = useCallback((system: System) => {
    setEditingSystemKks(system.kks);
    setNewItemKks(system.kks);
    setNewItemName(system.name);
    setNewItemDescription(system.description || '');
    setNewSafetyClass(system.safetyClass || 'N/A');
    setNewSeismicClass(system.seismicClass || 'N/A');
    setSelectedSystemTypes(system.systemTypes || []);
    setSelectedConnections(system.connectedSystems || []);
    setActiveDialog('editSystem');
  }, []);

  // Build tree structure
  const buildTree = useCallback((): TreeNode | null => {
    if (!plant) return null;

    const unitNodes: TreeNode[] = Object.values(plant.units).map((unit) => {
      // Systems folder
      const systemNodes: TreeNode[] = Object.values(unit.systems).map((system) => ({
        id: system.kks,
        type: 'system' as TreeNodeType,
        label: `${system.kks} - ${system.name}`,
        parentUnitKks: unit.kks,
        data: system,
      }));

      const systemsFolder: TreeNode = {
        id: `${unit.kks}-systems`,
        type: 'systems-folder' as TreeNodeType,
        label: `Systems (${systemNodes.length})`,
        parentUnitKks: unit.kks,
        children: systemNodes,
      };

      // Buildings folder
      const buildingNodes: TreeNode[] = unit.buildings
        ? Object.values(unit.buildings).map((building) => ({
            id: building.kks,
            type: 'building' as TreeNodeType,
            label: `${building.kks} - ${building.name}`,
            parentUnitKks: unit.kks,
            data: building,
          }))
        : [];

      const buildingsFolder: TreeNode = {
        id: `${unit.kks}-buildings`,
        type: 'buildings-folder' as TreeNodeType,
        label: `Buildings (${buildingNodes.length})`,
        parentUnitKks: unit.kks,
        children: buildingNodes,
      };

      return {
        id: unit.kks,
        type: 'unit' as TreeNodeType,
        label: `Unit ${unit.kks} - ${unit.name}`,
        children: [systemsFolder, buildingsFolder],
        data: unit,
      };
    });

    // Common buildings (plant level)
    const commonBuildingNodes: TreeNode[] = Object.values(plant.buildings).map((building) => ({
      id: building.kks,
      type: 'building' as TreeNodeType,
      label: `${building.kks} - ${building.name}`,
      data: building,
    }));

    return {
      id: 'plant',
      type: 'plant',
      label: `${plant.kks} - ${plant.name}`,
      children: [
        ...unitNodes,
        {
          id: 'common-buildings',
          type: 'common-buildings',
          label: `Common Buildings (${commonBuildingNodes.length})`,
          children: commonBuildingNodes,
        },
      ],
    };
  }, [plant]);

  const tree = buildTree();
  const allSystems = getAllSystems();

  // Render tree node
  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected =
      (node.type === 'unit' && node.id === selectedUnitKks) ||
      (node.type === 'system' && node.id === selectedSystemKks);

    return (
      <div key={node.id} className="group/node">
        <div
          className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-gray-100 rounded ${
            isSelected ? 'bg-blue-100 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeSelect(node)}
        >
          {/* Expand/Collapse */}
          {hasChildren || node.type === 'systems-folder' || node.type === 'buildings-folder' ? (
            <button
              className="p-0.5 hover:bg-gray-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Icon */}
          {getNodeIcon(node.type)}

          {/* Label */}
          <span className="text-sm truncate flex-1">{node.label}</span>

          {/* Actions */}
          <div className="flex gap-0.5 opacity-0 group-hover/node:opacity-100">
            {/* Plant edit */}
            {node.type === 'plant' && (
              <button
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewItemKks(plant?.kks || '');
                  setNewItemName(plant?.name || '');
                  setActiveDialog('editPlant');
                }}
                title="Edit Plant"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}

            {/* Unit actions */}
            {node.type === 'unit' && (
              <button
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete('unit', node.id, node.label);
                }}
                title="Delete Unit"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            )}

            {/* Systems folder - Add system */}
            {node.type === 'systems-folder' && (
              <button
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingUnitKks(node.parentUnitKks || null);
                  setActiveDialog('addSystem');
                }}
                title="Add System"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}

            {/* System actions */}
            {node.type === 'system' && (
              <>
                <button
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditSystem(node.data as System);
                  }}
                  title="Edit System"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete('system', node.id, node.label);
                  }}
                  title="Delete System"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  </svg>
                </button>
              </>
            )}

            {/* Buildings folder - Add building */}
            {node.type === 'buildings-folder' && (
              <button
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingUnitKks(node.parentUnitKks || null);
                  setActiveDialog('addUnitBuilding');
                }}
                title="Add Building"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}

            {/* Building delete */}
            {node.type === 'building' && (
              <button
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete('building', node.id, node.label, node.parentUnitKks);
                }}
                title="Delete Building"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            )}

            {/* Common buildings - Add */}
            {node.type === 'common-buildings' && (
              <button
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDialog('addCommonBuilding');
                }}
                title="Add Common Building"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>{node.children!.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (!plant) {
    return (
      <div className={`${className} p-4 text-center text-gray-500`}>
        <p className="text-sm">No plant loaded</p>
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Plant Explorer</span>
        <button
          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
          onClick={() => setActiveDialog('addUnit')}
          title="Add Unit"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {tree && renderNode(tree)}
      </div>

      {/* Current Selection Info */}
      {selectedSystemKks && (
        <div className="px-3 py-2 border-t border-gray-200 bg-blue-50">
          <div className="text-xs text-gray-500">Selected System</div>
          <div className="text-sm font-medium font-mono">{selectedSystemKks}</div>
          {(() => {
            const sys = allSystems.find(s => s.kks === selectedSystemKks);
            return sys && (
              <>
                <div className="text-xs text-gray-600">{sys.name}</div>
                <div className="flex gap-2 mt-1">
                  {sys.safetyClass && sys.safetyClass !== 'N/A' && (
                    <span className="text-xs px-1 py-0.5 bg-red-100 text-red-700 rounded">{sys.safetyClass}</span>
                  )}
                  {sys.seismicClass && sys.seismicClass !== 'N/A' && (
                    <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-700 rounded">{sys.seismicClass}</span>
                  )}
                  {sys.systemTypes && sys.systemTypes.includes('NOS') && (
                    <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded">NOS</span>
                  )}
                  {sys.systemTypes && sys.systemTypes.includes('SS') && (
                    <span className="text-xs px-1 py-0.5 bg-green-100 text-green-700 rounded">SS</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Edit Plant Dialog */}
      {activeDialog === 'editPlant' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-lg font-medium mb-4">Edit Plant</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Plant KKS</label>
                <input
                  type="text"
                  value={newItemKks}
                  onChange={(e) => setNewItemKks(e.target.value.toUpperCase())}
                  placeholder="e.g., DNPP"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Demo Nuclear Power Plant"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={resetDialogState}>
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleUpdatePlant}
                disabled={!newItemKks || !newItemName}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Dialog */}
      {activeDialog === 'addUnit' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-lg font-medium mb-4">Add Unit</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Unit KKS</label>
                <input
                  type="text"
                  value={newItemKks}
                  onChange={(e) => setNewItemKks(e.target.value.toUpperCase())}
                  placeholder="e.g., 1, 2, A"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Unit 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Unit description"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={resetDialogState}>
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleAddUnit}
                disabled={!newItemKks || !newItemName}
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add System Dialog */}
      {activeDialog === 'addSystem' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Add System to Unit {editingUnitKks}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">System KKS *</label>
                <input
                  type="text"
                  value={newItemKks}
                  onChange={(e) => setNewItemKks(e.target.value.toUpperCase())}
                  placeholder="e.g., 10KBC, LAA10"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Primary Coolant System"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="System description"
                  className="w-full px-3 py-2 border border-gray-300 rounded resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Safety Class</label>
                  <select
                    value={newSafetyClass}
                    onChange={(e) => setNewSafetyClass(e.target.value as SafetyClass)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    {SAFETY_CLASSES.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Seismic Class</label>
                  <select
                    value={newSeismicClass}
                    onChange={(e) => setNewSeismicClass(e.target.value as SeismicClass)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    {SEISMIC_CLASSES.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">System Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSystemTypes.includes('NOS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSystemTypes([...selectedSystemTypes, 'NOS']);
                        } else {
                          setSelectedSystemTypes(selectedSystemTypes.filter(t => t !== 'NOS'));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">NOS (Normal Operation System)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSystemTypes.includes('SS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSystemTypes([...selectedSystemTypes, 'SS']);
                        } else {
                          setSelectedSystemTypes(selectedSystemTypes.filter(t => t !== 'SS'));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">SS (Safety System)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Connected Systems</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={connectionInput}
                    onChange={(e) => setConnectionInput(e.target.value.toUpperCase())}
                    placeholder="System KKS"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddConnection()}
                  />
                  <button
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                    onClick={handleAddConnection}
                    disabled={!connectionInput}
                  >
                    Add
                  </button>
                </div>
                {selectedConnections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedConnections.map((conn) => (
                      <span
                        key={conn.targetSystemKks}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                      >
                        {conn.targetSystemKks}
                        <button
                          className="hover:text-red-600"
                          onClick={() => handleRemoveConnection(conn.targetSystemKks)}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={resetDialogState}>
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleAddSystem}
                disabled={!newItemKks || !newItemName}
              >
                Add System
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit System Dialog */}
      {activeDialog === 'editSystem' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Edit System: {editingSystemKks}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Safety Class</label>
                  <select
                    value={newSafetyClass}
                    onChange={(e) => setNewSafetyClass(e.target.value as SafetyClass)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    {SAFETY_CLASSES.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Seismic Class</label>
                  <select
                    value={newSeismicClass}
                    onChange={(e) => setNewSeismicClass(e.target.value as SeismicClass)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    {SEISMIC_CLASSES.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">System Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSystemTypes.includes('NOS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSystemTypes([...selectedSystemTypes, 'NOS']);
                        } else {
                          setSelectedSystemTypes(selectedSystemTypes.filter(t => t !== 'NOS'));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">NOS (Normal Operation System)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSystemTypes.includes('SS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSystemTypes([...selectedSystemTypes, 'SS']);
                        } else {
                          setSelectedSystemTypes(selectedSystemTypes.filter(t => t !== 'SS'));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">SS (Safety System)</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Connected Systems</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={connectionInput}
                    onChange={(e) => setConnectionInput(e.target.value.toUpperCase())}
                    placeholder="System KKS"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddConnection()}
                  />
                  <button
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                    onClick={handleAddConnection}
                    disabled={!connectionInput}
                  >
                    Add
                  </button>
                </div>
                {selectedConnections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedConnections.map((conn) => (
                      <span
                        key={conn.targetSystemKks}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                      >
                        {conn.targetSystemKks}
                        <button
                          className="hover:text-red-600"
                          onClick={() => handleRemoveConnection(conn.targetSystemKks)}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={resetDialogState}>
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleEditSystem}
                disabled={!newItemName}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Building Dialog */}
      {activeDialog === 'addUnitBuilding' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-lg font-medium mb-4">Add Building to Unit {editingUnitKks}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Building KKS</label>
                <input
                  type="text"
                  value={newItemKks}
                  onChange={(e) => setNewItemKks(e.target.value.toUpperCase())}
                  placeholder="e.g., RB, TB"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Reactor Building"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={resetDialogState}>
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleAddUnitBuilding}
                disabled={!newItemKks || !newItemName}
              >
                Add Building
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Common Building Dialog */}
      {activeDialog === 'addCommonBuilding' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-lg font-medium mb-4">Add Common Building</h3>
            <p className="text-xs text-gray-500 mb-3">Common buildings belong to the entire plant, not any specific unit.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Building KKS</label>
                <input
                  type="text"
                  value={newItemKks}
                  onChange={(e) => setNewItemKks(e.target.value.toUpperCase())}
                  placeholder="e.g., CB, AB"
                  className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Control Building"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={resetDialogState}>
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleAddCommonBuilding}
                disabled={!newItemKks || !newItemName}
              >
                Add Building
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {activeDialog === 'deleteConfirm' && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-2.694-.834-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-600">Confirm Delete</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{deleteTarget.label}</span>?
              </p>

              {deleteTarget.type === 'unit' && (deleteTarget.systemCount! > 0 || deleteTarget.buildingCount! > 0) && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-700 mb-1">Warning: This will also delete:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {deleteTarget.systemCount! > 0 && (
                      <li>{deleteTarget.systemCount} system{deleteTarget.systemCount! > 1 ? 's' : ''} (and all their diagram data)</li>
                    )}
                    {deleteTarget.buildingCount! > 0 && (
                      <li>{deleteTarget.buildingCount} building{deleteTarget.buildingCount! > 1 ? 's' : ''}</li>
                    )}
                  </ul>
                </div>
              )}

              {deleteTarget.type === 'system' && (
                <p className="text-xs text-gray-500 mt-2">
                  The system's diagram data folder will also be permanently deleted.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                onClick={resetDialogState}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get node icon
function getNodeIcon(type: TreeNodeType): React.ReactNode {
  switch (type) {
    case 'plant':
      return (
        <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
        </svg>
      );
    case 'unit':
      return (
        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      );
    case 'systems-folder':
      return (
        <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      );
    case 'system':
      return (
        <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case 'buildings-folder':
      return (
        <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      );
    case 'building':
      return (
        <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M9 8h1M9 12h1M9 16h1M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16" />
        </svg>
      );
    case 'common-buildings':
      return (
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
        </svg>
      );
    default:
      return null;
  }
}

export default PlantExplorer;
