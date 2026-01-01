/**
 * Home Page Component
 *
 * Displays project information, developer credits, and quick actions.
 */

import React from 'react';
import { usePlantStore } from '../../store/plantStore';
import { useDiagramStore } from '../../store/diagramStore';

interface HomePageProps {
  onOpenSystem?: (systemKks: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenSystem }) => {
  const plant = usePlantStore((state) => state.plant);
  const getAllSystems = usePlantStore((state) => state.getAllSystems);
  const selectSystem = usePlantStore((state) => state.selectSystem);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);

  const systems = getAllSystems();

  const handleOpenSystem = async (systemKks: string) => {
    selectSystem(systemKks);
    await switchToSystem(systemKks);
    onOpenSystem?.(systemKks);
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
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

        {/* Project Info Card */}
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

        {/* Features Grid */}
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

        {/* Plant Information */}
        {plant && (
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
        {systems.length > 0 && (
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
