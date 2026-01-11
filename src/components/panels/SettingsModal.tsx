/**
 * Settings Modal Component
 *
 * Modal for configuring application settings including:
 * - Homepage statistics visibility
 * - Homepage sections visibility
 */

import React, { useState } from 'react';
import { useSettingsStore, StatisticsSettings } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'homepage' | 'appearance';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('homepage');

  const {
    homepage,
    setHomepageSetting,
    toggleStatistic,
    showAllStatistics,
    hideAllStatistics,
    resetToDefaults,
  } = useSettingsStore();

  // Dark mode pipe settings from UI store
  const canvasDarkMode = useUIStore((state) => state.canvasDarkMode);
  const toggleCanvasDarkMode = useUIStore((state) => state.toggleCanvasDarkMode);
  const darkModePipeColor = useUIStore((state) => state.darkModePipeColor);
  const darkModePipeStrokeWidth = useUIStore((state) => state.darkModePipeStrokeWidth);
  const darkModePipeGlowBlur = useUIStore((state) => state.darkModePipeGlowBlur);
  const darkModePipeGlowOpacity = useUIStore((state) => state.darkModePipeGlowOpacity);
  const setDarkModePipeColor = useUIStore((state) => state.setDarkModePipeColor);
  const setDarkModePipeStrokeWidth = useUIStore((state) => state.setDarkModePipeStrokeWidth);
  const setDarkModePipeGlowBlur = useUIStore((state) => state.setDarkModePipeGlowBlur);
  const setDarkModePipeGlowOpacity = useUIStore((state) => state.setDarkModePipeGlowOpacity);

  if (!isOpen) return null;

  const statisticsConfig: Array<{
    key: keyof StatisticsSettings;
    label: string;
    color: string;
    icon: JSX.Element;
  }> = [
    {
      key: 'showSystems',
      label: 'Systems',
      color: 'blue',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      key: 'showTotalComponents',
      label: 'Total Components',
      color: 'emerald',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      key: 'showValves',
      label: 'Valves',
      color: 'orange',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 4v16M4 12h16" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      key: 'showPumps',
      label: 'Pumps',
      color: 'violet',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      ),
    },
    {
      key: 'showSensors',
      label: 'Sensors',
      color: 'cyan',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4" />
        </svg>
      ),
    },
    {
      key: 'showVessels',
      label: 'Vessels',
      color: 'amber',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h12v4H6zM5 7h14v14H5z" />
        </svg>
      ),
    },
    {
      key: 'showHeatExchangers',
      label: 'Heat Exchangers',
      color: 'rose',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 12h16M12 4v16" />
        </svg>
      ),
    },
    {
      key: 'showPipes',
      label: 'Pipes',
      color: 'slate',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12h16M4 6h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const homepageSections = [
    { key: 'showStatistics' as const, label: 'Statistics Panel', description: 'Show the statistics summary box' },
    { key: 'showProjectInfo' as const, label: 'About This Project', description: 'Show project information section' },
    { key: 'showFeatures' as const, label: 'Features Grid', description: 'Show the features overview cards' },
    { key: 'showPlantInfo' as const, label: 'Current Plant Info', description: 'Show current plant details' },
    { key: 'showAvailableSystems' as const, label: 'Available Systems', description: 'Show list of systems to open' },
    { key: 'showQuickStart' as const, label: 'Quick Start Guide', description: 'Show the quick start steps' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
              <p className="text-sm text-gray-500">Customize your FlowMark experience</p>
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
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('homepage')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'homepage'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Homepage
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            Appearance
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'homepage' && (
            <div className="space-y-6">
              {/* Homepage Sections */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  Homepage Sections
                </h3>
                <div className="space-y-2">
                  {homepageSections.map((section) => (
                    <label
                      key={section.key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-700">{section.label}</div>
                        <div className="text-xs text-gray-500">{section.description}</div>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={homepage[section.key]}
                          onChange={(e) => setHomepageSetting(section.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Statistics Cards */}
              {homepage.showStatistics && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 8v8m-8-4v4m4-12v12" />
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                      Statistics Cards
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={showAllStatistics}
                        className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                      >
                        Show All
                      </button>
                      <button
                        onClick={hideAllStatistics}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Hide All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {statisticsConfig.map((stat) => (
                      <label
                        key={stat.key}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                          homepage.statistics[stat.key]
                            ? `bg-${stat.color}-50 border-${stat.color}-300`
                            : 'bg-gray-50 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={homepage.statistics[stat.key]}
                          onChange={() => toggleStatistic(stat.key)}
                          className={`w-4 h-4 rounded border-gray-300 text-${stat.color}-600 focus:ring-${stat.color}-500`}
                        />
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          homepage.statistics[stat.key] ? `bg-${stat.color}-500 text-white` : 'bg-gray-300 text-white'
                        }`}>
                          {stat.icon}
                        </div>
                        <span className={`text-sm font-medium ${
                          homepage.statistics[stat.key] ? `text-${stat.color}-700` : 'text-gray-500'
                        }`}>
                          {stat.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Dark Mode Toggle */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                  Canvas Dark Mode
                </h3>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Enable Dark Mode</div>
                    <div className="text-xs text-gray-500">Switch canvas to dark theme with glowing elements</div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={canvasDarkMode}
                      onChange={() => toggleCanvasDarkMode()}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                </label>
              </div>

              {/* Dark Mode Pipe Settings - only show when dark mode is enabled */}
              {canvasDarkMode && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12h16M4 6h16M4 18h16" />
                    </svg>
                    Dark Mode Pipe Settings
                  </h3>
                  <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
                    {/* Pipe Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Pipe Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={darkModePipeColor}
                          onChange={(e) => setDarkModePipeColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600"
                        />
                        <input
                          type="text"
                          value={darkModePipeColor}
                          onChange={(e) => setDarkModePipeColor(e.target.value)}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Stroke Width */}
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Stroke Width: {darkModePipeStrokeWidth.toFixed(1)}px
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={darkModePipeStrokeWidth}
                        onChange={(e) => setDarkModePipeStrokeWidth(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    {/* Glow Blur */}
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Glow Intensity: {darkModePipeGlowBlur}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={darkModePipeGlowBlur}
                        onChange={(e) => setDarkModePipeGlowBlur(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    {/* Glow Opacity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Glow Opacity: {Math.round(darkModePipeGlowOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={darkModePipeGlowOpacity}
                        onChange={(e) => setDarkModePipeGlowOpacity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    {/* Preview */}
                    <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                      <div className="text-xs text-gray-400 mb-2">Preview</div>
                      <div
                        className="h-1 rounded-full"
                        style={{
                          backgroundColor: darkModePipeColor,
                          boxShadow: `0 0 ${darkModePipeGlowBlur}px ${darkModePipeColor}`,
                          opacity: darkModePipeGlowOpacity,
                          height: `${darkModePipeStrokeWidth * 2}px`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
