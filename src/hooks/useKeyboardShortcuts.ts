/**
 * Keyboard Shortcuts Hook
 *
 * Handles keyboard shortcuts for common operations like
 * rotation, deletion, selection, and tool switching.
 */

import { useEffect, useCallback } from 'react';
import { useUIStore } from '../store/uiStore';
import { useDiagramStore } from '../store/diagramStore';
import { useHistoryStore } from '../store/historyStore';
import { ComponentRotation } from '../types';
import { SymbolRegistry } from '../data/symbols/SymbolRegistry';
import {
  DeleteMultipleCommand,
  RotateComponentCommand,
  AddComponentCommand,
} from '../core/commands/ComponentCommands';

/**
 * Get next rotation value
 */
const getNextRotation = (
  currentRotation: ComponentRotation,
  rotationSteps: ComponentRotation[],
  direction: 'cw' | 'ccw'
): ComponentRotation => {
  const currentIndex = rotationSteps.indexOf(currentRotation);
  if (currentIndex === -1) return rotationSteps[0];

  if (direction === 'cw') {
    return rotationSteps[(currentIndex + 1) % rotationSteps.length];
  } else {
    return rotationSteps[(currentIndex - 1 + rotationSteps.length) % rotationSteps.length];
  }
};

/**
 * Keyboard Shortcuts Hook
 */
export const useKeyboardShortcuts = () => {
  const {
    mode,
    tool,
    selection,
    setTool,
    clearSelection,
    cancelConnectionDrawing,
    isDrawingConnection,
    copyToClipboard,
    getClipboard,
    mousePosition,
  } = useUIStore();

  const {
    diagram,
    rotateComponent,
    deleteComponent,
    deleteMultiple,
    getComponent,
    addComponent,
    getConnection,
  } = useDiagramStore();

  const { undo, redo, canUndo, canRedo, execute } = useHistoryStore();

  // Rotate selected components (using commands for undo/redo)
  const rotateSelected = useCallback(
    (direction: 'cw' | 'ccw') => {
      if (mode === 'view' || selection.componentKks.length === 0) return;

      selection.componentKks.forEach((kks) => {
        const component = getComponent(kks);
        if (!component) return;

        const definition = SymbolRegistry.getSymbol(component.type);
        if (!definition || !definition.rotatable) return;

        const rotationSteps = definition.rotationSteps as ComponentRotation[];
        const newRotation = getNextRotation(
          component.rotation,
          rotationSteps,
          direction
        );

        // Use command for undo/redo support
        execute(new RotateComponentCommand(kks, component.rotation, newRotation));
      });
    },
    [mode, selection.componentKks, getComponent, execute]
  );

  // Delete selected components and/or connections (using commands for undo/redo)
  const deleteSelected = useCallback(() => {
    if (mode === 'view') return;
    // Allow deletion if any components OR connections are selected
    if (selection.componentKks.length === 0 && selection.connectionKks.length === 0) return;

    // Use command for undo/redo support
    execute(new DeleteMultipleCommand(selection.componentKks, selection.connectionKks));
    clearSelection();
  }, [mode, selection, execute, clearSelection]);

  // Copy selected components to clipboard
  const copySelected = useCallback(() => {
    if (selection.componentKks.length === 0) return;

    const components = selection.componentKks
      .map((kks) => getComponent(kks))
      .filter(Boolean);

    const connections = selection.connectionKks
      .map((kks) => getConnection(kks))
      .filter(Boolean);

    copyToClipboard(components, connections);
  }, [selection, getComponent, getConnection, copyToClipboard]);

  // Cut selected components (copy + delete) using commands for undo/redo
  const cutSelected = useCallback(() => {
    if (mode === 'view') return;
    if (selection.componentKks.length === 0 && selection.connectionKks.length === 0) return;

    // Copy first
    copySelected();

    // Then delete using command
    execute(new DeleteMultipleCommand(selection.componentKks, selection.connectionKks));
    clearSelection();
  }, [mode, selection, copySelected, execute, clearSelection]);

  // Paste from clipboard (using commands for undo/redo)
  const pasteFromClipboard = useCallback(() => {
    if (mode === 'view' || !diagram) return;

    const clipboard = getClipboard();
    if (!clipboard || clipboard.components.length === 0) return;

    // Calculate offset for pasting
    const offsetX = 40;
    const offsetY = 40;

    const kksMap = new Map<string, string>(); // old KKS -> new KKS
    const newComponentKksList: string[] = [];
    const { addComponent, addConnection } = useDiagramStore.getState();

    // Paste each component with offset using commands for undo/redo
    clipboard.components.forEach((comp: any) => {
      if (comp) {
        const newComponent = {
          ...comp,
          position: {
            x: comp.position.x + offsetX,
            y: comp.position.y + offsetY,
          },
          ports: comp.ports.map((p: any) => ({
            ...p,
            connectionKks: undefined, // Clear connections, will recreate
          })),
        };
        // Remove the kks so a new one is generated
        const oldKks = comp.kks;
        delete newComponent.kks;

        // Use command for undo/redo support
        const cmd = new AddComponentCommand(newComponent);
        execute(cmd);
        const newKks = cmd.getCreatedKks();
        if (newKks) {
          newComponentKksList.push(newKks);
          kksMap.set(oldKks, newKks);
        }
      }
    });

    // Copy connections where BOTH endpoints were copied
    setTimeout(() => {
      // Get fresh diagram state - the old reference may be stale
      const currentDiagram = useDiagramStore.getState().diagram;
      if (!currentDiagram) return;

      const selectedSet = new Set(clipboard.components.map((c: any) => c.kks));
      const newConnectionKksList: string[] = [];

      clipboard.connections?.forEach((conn: any) => {
        if (conn &&
            selectedSet.has(conn.sourceComponentKks) &&
            selectedSet.has(conn.targetComponentKks)) {
          const newSourceKks = kksMap.get(conn.sourceComponentKks);
          const newTargetKks = kksMap.get(conn.targetComponentKks);

          if (newSourceKks && newTargetKks &&
              currentDiagram.components[newSourceKks] &&
              currentDiagram.components[newTargetKks]) {
            const oldSourceComp = clipboard.components.find((c: any) => c.kks === conn.sourceComponentKks);
            const oldTargetComp = clipboard.components.find((c: any) => c.kks === conn.targetComponentKks);
            const newSourceComp = currentDiagram.components[newSourceKks];
            const newTargetComp = currentDiagram.components[newTargetKks];

            if (oldSourceComp && oldTargetComp) {
              const sourcePortIndex = oldSourceComp.ports.findIndex((p: any) => p.id === conn.sourcePortId);
              const targetPortIndex = oldTargetComp.ports.findIndex((p: any) => p.id === conn.targetPortId);

              if (sourcePortIndex >= 0 && targetPortIndex >= 0 &&
                  newSourceComp.ports[sourcePortIndex] && newTargetComp.ports[targetPortIndex]) {
                const { addConnection: addConn } = useDiagramStore.getState();
                const newConnKks = addConn({
                  sourceComponentKks: newSourceKks,
                  sourcePortId: newSourceComp.ports[sourcePortIndex].id,
                  targetComponentKks: newTargetKks,
                  targetPortId: newTargetComp.ports[targetPortIndex].id,
                  waypoints: conn.waypoints?.map((wp: any) => ({
                    x: wp.x + offsetX,
                    y: wp.y + offsetY,
                  })) || [],
                  routingType: conn.routingType || 'orthogonal',
                  visible: true,
                  locked: false,
                  isCrossSystem: false,
                  properties: { custom: {} },
                  type: conn.type || 'pipe',
                  style: { ...conn.style },
                  label: conn.label,
                });
                if (newConnKks) {
                  newConnectionKksList.push(newConnKks);
                }
              }
            }
          }
        }
      });

      // Select the newly pasted components and connections
      useUIStore.getState().select(newComponentKksList, newConnectionKksList);

      // Show segment replacement dialog if there are pasted components
      if (newComponentKksList.length > 0) {
        // Pass the original clipboard KKS values for segment detection
        const originalKksList = clipboard.components.map((c: any) => c.kks);
        useUIStore.getState().showPasteSegmentDialog(newComponentKksList, kksMap, originalKksList);
      }
    }, 50);
  }, [mode, diagram, getClipboard, execute]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle if focus is in an input or contentEditable element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Don't handle if inside the description editor modal
      if (e.target instanceof HTMLElement && e.target.closest('[data-description-editor="true"]')) {
        return;
      }

      // Escape - cancel current operation
      if (e.key === 'Escape') {
        if (isDrawingConnection) {
          cancelConnectionDrawing();
        } else {
          clearSelection();
          setTool('select');
        }
        return;
      }

      // Delete / Backspace - delete selection
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // R - rotate clockwise
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotateSelected(e.shiftKey ? 'ccw' : 'cw');
        return;
      }

      // Tool shortcuts (only in draw mode, and without Ctrl/Cmd)
      if (mode === 'draw' && !e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
          case 's':
            // V or S - Select tool (only without Ctrl)
            e.preventDefault();
            setTool('select');
            break;

          case 'p':
            // P - Pipe tool
            e.preventDefault();
            setTool('pipe');
            break;

          case 'h':
            // H - Pan/Hand tool
            e.preventDefault();
            setTool('pan');
            break;

          default:
            break;
        }
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            // Ctrl+Z - Undo, Ctrl+Shift+Z - Redo
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) redo();
            } else {
              if (canUndo) undo();
            }
            break;

          case 'y':
            // Ctrl+Y - Redo
            e.preventDefault();
            if (canRedo) redo();
            break;

          case 'a':
            // Ctrl+A - Select all
            e.preventDefault();
            if (diagram) {
              const allKks = Object.keys(diagram.components);
              if (allKks.length > 0) {
                useUIStore.getState().select(allKks, []);
              }
            }
            break;

          case 'd':
            // Ctrl+D - Deselect all
            e.preventDefault();
            clearSelection();
            break;

          case 'c':
            // Ctrl+C - Copy
            e.preventDefault();
            copySelected();
            break;

          case 'x':
            // Ctrl+X - Cut
            e.preventDefault();
            cutSelected();
            break;

          case 'v':
            // Ctrl+V - Paste (only with Ctrl, not just V)
            e.preventDefault();
            pasteFromClipboard();
            break;

          default:
            break;
        }
      }
    },
    [
      mode,
      diagram,
      isDrawingConnection,
      cancelConnectionDrawing,
      clearSelection,
      setTool,
      deleteSelected,
      rotateSelected,
      undo,
      redo,
      canUndo,
      canRedo,
      copySelected,
      cutSelected,
      pasteFromClipboard,
    ]
  );

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    rotateSelected,
    deleteSelected,
    copySelected,
    cutSelected,
    pasteFromClipboard,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};

export default useKeyboardShortcuts;
