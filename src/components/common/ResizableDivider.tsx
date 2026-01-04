/**
 * Resizable Divider Component
 *
 * A vertical divider that can be dragged to resize panels.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ResizableDividerProps {
  onResize: (delta: number) => void;
  className?: string;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  onResize,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startXRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(delta);
    },
    [isDragging, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`relative group ${className}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ cursor: 'col-resize' }}
    >
      {/* Invisible hit area for easier grabbing */}
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />

      {/* Visual divider */}
      <div
        className={`h-full w-px transition-colors ${
          isDragging
            ? 'bg-pid-primary'
            : isHovering
            ? 'bg-gray-400'
            : 'bg-pid-border'
        }`}
      />

      {/* Drag handle indicator (shown on hover) */}
      {(isHovering || isDragging) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-0.5 pointer-events-none">
          <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-pid-primary' : 'bg-gray-400'}`} />
          <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-pid-primary' : 'bg-gray-400'}`} />
        </div>
      )}
    </div>
  );
};

export default ResizableDivider;
