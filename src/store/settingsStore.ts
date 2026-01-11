/**
 * Settings Store
 *
 * Manages application-wide settings including:
 * - Homepage statistics visibility
 * - UI preferences
 * - Future app configurations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Statistics that can be shown/hidden on the homepage
export interface StatisticsSettings {
  showSystems: boolean;
  showTotalComponents: boolean;
  showValves: boolean;
  showPumps: boolean;
  showSensors: boolean;
  showVessels: boolean;
  showHeatExchangers: boolean;
  showPipes: boolean;
}

// Homepage display settings
export interface HomepageSettings {
  showStatistics: boolean;
  showProjectInfo: boolean;
  showFeatures: boolean;
  showPlantInfo: boolean;
  showAvailableSystems: boolean;
  showQuickStart: boolean;
  statistics: StatisticsSettings;
}

// Complete settings state
export interface SettingsState {
  homepage: HomepageSettings;
}

// Actions
export interface SettingsActions {
  // Homepage settings
  setHomepageSetting: <K extends keyof HomepageSettings>(key: K, value: HomepageSettings[K]) => void;
  setStatisticVisibility: <K extends keyof StatisticsSettings>(key: K, value: boolean) => void;
  toggleStatistic: (key: keyof StatisticsSettings) => void;

  // Bulk operations
  showAllStatistics: () => void;
  hideAllStatistics: () => void;
  resetToDefaults: () => void;
}

// Default settings
const DEFAULT_STATISTICS: StatisticsSettings = {
  showSystems: true,
  showTotalComponents: true,
  showValves: true,
  showPumps: true,
  showSensors: true,
  showVessels: true,
  showHeatExchangers: true,
  showPipes: true,
};

const DEFAULT_HOMEPAGE: HomepageSettings = {
  showStatistics: true,
  showProjectInfo: true,
  showFeatures: true,
  showPlantInfo: true,
  showAvailableSystems: true,
  showQuickStart: true,
  statistics: DEFAULT_STATISTICS,
};

const DEFAULT_SETTINGS: SettingsState = {
  homepage: DEFAULT_HOMEPAGE,
};

// Create the store with persistence
export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_SETTINGS,

      // Set a homepage setting
      setHomepageSetting: (key, value) => {
        set((state) => ({
          homepage: {
            ...state.homepage,
            [key]: value,
          },
        }));
      },

      // Set a specific statistic visibility
      setStatisticVisibility: (key, value) => {
        set((state) => ({
          homepage: {
            ...state.homepage,
            statistics: {
              ...state.homepage.statistics,
              [key]: value,
            },
          },
        }));
      },

      // Toggle a statistic
      toggleStatistic: (key) => {
        set((state) => ({
          homepage: {
            ...state.homepage,
            statistics: {
              ...state.homepage.statistics,
              [key]: !state.homepage.statistics[key],
            },
          },
        }));
      },

      // Show all statistics
      showAllStatistics: () => {
        set((state) => ({
          homepage: {
            ...state.homepage,
            statistics: {
              showSystems: true,
              showTotalComponents: true,
              showValves: true,
              showPumps: true,
              showSensors: true,
              showVessels: true,
              showHeatExchangers: true,
              showPipes: true,
            },
          },
        }));
      },

      // Hide all statistics
      hideAllStatistics: () => {
        set((state) => ({
          homepage: {
            ...state.homepage,
            statistics: {
              showSystems: false,
              showTotalComponents: false,
              showValves: false,
              showPumps: false,
              showSensors: false,
              showVessels: false,
              showHeatExchangers: false,
              showPipes: false,
            },
          },
        }));
      },

      // Reset all settings to defaults
      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
      },
    }),
    {
      name: 'flowmark_settings',
    }
  )
);

export default useSettingsStore;
