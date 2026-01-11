/**
 * Home Page Component
 *
 * Displays project information, developer credits, and quick actions.
 */

import React, { useMemo } from 'react';
import { usePlantStore } from '../../store/plantStore';
import { useDiagramStore } from '../../store/diagramStore';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { useSettingsStore } from '../../store/settingsStore';

interface HomePageProps {
  onOpenSystem?: (systemKks: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenSystem }) => {
  const plant = usePlantStore((state) => state.plant);
  const getAllSystems = usePlantStore((state) => state.getAllSystems);
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);
  const diagramCache = useDiagramStore((state) => state.diagramCache);
  const customSymbols = useCustomSymbolStore((state) => state.customSymbols);

  const systems = getAllSystems();

  // Get settings
  const homepageSettings = useSettingsStore((state) => state.homepage);
  const statisticsSettings = homepageSettings.statistics;

  // Calculate statistics from all diagrams
  const stats = useMemo(() => {
    let totalComponents = 0;
    let valves = 0;
    let pumps = 0;
    let sensors = 0;
    let vessels = 0;
    let heatExchangers = 0;
    let pipes = 0;

    // Iterate through all cached diagrams
    Object.values(diagramCache).forEach((diagram) => {
      if (diagram && diagram.components) {
        Object.values(diagram.components).forEach((component) => {
          totalComponents++;
          const type = component.type.toLowerCase();

          // Categorize by symbol type/category
          // Check custom symbols first
          const symbolDef = customSymbols[component.type];
          const category = symbolDef?.category || '';

          // Valves (AA category or type contains valve)
          if (category === 'AA' || type.includes('valve') || type.includes('gate') || type.includes('globe') || type.includes('check') || type.includes('ball') || type.includes('butterfly')) {
            valves++;
          }
          // Pumps (AP category or type contains pump)
          else if (category === 'AP' || type.includes('pump')) {
            pumps++;
          }
          // Sensors (C* categories or type contains sensor/transmitter/indicator)
          else if (category.startsWith('C') || type.includes('sensor') || type.includes('transmitter') || type.includes('indicator') || type.includes('gauge')) {
            sensors++;
          }
          // Vessels (BB category or type contains tank/vessel)
          else if (category === 'BB' || type.includes('tank') || type.includes('vessel') || type.includes('container')) {
            vessels++;
          }
          // Heat Exchangers (AC category)
          else if (category === 'AC' || type.includes('exchanger') || type.includes('heater') || type.includes('cooler')) {
            heatExchangers++;
          }
        });

        // Count connections as pipes
        if (diagram.connections) {
          pipes += Object.keys(diagram.connections).length;
        }
      }
    });

    return {
      totalComponents,
      valves,
      pumps,
      sensors,
      vessels,
      heatExchangers,
      pipes,
      systems: systems.length,
    };
  }, [diagramCache, customSymbols, systems.length]);

  const handleOpenSystem = async (systemKks: string) => {
    selectSystem(systemKks);
    await switchToSystem(systemKks);
    onOpenSystem?.(systemKks);
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-pid-primary rounded-2xl shadow-lg mb-6">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">FlowMark P&ID</h1>
          <p className="text-lg text-gray-600">Piping and Instrumentation Diagram Editor</p>
        </div>

        {/* Statistics Summary Box */}
        {homepageSettings.showStatistics && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-xl p-1 mb-10">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 8v8m-8-4v4m4-12v12" />
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                  Plant Statistics
                </h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Live Data</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Systems */}
                {statisticsSettings.showSystems && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-blue-700">Systems</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-800">{stats.systems}</div>
                  </div>
                )}

                {/* Total Components */}
                {statisticsSettings.showTotalComponents && (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-emerald-700">Components</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-800">{stats.totalComponents}</div>
                  </div>
                )}

                {/* Valves */}
                {statisticsSettings.showValves && (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 4v16M4 12h16" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-orange-700">Valves</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-800">{stats.valves}</div>
                  </div>
                )}

                {/* Pumps */}
                {statisticsSettings.showPumps && (
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-4 border border-violet-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="8" />
                          <path d="M12 8v8M8 12h8" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-violet-700">Pumps</span>
                    </div>
                    <div className="text-3xl font-bold text-violet-800">{stats.pumps}</div>
                  </div>
                )}

                {/* Sensors */}
                {statisticsSettings.showSensors && (
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-cyan-700">Sensors</span>
                    </div>
                    <div className="text-3xl font-bold text-cyan-800">{stats.sensors}</div>
                  </div>
                )}

                {/* Vessels */}
                {statisticsSettings.showVessels && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 3h12v4H6zM5 7h14v14H5z" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-amber-700">Vessels</span>
                    </div>
                    <div className="text-3xl font-bold text-amber-800">{stats.vessels}</div>
                  </div>
                )}

                {/* Heat Exchangers */}
                {statisticsSettings.showHeatExchangers && (
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <path d="M4 12h16M12 4v16" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-rose-700">Exchangers</span>
                    </div>
                    <div className="text-3xl font-bold text-rose-800">{stats.heatExchangers}</div>
                  </div>
                )}

                {/* Pipes/Connections */}
                {statisticsSettings.showPipes && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12h16M4 6h16M4 18h16" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-slate-700">Pipes</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{stats.pipes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Project Info Card */}
        {homepageSettings.showProjectInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-pid-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              About This Project
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                <strong>FlowMark P&ID</strong> is a professional-grade web application for creating and managing
                Piping and Instrumentation Diagrams (P&ID) for industrial facilities, particularly nuclear power plants.
              </p>
              <p>
                The application implements the <strong>KKS (Kraftwerk-Kennzeichensystem)</strong> identification
                system, which is the international standard for power plant component identification.
              </p>
            </div>
          </div>
        )}

        {/* Features Grid */}
        {homepageSettings.showFeatures && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800">Draw Mode</h3>
            </div>
            <p className="text-sm text-gray-600">
              Create diagrams with drag-and-drop components, pipe connections, and building polygons.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800">View & Search</h3>
            </div>
            <p className="text-sm text-gray-600">
              Browse diagrams and search components by KKS code, name, or type.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800">File-Based Storage</h3>
            </div>
            <p className="text-sm text-gray-600">
              Data is saved to ./data/ folder with separate files for each system.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M12 18v-6" />
                  <path d="M9 15h6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800">Export Options</h3>
            </div>
            <p className="text-sm text-gray-600">
              Export diagrams to PNG, SVG, or PDF formats for documentation.
            </p>
          </div>
        </div>
        )}

        {/* Plant Information */}
        {homepageSettings.showPlantInfo && plant && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-pid-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Current Plant
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Plant Code:</span>
                <span className="ml-2 font-mono font-medium text-gray-800">{plant.kks}</span>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-800">{plant.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Units:</span>
                <span className="ml-2 font-medium text-gray-800">{Object.keys(plant.units).length}</span>
              </div>
              <div>
                <span className="text-gray-500">Systems:</span>
                <span className="ml-2 font-medium text-gray-800">{systems.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Systems */}
        {homepageSettings.showAvailableSystems && systems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-pid-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              Available Systems
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systems.slice(0, 6).map((system) => (
                <button
                  key={system.kks}
                  onClick={() => handleOpenSystem(system.kks)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-pid-primary hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-gray-600">{system.kks.substring(0, 3)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium text-gray-800">{system.kks}</div>
                    <div className="text-xs text-gray-500 truncate">{system.name}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
            {systems.length > 6 && (
              <p className="text-sm text-gray-500 mt-3 text-center">
                +{systems.length - 6} more systems available in Plant Explorer
              </p>
            )}
          </div>
        )}

        {/* Quick Start */}
        {homepageSettings.showQuickStart && (
          <div className="bg-gradient-to-r from-pid-primary to-blue-600 rounded-xl shadow-lg p-6 text-white mb-8">
            <h2 className="text-xl font-semibold mb-3">Quick Start</h2>
            <ul className="space-y-2 text-blue-100">
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Open Plant Explorer (left panel) to view and create systems
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Click on a system to open its diagram
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                Drag components from the Symbol Palette onto the canvas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                Connect components using the Pipe tool
              </li>
            </ul>
          </div>
        )}

        {/* Developer Credit */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">Developed by</p>
          <p className="text-lg font-semibold text-gray-800">Mohamed Ahmed Darwish</p>
          <p className="text-xs text-gray-400 mt-4">
            FlowMark P&ID v1.0.0 | Built with React, TypeScript, and Konva.js
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
