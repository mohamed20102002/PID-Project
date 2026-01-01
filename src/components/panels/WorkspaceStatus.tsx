/**
 * Workspace Status Component
 *
 * Shows the current storage status and save indicator.
 * Data is saved to ./data/ folder in the project.
 */

import React from 'react';
import { useStorageService } from '../../hooks/useStorageService';

interface WorkspaceStatusProps {
  className?: string;
}

export const WorkspaceStatus: React.FC<WorkspaceStatusProps> = ({ className = '' }) => {
  const { isSaving, lastSaveTime, saveError } = useStorageService({ autoSaveInterval: 3000 });

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Storage indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        <span>./data/</span>
      </div>

      {/* Save status indicator */}
      <div className="flex items-center gap-1.5 text-xs">
        {isSaving ? (
          <div className="flex items-center gap-1 text-blue-600">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0110 10" />
            </svg>
            <span>Saving...</span>
          </div>
        ) : saveError ? (
          <div className="flex items-center gap-1 text-red-600" title={saveError}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Error</span>
          </div>
        ) : lastSaveTime ? (
          <div className="flex items-center gap-1 text-green-600" title={`Last saved: ${formatTime(lastSaveTime)}`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Saved</span>
          </div>
        ) : (
          <span className="text-gray-400">Auto-save on</span>
        )}
      </div>
    </div>
  );
};

export default WorkspaceStatus;
