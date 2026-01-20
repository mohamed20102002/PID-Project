/**
 * References Modal
 *
 * A modal for viewing reference data such as KKS system abbreviations.
 * Features:
 * - Tabs for different reference types
 * - KKS Systems tab: Search and view KKS codes and their system names
 * - Shows link status to the Excel file
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ReferencesService, KKSEntry } from '../../services/ReferencesService';

interface ReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'kks'; // Add more tabs here in the future

const ReferencesModal: React.FC<ReferencesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('kks');
  const [searchQuery, setSearchQuery] = useState('');
  const [kksEntries, setKksEntries] = useState<KKSEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Load KKS data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadKKSData();
    }
  }, [isOpen]);

  const loadKKSData = async (forceReload = false) => {
    setIsLoading(true);
    setError(null);

    const result = await ReferencesService.loadKKSReferences(forceReload);

    if (result.success) {
      setKksEntries(result.entries);
      setFileExists(result.fileExists);
      setTotalCount(result.totalCount);
    } else {
      setError(result.error || 'Failed to load KKS references');
      setFileExists(result.fileExists);
      setKksEntries([]);
    }

    setIsLoading(false);
  };

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return kksEntries;
    }
    return ReferencesService.searchKKS(searchQuery);
  }, [kksEntries, searchQuery]);

  const handleRefresh = useCallback(() => {
    ReferencesService.clearCache();
    loadKKSData(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
                <path d="M8 15h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">References</h2>
              <p className="text-xs text-gray-500">Lookup tables and reference data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'kks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('kks')}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M15 3h4a2 2 0 012 2v10a2 2 0 01-2 2h-4" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              KKS Systems
            </div>
          </button>
          {/* Add more tabs here in the future */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'kks' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* File Status */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                      fileExists === null
                        ? 'bg-gray-100 text-gray-500'
                        : fileExists
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {fileExists === null ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                          Checking...
                        </>
                      ) : fileExists ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Linked to KKSID.xlsx
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          File not found
                        </>
                      )}
                    </div>
                    {fileExists && (
                      <span className="text-xs text-gray-500">
                        {totalCount} entries loaded
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh data"
                  >
                    <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0115-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 01-15 6.7L3 16" />
                    </svg>
                    Refresh
                  </button>
                </div>
                {!fileExists && fileExists !== null && (
                  <div className="mt-2 text-xs text-gray-500">
                    Place your Excel file at: <code className="bg-gray-200 px-1.5 py-0.5 rounded">data/references/kks/KKSID.xlsx</code>
                  </div>
                )}
              </div>

              {/* Search Box */}
              <div className="px-5 py-3 border-b border-gray-200">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by KKS code or system name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-lg text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-2 text-xs text-gray-500">
                    Found {filteredEntries.length} of {totalCount} entries
                  </div>
                )}
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-gray-500">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0110 10" />
                      </svg>
                      Loading...
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <div className="p-3 bg-red-100 rounded-full mb-3">
                      <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">{error}</p>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                    <div className="p-3 bg-gray-100 rounded-full mb-3">
                      <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      {searchQuery ? 'No matching entries found' : 'No KKS entries available'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Header row */}
                    <div className="flex items-center px-5 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0">
                      <div className="w-24">KKS Code</div>
                      <div className="flex-1">System Name</div>
                    </div>
                    {/* Data rows */}
                    {filteredEntries.map((entry, index) => (
                      <div
                        key={`${entry.kks}-${index}`}
                        className="flex items-center px-5 py-3 hover:bg-blue-50 transition-colors cursor-pointer group"
                      >
                        <div className="w-24">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-sm font-mono font-medium group-hover:bg-blue-200 transition-colors">
                            {entry.kks}
                          </span>
                        </div>
                        <div className="flex-1 text-sm text-gray-700">
                          {entry.systemName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Press ESC to close</span>
            <span>File location: data/references/kks/KKSID.xlsx</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferencesModal;
