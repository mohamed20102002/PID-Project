/**
 * Properties Panel for Visual Component Designer
 *
 * Tabbed interface for configuring all symbol properties:
 * - General: name, displayName, description, category
 * - Sizing: defaultSize, minSize, maxSize, resizable, aspectRatioLocked
 * - Behavior: rotatable, rotationSteps, freeRotation, noKks
 * - Paths: List of paths with style editing
 * - Ports: Port configuration
 * - Labels: Label configuration
 */

import React, { useState } from 'react';
import { useDesignerStore } from '../../../store/designerStore';
import type { SymbolCategory, SymbolStandard } from '../../../types/symbol.types';
import { PropertyConfigPanel } from './PropertyConfigPanel';

type TabId = 'general' | 'sizing' | 'behavior' | 'properties' | 'paths' | 'ports' | 'labels';

export const PropertiesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const tabs: Array<{ id: TabId; label: string; icon: JSX.Element }> = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M2 12h20" />
        </svg>
      ),
    },
    {
      id: 'sizing',
      label: 'Sizing',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" />
        </svg>
      ),
    },
    {
      id: 'behavior',
      label: 'Behavior',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5l-5 5-5-5M7 19l5-5 5 5" />
        </svg>
      ),
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9" />
        </svg>
      ),
    },
    {
      id: 'paths',
      label: 'Paths',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 16 17 22 11" />
        </svg>
      ),
    },
    {
      id: 'ports',
      label: 'Ports',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-pid-primary text-pid-primary bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'sizing' && <SizingTab />}
        {activeTab === 'behavior' && <BehaviorTab />}
        {activeTab === 'properties' && (
          <div className="-m-4 h-full">
            <PropertyConfigPanel />
          </div>
        )}
        {activeTab === 'paths' && <PathsTab />}
        {activeTab === 'ports' && <PortsTab />}
        {activeTab === 'labels' && <LabelsTab />}
      </div>
    </div>
  );
};

// ============================================================================
// General Tab
// ============================================================================

const GeneralTab: React.FC = () => {
  const { metadata, setMetadata } = useDesignerStore();

  // KKS-based categories organized by main category (Sector No. 4)
  const categoryGroups: Array<{
    main: string;
    label: string;
    categories: Array<{ value: SymbolCategory; label: string; code: string }>;
  }> = [
    {
      main: 'A',
      label: 'Aggregates',
      categories: [
        { value: 'AA', label: 'AA - Fittings & Breaking Devices', code: 'AA' },
        { value: 'AB', label: 'AB - Gateways, Hatches & Doors', code: 'AB' },
        { value: 'AC', label: 'AC - Heat Exchangers & Heating Surfaces', code: 'AC' },
        { value: 'AG', label: 'AG - Generator Sets', code: 'AG' },
        { value: 'AH', label: 'AH - Heaters, Coolers & Air Conditioners', code: 'AH' },
        { value: 'AM', label: 'AM - Mixers & Stirrers', code: 'AM' },
        { value: 'AN', label: 'AN - Compressors & Fans', code: 'AN' },
        { value: 'AP', label: 'AP - Pumping Units', code: 'AP' },
        { value: 'AT', label: 'AT - Cleaning, Drying & Separating Devices', code: 'AT' },
      ],
    },
    {
      main: 'B',
      label: 'Devices',
      categories: [
        { value: 'BB', label: 'BB - Storage Devices (Vessels & Containers)', code: 'BB' },
        { value: 'BN', label: 'BN - Jet Pumps, Ejectors & Injectors', code: 'BN' },
        { value: 'BP', label: 'BP - Flow Restrictors & Throttle Washers', code: 'BP' },
        { value: 'BQ', label: 'BQ - Supports, Brackets & Penetrations', code: 'BQ' },
        { value: 'BR', label: 'BR - Pipelines, Channels & Trays', code: 'BR' },
        { value: 'BS', label: 'BS - Silencers', code: 'BS' },
      ],
    },
    {
      main: 'C',
      label: 'Sensors',
      categories: [
        { value: 'CE', label: 'CE - Electrical Quantities', code: 'CE' },
        { value: 'CF', label: 'CF - Flow & Mass Flow', code: 'CF' },
        { value: 'CJ', label: 'CJ - Power (Mechanical & Thermal)', code: 'CJ' },
        { value: 'CL', label: 'CL - Level & Media Separation', code: 'CL' },
        { value: 'CM', label: 'CM - Humidity', code: 'CM' },
        { value: 'CP', label: 'CP - Pressure', code: 'CP' },
        { value: 'CQ', label: 'CQ - Quality & Substance Analysis', code: 'CQ' },
        { value: 'CS', label: 'CS - Speed, Revolutions & Acceleration', code: 'CS' },
        { value: 'CT', label: 'CT - Temperature', code: 'CT' },
      ],
    },
    {
      main: 'S',
      label: 'Special Categories',
      categories: [
        { value: 'terminals', label: 'System Terminals', code: '' },
        { value: 'corners', label: 'Pipe Corners & Bends', code: '' },
        { value: 'electrical', label: 'Electrical Components', code: '' },
        { value: 'additional', label: 'Additional Components', code: '' },
      ],
    },
  ];

  // Handle category change - also update KKS equipment code
  const handleCategoryChange = (value: SymbolCategory) => {
    setMetadata('category', value);
    // Special categories don't have KKS codes
    const specialCategories: SymbolCategory[] = ['terminals', 'corners', 'electrical', 'additional'];
    if (!specialCategories.includes(value)) {
      setMetadata('kksEquipmentCode', value);
    } else {
      // Special categories don't have KKS codes
      setMetadata('kksEquipmentCode', '');
      setMetadata('noKks', true);
    }
  };

  const standards: Array<{ value: SymbolStandard; label: string }> = [
    { value: 'ISA', label: 'ISA' },
    { value: 'DIN', label: 'DIN' },
    { value: 'ISO', label: 'ISO' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Symbol Name * <span className="text-gray-500">(unique identifier)</span>
        </label>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => setMetadata('name', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
          placeholder="e.g., custom-valve"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Display Name *
        </label>
        <input
          type="text"
          value={metadata.displayName}
          onChange={(e) => setMetadata('displayName', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
          placeholder="e.g., Custom Valve"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={metadata.description}
          onChange={(e) => setMetadata('description', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
          placeholder="Enter description..."
          rows={3}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Category * <span className="text-gray-500">(KKS Equipment Code)</span>
        </label>
        <select
          value={metadata.category}
          onChange={(e) => handleCategoryChange(e.target.value as SymbolCategory)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
        >
          {categoryGroups.map((group) => (
            <optgroup key={group.main} label={`${group.main} - ${group.label}`}>
              {group.categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Standard
        </label>
        <select
          value={metadata.standard}
          onChange={(e) => setMetadata('standard', e.target.value as SymbolStandard)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
        >
          {standards.map((std) => (
            <option key={std.value} value={std.value}>
              {std.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          KKS Equipment Code
        </label>
        <input
          type="text"
          value={metadata.kksEquipmentCode}
          onChange={(e) => setMetadata('kksEquipmentCode', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
          placeholder="e.g., AA (for valves)"
          maxLength={2}
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="noKks"
          checked={metadata.noKks}
          onChange={(e) => setMetadata('noKks', e.target.checked)}
          className="w-4 h-4 text-pid-primary border-gray-300 rounded focus:ring-2 focus:ring-pid-primary"
        />
        <label htmlFor="noKks" className="text-sm text-gray-700 cursor-pointer">
          No KKS required (auto-generate simple IDs)
        </label>
      </div>
    </div>
  );
};

// ============================================================================
// Sizing Tab
// ============================================================================

const SizingTab: React.FC = () => {
  const { sizing, setSizing } = useDesignerStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Size
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
            <input
              type="number"
              value={sizing.defaultSize.width}
              onChange={(e) => setSizing('defaultSize', { ...sizing.defaultSize, width: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={500}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
            <input
              type="number"
              value={sizing.defaultSize.height}
              onChange={(e) => setSizing('defaultSize', { ...sizing.defaultSize, height: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={500}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Minimum Size
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
            <input
              type="number"
              value={sizing.minSize.width}
              onChange={(e) => setSizing('minSize', { ...sizing.minSize, width: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={500}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
            <input
              type="number"
              value={sizing.minSize.height}
              onChange={(e) => setSizing('minSize', { ...sizing.minSize, height: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={500}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maximum Size
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width (px)</label>
            <input
              type="number"
              value={sizing.maxSize.width}
              onChange={(e) => setSizing('maxSize', { ...sizing.maxSize, width: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={1000}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height (px)</label>
            <input
              type="number"
              value={sizing.maxSize.height}
              onChange={(e) => setSizing('maxSize', { ...sizing.maxSize, height: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              min={10}
              max={1000}
            />
          </div>
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="resizable"
            checked={sizing.resizable}
            onChange={(e) => setSizing('resizable', e.target.checked)}
            className="w-4 h-4 text-pid-primary border-gray-300 rounded focus:ring-2 focus:ring-pid-primary"
          />
          <label htmlFor="resizable" className="text-sm text-gray-700 cursor-pointer">
            Allow resizing
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="aspectRatioLocked"
            checked={sizing.aspectRatioLocked}
            onChange={(e) => setSizing('aspectRatioLocked', e.target.checked)}
            className="w-4 h-4 text-pid-primary border-gray-300 rounded focus:ring-2 focus:ring-pid-primary"
          />
          <label htmlFor="aspectRatioLocked" className="text-sm text-gray-700 cursor-pointer">
            Lock aspect ratio
          </label>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Behavior Tab
// ============================================================================

const BehaviorTab: React.FC = () => {
  const { behavior, setBehavior } = useDesignerStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rotatable"
          checked={behavior.rotatable}
          onChange={(e) => setBehavior('rotatable', e.target.checked)}
          className="w-4 h-4 text-pid-primary border-gray-300 rounded focus:ring-2 focus:ring-pid-primary"
        />
        <label htmlFor="rotatable" className="text-sm text-gray-700 cursor-pointer">
          Allow rotation
        </label>
      </div>

      {behavior.rotatable && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Rotation Steps (degrees)
            </label>
            <div className="text-xs text-gray-500 mb-2">
              Comma-separated values (e.g., 0, 90, 180, 270)
            </div>
            <input
              type="text"
              value={behavior.rotationSteps.join(', ')}
              onChange={(e) => {
                const steps = e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
                setBehavior('rotationSteps', steps);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pid-primary focus:border-transparent"
              placeholder="0, 90, 180, 270"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="freeRotation"
              checked={behavior.freeRotation}
              onChange={(e) => setBehavior('freeRotation', e.target.checked)}
              className="w-4 h-4 text-pid-primary border-gray-300 rounded focus:ring-2 focus:ring-pid-primary"
            />
            <label htmlFor="freeRotation" className="text-sm text-gray-700 cursor-pointer">
              Allow free rotation (any angle)
            </label>
          </div>
        </>
      )}

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">
          Additional behavior options will be available in future updates.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Paths Tab
// ============================================================================

const PathsTab: React.FC = () => {
  const { paths, selectedPathIndex, selectPath, updatePath, deletePath } = useDesignerStore();

  if (paths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <svg className="w-16 h-16 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <polyline points="4 17 10 11 16 17 22 11" />
        </svg>
        <p className="text-sm">No paths drawn yet</p>
        <p className="text-xs mt-1">Use the drawing tools to create shapes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paths.map((path, index) => (
        <div
          key={index}
          className={`border rounded-lg p-3 transition-all ${
            selectedPathIndex === index
              ? 'border-pid-primary bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => selectPath(index)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">
              {path.type.charAt(0).toUpperCase() + path.type.slice(1)} #{index + 1}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePath(index);
              }}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete path"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stroke Color */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Stroke Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={path.style.stroke === 'inherit' ? '#000000' : path.style.stroke}
                onChange={(e) => updatePath(index, { style: { ...path.style, stroke: e.target.value } })}
                className="h-8 w-12 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={path.style.stroke === 'inherit' ? '#000000' : path.style.stroke}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    updatePath(index, { style: { ...path.style, stroke: value } });
                  }
                }}
                placeholder="#000000"
                className="flex-1 px-2 py-1 text-xs font-mono border border-gray-300 rounded uppercase"
                maxLength={7}
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div className="mt-2">
            <label className="block text-xs text-gray-600 mb-1">Stroke Width</label>
            <input
              type="number"
              value={path.style.strokeWidth || 2}
              onChange={(e) => updatePath(index, { style: { ...path.style, strokeWidth: Number(e.target.value) } })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              min={1}
              max={10}
            />
          </div>

          {/* Fill Color (for filled shapes) */}
          {(path.type === 'rect' || path.type === 'circle' || path.type === 'polygon') && (
            <div className="mt-2">
              <label className="block text-xs text-gray-600 mb-1">Fill Color</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="color"
                  value={path.style.fill === 'inherit' || path.style.fill === 'transparent' ? '#ffffff' : path.style.fill}
                  onChange={(e) => updatePath(index, { style: { ...path.style, fill: e.target.value } })}
                  className="h-8 w-12 rounded border border-gray-300 cursor-pointer"
                  disabled={path.style.fill === 'transparent'}
                />
                <input
                  type="text"
                  value={path.style.fill === 'transparent' ? '' : (path.style.fill === 'inherit' ? '#ffffff' : path.style.fill)}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      updatePath(index, { style: { ...path.style, fill: value } });
                    }
                  }}
                  placeholder={path.style.fill === 'transparent' ? 'Transparent' : '#ffffff'}
                  className="flex-1 px-2 py-1 text-xs font-mono border border-gray-300 rounded uppercase"
                  maxLength={7}
                  disabled={path.style.fill === 'transparent'}
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newFill = path.style.fill === 'transparent' ? '#ffffff' : 'transparent';
                  updatePath(index, { style: { ...path.style, fill: newFill } });
                }}
                className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                  path.style.fill === 'transparent'
                    ? 'bg-gray-200 border-gray-400 text-gray-700'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-600'
                }`}
              >
                {path.style.fill === 'transparent' ? 'Set Fill Color' : 'Make Transparent'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Ports Tab
// ============================================================================

const PortsTab: React.FC = () => {
  const { ports, selectedPortId, selectPort, updatePort, deletePort } = useDesignerStore();

  if (ports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <svg className="w-16 h-16 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        <p className="text-sm">No ports added yet</p>
        <p className="text-xs mt-1">Use the port tool to add connection points</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ports.map((port) => (
        <div
          key={port.id}
          className={`border rounded-lg p-3 transition-all ${
            selectedPortId === port.id
              ? 'border-pid-primary bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => selectPort(port.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">{port.name}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePort(port.id);
              }}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete port"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={port.name}
                onChange={(e) => updatePort(port.id, { name: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Direction</label>
              <select
                value={port.direction}
                onChange={(e) => updatePort(port.id, { direction: e.target.value as any })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="in">In</option>
                <option value="out">Out</option>
                <option value="bidirectional">Bidirectional</option>
              </select>
            </div>

            <div className="text-xs text-gray-500">
              Position: ({(port.relativePosition.x * 100).toFixed(0)}%, {(port.relativePosition.y * 100).toFixed(0)}%)
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Labels Tab
// ============================================================================

const LabelsTab: React.FC = () => {
  const { labels, addLabel, updateLabel, deleteLabel, selectLabel, selectedLabelId, propertySchema } = useDesignerStore();

  const handleAddLabel = () => {
    const newLabel = {
      id: `label-${Date.now()}`,
      relativePosition: { x: 0.5, y: 1.2 },
      anchor: 'middle' as const,
      binding: 'kks' as const,
      style: { fontSize: 10, fontWeight: 'normal' as const },
    };
    addLabel(newLabel);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleAddLabel}
        className="w-full px-3 py-2 text-sm bg-pid-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Label
      </button>

      {labels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <svg className="w-16 h-16 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          <p className="text-sm">No labels configured</p>
          <p className="text-xs mt-1">Labels display text on the diagram</p>
        </div>
      ) : (
        labels.map((label) => {
          const isSelected = selectedLabelId === label.id;
          return (
            <div
              key={label.id}
              onClick={() => selectLabel(label.id)}
              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                  Label {isSelected && '(Selected)'}
                </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLabel(label.id);
                }}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete label"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Binding</label>
                <select
                  value={label.binding}
                  onChange={(e) => updateLabel(label.id, { binding: e.target.value as any })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="kks">KKS Code</option>
                  {Object.keys(propertySchema.properties).map((propName) => (
                    <option key={propName} value={propName}>
                      {propertySchema.properties[propName].label || propName}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                <input
                  type="number"
                  value={label.style.fontSize}
                  onChange={(e) =>
                    updateLabel(label.id, {
                      style: { ...label.style, fontSize: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  min={6}
                  max={24}
                />
              </div>

              <div className="text-xs text-gray-500">
                Position: ({(label.relativePosition.x * 100).toFixed(0)}%, {(label.relativePosition.y * 100).toFixed(0)}
                %)
              </div>
            </div>
          </div>
        );
        })
      )}
    </div>
  );
};

export default PropertiesPanel;
