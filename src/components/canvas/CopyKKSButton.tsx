/**
 * Copy KKS Button Component
 *
 * A floating button that appears when components are selected,
 * allowing quick copying of KKS to clipboard.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';

interface CopyKKSButtonProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export const CopyKKSButton: React.FC<CopyKKSButtonProps> = ({ containerRef }) => {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Get selection from UI store
  const selection = useUIStore((state) => state.selection);
  const viewport = useUIStore((state) => state.viewport);
  const pasteSegmentDialogOpen = useUIStore((state) => state.pasteSegmentDialogOpen);
  const quickSearchOpen = useUIStore((state) => state.quickSearchOpen);

  // Get diagram for component positions
  const diagram = useDiagramStore((state) => state.diagram);

  // Calculate button position based on selected components
  useEffect(() => {
    if (selection.componentKks.length === 0 || !diagram || !containerRef.current) {
      setPosition(null);
      return;
    }

    // Find the top-left corner of selected components
    let minX = Infinity;
    let minY = Infinity;

    selection.componentKks.forEach((kks) => {
      const component = diagram.components[kks];
      if (component) {
        const x = component.position.x;
        const y = component.position.y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
      }
    });

    if (minX === Infinity) {
      setPosition(null);
      return;
    }

    // Position to the right of the selected components, a bit below
    const screenX = minX * viewport.scale + viewport.x + 70; // To the right
    const screenY = minY * viewport.scale + viewport.y + 40; // Below top

    // Clamp to container bounds
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const clampedX = Math.min(Math.max(screenX, 10), rect.width - 120);
    const clampedY = Math.min(Math.max(screenY, 10), rect.height - 40);

    setPosition({ x: clampedX, y: clampedY });
  }, [selection.componentKks, diagram, viewport, containerRef]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (selection.componentKks.length === 0) return;

    const kksText = selection.componentKks.join('\n');

    try {
      await navigator.clipboard.writeText(kksText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy KKS:', err);
    }
  }, [selection.componentKks]);

  // Don't render if no selection, no position, or any dialog/modal is open
  const anyDialogOpen = pasteSegmentDialogOpen || quickSearchOpen;
  if (selection.componentKks.length === 0 || !position || anyDialogOpen) {
    return null;
  }

  const count = selection.componentKks.length;
  const displayKks = count === 1 ? selection.componentKks[0] : `${count} KKS`;

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 40, // Below modals (z-50+) but above canvas elements
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: copied ? '#22c55e' : '#3b82f6',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
      onClick={handleCopy}
      title={count === 1 ? `Copy KKS: ${selection.componentKks[0]}` : `Copy ${count} KKS values`}
    >
      {/* Copy Icon */}
      {copied ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span>{copied ? 'Copied!' : displayKks}</span>
    </div>
  );
};

export default CopyKKSButton;
