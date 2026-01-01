/**
 * Symbol Preview Component
 *
 * Live preview of the symbol being designed.
 * Uses BaseSymbol component for consistent rendering.
 * Shows the symbol at multiple sizes and rotations.
 */

import React from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useDesignerStore } from '../../../store/designerStore';
import { BaseSymbol } from '../../symbols/base/BaseSymbol';
import type { Component } from '../../../types';

export const SymbolPreview: React.FC = () => {
  const { paths, ports, labels, metadata, sizing } = useDesignerStore();

  // Create a temporary component for preview
  const previewComponent: Component = {
    id: 'preview-temp',
    type: metadata.name || 'preview',
    position: { x: 0, y: 0 },
    rotation: 0,
    size: sizing.defaultSize,
    properties: {
      kks: 'PREVIEW-001',
      description: metadata.displayName || 'Preview',
    },
    connections: [],
  };

  // Create a temporary symbol definition
  const previewDefinition = {
    id: metadata.id || 'preview',
    category: metadata.category,
    name: metadata.name || 'preview',
    displayName: metadata.displayName || 'Preview',
    description: metadata.description,
    standard: metadata.standard,
    kksEquipmentCode: metadata.kksEquipmentCode,
    noKks: metadata.noKks,
    defaultSize: sizing.defaultSize,
    minSize: sizing.minSize,
    maxSize: sizing.maxSize,
    resizable: sizing.resizable,
    aspectRatioLocked: sizing.aspectRatioLocked,
    rotatable: true,
    rotationSteps: [0, 90, 180, 270],
    freeRotation: false,
    paths,
    ports,
    labels: labels.length > 0 ? labels : [{
      id: 'main-label',
      relativePosition: { x: 0.5, y: 1.2 },
      anchor: 'middle' as const,
      binding: 'kks' as const,
      style: { fontSize: 10, fontWeight: 'normal' as const },
    }],
    propertySchema: {
      required: [],
      properties: {},
    },
  };

  const canvasWidth = 400;
  const canvasHeight = 180;

  // Calculate positions for multiple preview instances
  const previews = [
    { label: 'Default', rotation: 0, x: 100, y: 90 },
    { label: '90°', rotation: 90, x: 220, y: 90 },
    { label: '180°', rotation: 180, x: 340, y: 90 },
  ];

  if (paths.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <svg className="w-16 h-16 text-gray-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <p className="text-sm text-gray-500 font-medium">No Preview</p>
        <p className="text-xs text-gray-400 mt-1">Draw shapes to see preview</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white">
        <h3 className="text-xs font-semibold text-gray-700">Live Preview</h3>
      </div>

      {/* Preview Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <Stage width={canvasWidth} height={canvasHeight}>
            <Layer>
              {/* Grid background */}
              {Array.from({ length: Math.floor(canvasWidth / 20) + 1 }, (_, i) => (
                <Line
                  key={`grid-v-${i}`}
                  points={[i * 20, 0, i * 20, canvasHeight]}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.floor(canvasHeight / 20) + 1 }, (_, i) => (
                <Line
                  key={`grid-h-${i}`}
                  points={[0, i * 20, canvasWidth, i * 20]}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                />
              ))}

              {/* Render multiple preview instances */}
              {previews.map((preview, index) => (
                <React.Fragment key={index}>
                  <BaseSymbol
                    component={{
                      ...previewComponent,
                      id: `preview-${index}`,
                      position: { x: preview.x, y: preview.y },
                      rotation: preview.rotation,
                    }}
                    definition={previewDefinition}
                    isSelected={false}
                    onSelect={() => {}}
                    onDragStart={() => {}}
                    onDragMove={() => {}}
                    onDragEnd={() => {}}
                  />
                </React.Fragment>
              ))}
            </Layer>
          </Stage>

          {/* Labels */}
          <div className="flex justify-around mt-3 text-xs text-gray-500">
            {previews.map((preview, index) => (
              <div key={index} className="text-center" style={{ width: '120px' }}>
                {preview.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-2 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{paths.length} paths</span>
          <span>{ports.length} ports</span>
          <span>{labels.length} labels</span>
        </div>
      </div>
    </div>
  );
};

export default SymbolPreview;
