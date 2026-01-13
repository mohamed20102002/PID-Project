/**
 * Properties Panel
 *
 * Right panel for viewing and editing selected component properties.
 * Dynamically generates form fields based on symbol property schema.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDiagramStore } from '../../store/diagramStore';
import { usePlantStore } from '../../store/plantStore';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { SymbolRegistry } from '../../data/symbols/SymbolRegistry';
import { Component, ComponentRotation, Connection, BuildingPolygon } from '../../types';
import { PropertySchema, PropertyFieldDefinition } from '../../types/symbol.types';
import { nanoid } from 'nanoid';
import { TerminalLinkDialog } from './TerminalLinkDialog';

interface PropertiesPanelProps {
  className?: string;
}

/**
 * String Field with local state + onBlur pattern
 */
const StringField: React.FC<{
  fieldId: string;
  definition: PropertyFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}> = ({ fieldId, definition, value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(value || '');

  React.useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <div className="mb-3">
      <label htmlFor={fieldId} className="block text-xs font-medium text-gray-600 mb-1">
        {definition.label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={localValue}
        placeholder={definition.placeholder}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

/**
 * Number Field with local state + onBlur pattern
 */
const NumberField: React.FC<{
  fieldId: string;
  definition: PropertyFieldDefinition;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}> = ({ fieldId, definition, value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(String(value ?? definition.defaultValue ?? ''));

  React.useEffect(() => {
    setLocalValue(String(value ?? definition.defaultValue ?? ''));
  }, [value, definition.defaultValue]);

  const handleBlur = () => {
    const numValue = localValue ? Number(localValue) : undefined;
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  return (
    <div className="mb-3">
      <label htmlFor={fieldId} className="block text-xs font-medium text-gray-600 mb-1">
        {definition.label}
      </label>
      <input
        id={fieldId}
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

/**
 * Unit Value Field with local state + onBlur pattern
 */
const UnitValueField: React.FC<{
  fieldId: string;
  definition: PropertyFieldDefinition;
  value: { value?: number; unit?: string };
  onChange: (value: { value?: number; unit?: string }) => void;
}> = ({ fieldId, definition, value, onChange }) => {
  const [localValue, setLocalValue] = React.useState(String(value?.value ?? ''));
  const currentUnit = value?.unit || definition.defaultUnit || '';

  React.useEffect(() => {
    setLocalValue(String(value?.value ?? ''));
  }, [value?.value]);

  const handleBlur = () => {
    const numValue = localValue ? Number(localValue) : undefined;
    if (numValue !== value?.value) {
      onChange({ ...value, value: numValue });
    }
  };

  return (
    <div className="mb-3">
      <label htmlFor={fieldId} className="block text-xs font-medium text-gray-600 mb-1">
        {definition.label}
      </label>
      <div className="flex gap-1">
        <input
          id={fieldId}
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={currentUnit}
          onChange={(e) => onChange({ ...value, unit: e.target.value })}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-r focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {definition.units?.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/**
 * Property Field Component - Routes to appropriate field type
 */
const PropertyField: React.FC<{
  name: string;
  definition: PropertyFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ name, definition, value, onChange }) => {
  const fieldId = `prop-${name}`;

  switch (definition.type) {
    case 'string':
      return (
        <StringField
          fieldId={fieldId}
          definition={definition}
          value={value as string}
          onChange={onChange}
        />
      );

    case 'number':
      return (
        <NumberField
          fieldId={fieldId}
          definition={definition}
          value={value as number | undefined}
          onChange={onChange}
        />
      );

    case 'boolean':
      return (
        <div className="mb-3 flex items-center gap-2">
          <input
            id={fieldId}
            type="checkbox"
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor={fieldId} className="text-sm text-gray-700">
            {definition.label}
          </label>
        </div>
      );

    case 'select':
      return (
        <div className="mb-3">
          <label htmlFor={fieldId} className="block text-xs font-medium text-gray-600 mb-1">
            {definition.label}
          </label>
          <select
            id={fieldId}
            value={(value as string) || definition.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select...</option>
            {definition.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'unit-value':
      return (
        <UnitValueField
          fieldId={fieldId}
          definition={definition}
          value={value as { value?: number; unit?: string }}
          onChange={onChange}
        />
      );

    default:
      return (
        <StringField
          fieldId={fieldId}
          definition={definition}
          value={String(value || '')}
          onChange={onChange}
        />
      );
  }
};

/**
 * Component Info Section
 */
const ComponentInfo: React.FC<{
  component: Component;
  symbolName: string;
  symbolCategory: string;
  onUpdateKks: (kks: string) => void;
  onUpdateBuildingKks: (buildingKks: string) => void;
  onPropertyChange?: (propertyName: string, value: unknown) => void;
}> = ({ component, symbolName, symbolCategory, onUpdateKks, onUpdateBuildingKks, onPropertyChange }) => {
  const [localBuildingKks, setLocalBuildingKks] = React.useState(component.buildingKks);

  // Terminal ID for terminal components
  const isTerminal = component.type.startsWith('terminals:');
  const props = component.properties as Record<string, string>;
  const terminalId = props.terminalId || '';

  // For terminals with terminalId, extract the base KKS (without the -terminalId suffix)
  // The component.kks stores the full KKS (base-terminalId) for terminals
  const getBaseKks = React.useCallback(() => {
    if (isTerminal && terminalId && component.kks.endsWith(`-${terminalId}`)) {
      return component.kks.slice(0, -(terminalId.length + 1));
    }
    return component.kks;
  }, [isTerminal, terminalId, component.kks]);

  const [localKks, setLocalKks] = React.useState(getBaseKks());
  const [localTerminalId, setLocalTerminalId] = React.useState(terminalId);

  // Sync local state when component changes
  React.useEffect(() => {
    setLocalKks(getBaseKks());
  }, [getBaseKks]);

  React.useEffect(() => {
    setLocalBuildingKks(component.buildingKks);
  }, [component.buildingKks]);

  React.useEffect(() => {
    if (isTerminal) {
      setLocalTerminalId(terminalId);
    }
  }, [isTerminal, terminalId]);

  const handleKksBlur = () => {
    // Compare with base KKS for terminals, or full KKS for regular components
    const baseKks = getBaseKks();
    if (localKks !== baseKks) {
      // For terminals with terminalId, we pass the new base KKS
      // The handleKksChange will append the terminalId to form the full KKS
      onUpdateKks(localKks);
    }
  };

  const handleBuildingBlur = () => {
    if (localBuildingKks !== component.buildingKks) {
      onUpdateBuildingKks(localBuildingKks);
    }
  };

  const handleTerminalIdBlur = () => {
    const trimmed = localTerminalId.trim();
    if (trimmed !== (props.terminalId || '') && onPropertyChange) {
      onPropertyChange('terminalId', trimmed);
    }
  };

  const handleTerminalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, '');
    setLocalTerminalId(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Compute full KKS with terminal ID for display
  const fullKks = isTerminal && localTerminalId
    ? `${localKks}-${localTerminalId}`
    : localKks;

  return (
    <div className="border-b border-gray-200 pb-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">
          {SymbolRegistry.getCategoryIcon(symbolCategory as any || 'misc')}
        </span>
        <span className="font-medium text-gray-800">{symbolName}</span>
      </div>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          KKS Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={localKks}
          onChange={(e) => setLocalKks(e.target.value)}
          onBlur={handleKksBlur}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Terminal ID - only for terminal components */}
      {isTerminal && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Terminal ID (Numbers only)
          </label>
          <input
            type="text"
            value={localTerminalId}
            onChange={handleTerminalIdChange}
            onBlur={handleTerminalIdBlur}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 12345"
            maxLength={10}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {localTerminalId && (
            <p className="text-xs text-gray-500 mt-1">
              Full ID: <span className="font-mono font-medium">{fullKks}</span>
            </p>
          )}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Building / Location
        </label>
        <input
          type="text"
          value={localBuildingKks}
          onChange={(e) => setLocalBuildingKks(e.target.value)}
          onBlur={handleBuildingBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g., 10UJA, 20UCB"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">Format: Building code (e.g., 10UJA = Reactor Building)</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="text-gray-400">System:</span>
          <span className="ml-1 font-mono">{component.systemKks}</span>
        </div>
        <div>
          <span className="text-gray-400">Position:</span>
          <span className="ml-1">
            ({Math.round(component.position.x)}, {Math.round(component.position.y)})
          </span>
        </div>
        <div>
          <span className="text-gray-400">Rotation:</span>
          <span className="ml-1">{component.rotation}°</span>
        </div>
        <div>
          <span className="text-gray-400">Type:</span>
          <span className="ml-1">{symbolName}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Rotation Controls
 */
const RotationControls: React.FC<{
  rotation: ComponentRotation;
  rotationSteps: number[];
  onRotate: (rotation: ComponentRotation) => void;
}> = ({ rotation, rotationSteps, onRotate }) => {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-2">Rotation</label>
      <div className="flex gap-1">
        {rotationSteps.map((step) => (
          <button
            key={step}
            onClick={() => onRotate(step as ComponentRotation)}
            className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
              rotation === step
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {step}°
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Flip Controls
 */
const FlipControls: React.FC<{
  flipX: boolean;
  flipY: boolean;
  onFlipChange: (flip: { flipX?: boolean; flipY?: boolean }) => void;
}> = ({ flipX, flipY, onFlipChange }) => {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-2">Flip</label>
      <div className="flex gap-2">
        <button
          onClick={() => onFlipChange({ flipX: !flipX })}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
            flipX
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" />
          </svg>
          Flip X
        </button>
        <button
          onClick={() => onFlipChange({ flipY: !flipY })}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
            flipY
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4" />
          </svg>
          Flip Y
        </button>
      </div>
    </div>
  );
};

/**
 * Style Controls
 */
const StyleControls: React.FC<{
  strokeColor: string;
  fillColor: string;
  onStyleChange: (style: { strokeColor?: string; fillColor?: string }) => void;
}> = ({ strokeColor, fillColor, onStyleChange }) => {
  const [localStroke, setLocalStroke] = React.useState(strokeColor);
  const [localFill, setLocalFill] = React.useState(fillColor);

  React.useEffect(() => {
    setLocalStroke(strokeColor);
  }, [strokeColor]);

  React.useEffect(() => {
    setLocalFill(fillColor);
  }, [fillColor]);

  const handleStrokeBlur = () => {
    if (localStroke !== strokeColor) {
      onStyleChange({ strokeColor: localStroke });
    }
  };

  const handleFillBlur = () => {
    if (localFill !== fillColor) {
      onStyleChange({ fillColor: localFill });
    }
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <h4 className="text-xs font-medium text-gray-600 mb-2">Style</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Stroke</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localStroke}
              onChange={(e) => {
                setLocalStroke(e.target.value);
                onStyleChange({ strokeColor: e.target.value });
              }}
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={localStroke}
              onChange={(e) => setLocalStroke(e.target.value)}
              onBlur={handleStrokeBlur}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fill</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localFill}
              onChange={(e) => {
                setLocalFill(e.target.value);
                onStyleChange({ fillColor: e.target.value });
              }}
              className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={localFill}
              onChange={(e) => setLocalFill(e.target.value)}
              onBlur={handleFillBlur}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Multi-Selection Info
 */
const MultiSelectionInfo: React.FC<{
  count: number;
  onDelete: () => void;
}> = ({ count, onDelete }) => {
  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-2">📦</div>
      <p className="text-sm text-gray-600 mb-1">
        <span className="font-semibold text-blue-600">{count}</span> components selected
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Select a single component to edit properties
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          Delete Selected
        </button>
      </div>
    </div>
  );
};

/**
 * No Selection State
 */
const NoSelection: React.FC = () => {
  return (
    <div className="text-center text-gray-400 py-8">
      <svg
        className="w-12 h-12 mx-auto mb-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
      <p className="text-sm">No component selected</p>
      <p className="text-xs mt-1">Click a component to edit its properties</p>
    </div>
  );
};

/**
 * Terminal Settings Component with Text Inputs and Quick Link Dialog
 */
const TerminalSettings: React.FC<{
  component: Component;
  currentSystemKks: string;
  onPropertyChange: (propertyName: string, value: unknown) => void;
}> = ({ component, currentSystemKks, onPropertyChange }) => {
  const props = component.properties as Record<string, string>;

  // Get update functions from store directly to avoid stale closures
  const updateComponent = useDiagramStore((state) => state.updateComponent);
  const updateComponentInSystem = useDiagramStore((state) => state.updateComponentInSystem);

  // Local state for text inputs
  const [localTargetSystem, setLocalTargetSystem] = React.useState(props.targetSystemKks || '');
  const [localTargetTerminal, setLocalTargetTerminal] = React.useState(props.targetTerminalKks || '');

  // State for Quick Link Dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);

  // Sync local state when component changes
  React.useEffect(() => {
    setLocalTargetSystem(props.targetSystemKks || '');
    setLocalTargetTerminal(props.targetTerminalKks || '');
  }, [props.targetSystemKks, props.targetTerminalKks]);

  const handleTargetSystemBlur = () => {
    const trimmed = localTargetSystem.trim().toUpperCase();
    if (trimmed !== (props.targetSystemKks || '')) {
      onPropertyChange('targetSystemKks', trimmed);
    }
  };

  const handleTargetTerminalBlur = () => {
    const trimmed = localTargetTerminal.trim().toUpperCase();
    if (trimmed !== (props.targetTerminalKks || '')) {
      onPropertyChange('targetTerminalKks', trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Handle selection from Quick Link Dialog - always creates bidirectional link
  const handleQuickLinkSelect = React.useCallback((
    targetSystemKks: string,
    targetTerminalKks: string,
    targetTerminalProperties?: Record<string, unknown>
  ) => {
    // Update local state for immediate UI feedback
    setLocalTargetSystem(targetSystemKks);
    setLocalTargetTerminal(targetTerminalKks);

    // Update the current component directly using the store (avoids stale closure issues)
    // We use the component.kks from props which is always current
    const currentProps = component.properties as Record<string, unknown>;
    updateComponent(component.kks, {
      properties: {
        ...currentProps,
        targetSystemKks: targetSystemKks,
        targetTerminalKks: targetTerminalKks,
      },
    });

    // Always create bidirectional link - update the target terminal to link back
    if (targetTerminalKks && targetTerminalProperties !== undefined) {
      updateComponentInSystem(targetSystemKks, targetTerminalKks, {
        properties: {
          ...targetTerminalProperties,
          targetSystemKks: currentSystemKks,
          targetTerminalKks: component.kks,
        },
      });
    }
  }, [component.kks, component.properties, updateComponent, updateComponentInSystem, currentSystemKks]);

  // Clear link
  const handleClearLink = React.useCallback(() => {
    setLocalTargetSystem('');
    setLocalTargetTerminal('');
    onPropertyChange('targetSystemKks', '');
    onPropertyChange('targetTerminalKks', '');
  }, [onPropertyChange]);

  const hasLink = localTargetSystem || localTargetTerminal;

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-600">Terminal Link Settings</h4>
        <button
          onClick={() => setIsLinkDialogOpen(true)}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          Quick Link
        </button>
      </div>

      {/* Current Link Status */}
      {hasLink && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <span className="text-blue-800">
                <span className="font-mono font-medium">{localTargetSystem}</span>
                {localTargetTerminal && (
                  <span className="text-blue-600"> / {localTargetTerminal}</span>
                )}
              </span>
            </div>
            <button
              onClick={handleClearLink}
              className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Clear link"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Target System KKS */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Target System KKS
        </label>
        <input
          type="text"
          value={localTargetSystem}
          onChange={(e) => setLocalTargetSystem(e.target.value)}
          onBlur={handleTargetSystemBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g., LAA10, LBA20"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          System to navigate to. Use "{currentSystemKks}" for same system.
        </p>
      </div>

      {/* Target Terminal KKS */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Target Terminal KKS
        </label>
        <input
          type="text"
          value={localTargetTerminal}
          onChange={(e) => setLocalTargetTerminal(e.target.value)}
          onBlur={handleTargetTerminalBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g., LAA10-XT001"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          Leave empty to auto-find a matching terminal on navigation.
        </p>
      </div>

      {/* Quick Link Dialog */}
      <TerminalLinkDialog
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        onSelect={handleQuickLinkSelect}
        currentSystemKks={currentSystemKks}
        currentTerminalKks={component.kks}
      />
    </div>
  );
};

/**
 * Connection/Pipe Properties Component
 */
const ConnectionProperties: React.FC<{
  connection: Connection;
  onUpdate: (updates: Partial<Connection>) => void;
  onDelete: () => void;
}> = ({ connection, onUpdate, onDelete }) => {
  const [localKks, setLocalKks] = React.useState(connection.kks || '');
  const [localLabel, setLocalLabel] = React.useState(connection.label || '');
  const [localStrokeColor, setLocalStrokeColor] = React.useState(connection.style?.strokeColor || '#000000');
  const [localStrokeWidth, setLocalStrokeWidth] = React.useState(connection.style?.strokeWidth || 2);

  React.useEffect(() => {
    setLocalKks(connection.kks || '');
    setLocalLabel(connection.label || '');
    setLocalStrokeColor(connection.style?.strokeColor || '#000000');
    setLocalStrokeWidth(connection.style?.strokeWidth || 2);
  }, [connection]);

  const handleKksBlur = () => {
    if (localKks !== connection.kks) {
      onUpdate({ kks: localKks });
    }
  };

  const handleLabelBlur = () => {
    if (localLabel !== connection.label) {
      onUpdate({ label: localLabel || undefined });
    }
  };

  const handleColorChange = (color: string) => {
    setLocalStrokeColor(color);
    onUpdate({
      style: {
        ...connection.style,
        strokeColor: color,
      },
    });
  };

  const handleWidthChange = (width: number) => {
    setLocalStrokeWidth(width);
    onUpdate({
      style: {
        ...connection.style,
        strokeWidth: width,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Connection Header */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span className="font-medium text-gray-800">
            {connection.type === 'pipe' ? 'Pipe' : 'Signal'} Connection
          </span>
        </div>
      </div>

      {/* KKS Code */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          KKS Code (optional)
        </label>
        <input
          type="text"
          value={localKks}
          onChange={(e) => setLocalKks(e.target.value)}
          onBlur={handleKksBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="e.g., 10LAA10-AA001"
          className="w-full px-2 py-1.5 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">Shown above the pipe if set</p>
      </div>

      {/* Label/Tag */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Label / Description (optional)
        </label>
        <input
          type="text"
          value={localLabel}
          onChange={(e) => setLocalLabel(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="e.g., DN100, Cooling Water"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">Shown below the pipe if set</p>
      </div>

      {/* Label Rotation */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Label Rotation
        </label>
        <div className="flex gap-1">
          {[0, 45, 90, -45, -90].map((angle) => (
            <button
              key={angle}
              onClick={() => onUpdate({ labelRotation: angle })}
              className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                (connection.labelRotation || 0) === angle
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {angle}°
            </button>
          ))}
        </div>
      </div>

      {/* Style Section */}
      <div className="border-t border-gray-200 pt-3">
        <h4 className="text-xs font-medium text-gray-600 mb-3">Pipe Style</h4>

        {/* Color */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localStrokeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={localStrokeColor}
              onChange={(e) => {
                setLocalStrokeColor(e.target.value);
              }}
              onBlur={() => handleColorChange(localStrokeColor)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
            />
          </div>
          {/* Color presets */}
          <div className="flex gap-1 mt-2">
            {['#000000', '#1a1a1a', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'].map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Thickness */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">
            Thickness: {localStrokeWidth}px
          </label>
          <input
            type="range"
            min="1"
            max="8"
            step="0.5"
            value={localStrokeWidth}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Thin</span>
            <span>Thick</span>
          </div>
        </div>

        {/* Line Type */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Line Type</label>
          <div className="flex gap-1">
            {[
              { type: 'solid', label: 'Solid', dash: undefined },
              { type: 'dashed', label: 'Dashed', dash: [8, 4] },
              { type: 'dotted', label: 'Dotted', dash: [2, 2] },
            ].map((opt) => (
              <button
                key={opt.type}
                onClick={() =>
                  onUpdate({
                    style: {
                      ...connection.style,
                      lineType: opt.type as 'solid' | 'dashed' | 'dotted',
                      strokeDash: opt.dash,
                    },
                  })
                }
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                  connection.style?.lineType === opt.type || (!connection.style?.lineType && opt.type === 'solid')
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <div className="border-t border-gray-200 pt-3 text-xs text-gray-500">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">From:</span>
            <span className="ml-1 font-mono">{connection.sourceComponentKks}</span>
          </div>
          <div>
            <span className="text-gray-400">To:</span>
            <span className="ml-1 font-mono">{connection.targetComponentKks}</span>
          </div>
        </div>
        {connection.isCrossSystem && (
          <div className="mt-2 text-orange-600">
            Cross-system connection
          </div>
        )}
      </div>

      {/* Delete Button */}
      <div className="border-t border-gray-200 pt-3">
        <button
          onClick={onDelete}
          className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          Delete Pipe
        </button>
      </div>
    </div>
  );
};

/**
 * Building Properties Component
 */
const BuildingProperties: React.FC<{
  building: BuildingPolygon;
  onUpdate: (updates: Partial<BuildingPolygon>) => void;
  onDelete: () => void;
}> = ({ building, onUpdate, onDelete }) => {
  const [localName, setLocalName] = React.useState(building.name || 'New Building');
  const [localFillColor, setLocalFillColor] = React.useState(building.fillColor || 'rgba(200, 220, 255, 0.2)');
  const [localStrokeColor, setLocalStrokeColor] = React.useState(building.strokeColor || '#64748b');
  const [localOpacity, setLocalOpacity] = React.useState(0.2);

  React.useEffect(() => {
    setLocalName(building.name || 'New Building');
    setLocalFillColor(building.fillColor || 'rgba(200, 220, 255, 0.2)');
    setLocalStrokeColor(building.strokeColor || '#64748b');

    // Extract opacity from current fill color
    const opacityMatch = (building.fillColor || '').match(/rgba?\([^)]+,\s*([\d.]+)\)/);
    if (opacityMatch) {
      setLocalOpacity(parseFloat(opacityMatch[1]));
    }
  }, [building]);

  const handleNameBlur = () => {
    if (localName !== building.name) {
      onUpdate({ name: localName });
    }
  };

  const handleFillColorChange = (color: string) => {
    setLocalFillColor(color);
    // Convert hex to rgba with current opacity
    const rgba = hexToRgba(color, localOpacity);
    onUpdate({ fillColor: rgba });
  };

  const handleOpacityChange = (opacity: number) => {
    setLocalOpacity(opacity);
    // Update fill color with new opacity
    const hexColor = rgbaToHex(localFillColor);
    const rgba = hexToRgba(hexColor, opacity);
    setLocalFillColor(rgba);
    onUpdate({ fillColor: rgba });
  };

  const handleStrokeColorChange = (color: string) => {
    setLocalStrokeColor(color);
    onUpdate({ strokeColor: color });
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Extract hex from rgba or return as-is if hex
  const rgbaToHex = (color: string) => {
    if (color.startsWith('#')) return color;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#c8dcff';
  };

  return (
    <div className="space-y-4">
      {/* Building Header */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3,3 21,3 21,14 12,21 3,14" strokeLinejoin="round" />
            <line x1="3" y1="14" x2="21" y2="14" />
          </svg>
          <span className="font-medium text-gray-800">Building Area</span>
        </div>
        <p className="text-xs text-gray-500 font-mono">{building.id}</p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Building Name
        </label>
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="Enter building name"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Style Section */}
      <div className="border-t border-gray-200 pt-3">
        <h4 className="text-xs font-medium text-gray-600 mb-3">Building Style</h4>

        {/* Fill Color */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Fill Color</label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="color"
              value={rgbaToHex(localFillColor)}
              onChange={(e) => handleFillColorChange(e.target.value)}
              className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Opacity</span>
                <span className="text-xs font-mono text-gray-600">{Math.round(localOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localOpacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          {/* Color presets */}
          <div className="flex gap-1 mt-2">
            {['#c8dcff', '#d4edda', '#fff3cd', '#f8d7da', '#e2e3e5', '#d1ecf1', '#e8daef'].map((color) => (
              <button
                key={color}
                onClick={() => handleFillColorChange(color)}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Stroke Color */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Border Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localStrokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={localStrokeColor}
              onChange={(e) => setLocalStrokeColor(e.target.value)}
              onBlur={() => handleStrokeColorChange(localStrokeColor)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">
            Border Width: {building.strokeWidth || 1}px
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={building.strokeWidth || 1}
            onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Border Style */}
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Border Style</label>
          <select
            value={building.strokeDash ? 'dashed' : 'solid'}
            onChange={(e) => {
              if (e.target.value === 'dashed') {
                onUpdate({ strokeDash: [5, 5] });
              } else {
                onUpdate({ strokeDash: undefined });
              }
            }}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
          </select>
        </div>

        {/* Label Visibility */}
        <div className="mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={building.labelVisible !== false}
              onChange={(e) => onUpdate({ labelVisible: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600">Show Label</span>
          </label>
        </div>

        {/* Label Position */}
        {building.labelVisible !== false && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Label Position</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                X: {Math.round(building.labelPosition?.x || 0)}, Y: {Math.round(building.labelPosition?.y || 0)}
              </span>
              <button
                onClick={() => {
                  // Reset to center of polygon
                  if (building.polygon && building.polygon.length > 0) {
                    const xs = building.polygon.map((p) => p.x);
                    const ys = building.polygon.map((p) => p.y);
                    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
                    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
                    onUpdate({ labelPosition: { x: centerX, y: centerY } });
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                Reset to Center
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Drag label on canvas when selected</p>
          </div>
        )}
      </div>

      {/* Building Info */}
      <div className="border-t border-gray-200 pt-3 text-xs text-gray-500">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">Vertices:</span>
            <span className="ml-1">{building.polygon?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Z-Index:</span>
            <span className="ml-1">{building.zIndex || 0}</span>
          </div>
        </div>
      </div>

      {/* Z-Index Control */}
      <div className="border-t border-gray-200 pt-3">
        <label className="block text-xs font-medium text-gray-600 mb-2">Layer Order</label>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ zIndex: (building.zIndex || 0) - 1 })}
            className="flex-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Send Back
          </button>
          <button
            onClick={() => onUpdate({ zIndex: (building.zIndex || 0) + 1 })}
            className="flex-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Bring Forward
          </button>
        </div>
      </div>

      {/* Delete Button */}
      <div className="border-t border-gray-200 pt-3">
        <button
          onClick={onDelete}
          className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          Delete Building
        </button>
      </div>
    </div>
  );
};

/**
 * Properties Panel Component
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className = '' }) => {
  // Get selection state
  const selection = useUIStore((state) => state.selection);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const selectedBuildingId = useUIStore((state) => state.selectedBuildingId);
  const selectBuilding = useUIStore((state) => state.selectBuilding);

  // Get diagram store
  const diagram = useDiagramStore((state) => state.diagram);
  const diagramCache = useDiagramStore((state) => state.diagramCache);
  const updateComponent = useDiagramStore((state) => state.updateComponent);
  const renameComponent = useDiagramStore((state) => state.renameComponent);
  const rotateComponent = useDiagramStore((state) => state.rotateComponent);
  const deleteMultiple = useDiagramStore((state) => state.deleteMultiple);
  const addComponent = useDiagramStore((state) => state.addComponent);
  const switchToSystem = useDiagramStore((state) => state.switchToSystem);
  const updateConnection = useDiagramStore((state) => state.updateConnection);
  const updateBuilding = useDiagramStore((state) => state.updateBuilding);
  const deleteBuilding = useDiagramStore((state) => state.deleteBuilding);

  // Plant store
  const plant = usePlantStore((state) => state.plant);

  // Custom symbols store - contains all symbols (built-in + custom)
  const customSymbols = useCustomSymbolStore((state) => state.customSymbols);

  // Get selected component (if single selection) - directly access diagram.components for reactivity
  const selectedComponent = useMemo(() => {
    if (selection.componentKks.length === 1 && diagram) {
      return diagram.components[selection.componentKks[0]];
    }
    return undefined;
  }, [selection.componentKks, diagram]);

  // Get selected connection (if single selection)
  const selectedConnection = useMemo(() => {
    if (selection.connectionKks.length === 1 && selection.componentKks.length === 0 && diagram) {
      return diagram.connections[selection.connectionKks[0]];
    }
    return undefined;
  }, [selection.connectionKks, selection.componentKks, diagram]);

  // Get selected building
  const selectedBuilding = useMemo(() => {
    if (selectedBuildingId && diagram?.buildings) {
      return diagram.buildings[selectedBuildingId];
    }
    return undefined;
  }, [selectedBuildingId, diagram]);

  // Get symbol definition - use customSymbols store which contains all symbols
  const symbolDefinition = useMemo(() => {
    if (selectedComponent) {
      // First check customSymbols store (contains all symbols including custom)
      const customSymbol = customSymbols[selectedComponent.type];
      if (customSymbol) return customSymbol;
      // Fallback to SymbolRegistry for any not yet migrated symbols
      return SymbolRegistry.getSymbol(selectedComponent.type);
    }
    return undefined;
  }, [selectedComponent, customSymbols]);

  // Selection handling (needed for property changes that rename components)
  const select = useUIStore((state) => state.select);

  // Handle property change
  const handlePropertyChange = useCallback(
    (propertyName: string, value: unknown) => {
      if (!selectedComponent) return;

      // Special handling for terminalId changes on terminals
      const isTerminal = selectedComponent.type.startsWith('terminals:');

      if (isTerminal && propertyName === 'terminalId') {
        const newTerminalId = (value as string || '').trim();
        const currentKks = selectedComponent.kks;
        const props = selectedComponent.properties as Record<string, string>;
        const oldTerminalId = props.terminalId || '';

        // Extract base KKS by removing old terminal ID suffix if present
        let baseKks = currentKks;
        if (oldTerminalId && currentKks.endsWith(`-${oldTerminalId}`)) {
          baseKks = currentKks.slice(0, -(oldTerminalId.length + 1));
        }

        // Compute new full KKS
        const newFullKks = newTerminalId ? `${baseKks}-${newTerminalId}` : baseKks;

        // Update the property first
        updateComponent(currentKks, {
          properties: {
            ...selectedComponent.properties,
            terminalId: newTerminalId,
          },
        });

        // If KKS changed, rename the component
        if (newFullKks !== currentKks) {
          const success = renameComponent(currentKks, newFullKks);
          if (success) {
            select([newFullKks], []);
          }
        }
        return;
      }

      updateComponent(selectedComponent.kks, {
        properties: {
          ...selectedComponent.properties,
          [propertyName]: value,
        },
      });
    },
    [selectedComponent, updateComponent, renameComponent, select]
  );

  // Handle KKS change (for terminals, this receives the base KKS without terminalId)
  const handleKksChange = useCallback(
    (newBaseKks: string) => {
      if (!selectedComponent || !newBaseKks.trim()) return;
      const trimmedBaseKks = newBaseKks.trim().toUpperCase();

      // For terminals with terminalId, we need to append it to form the full KKS
      const isTerminal = selectedComponent.type.startsWith('terminals:');
      const props = selectedComponent.properties as Record<string, string>;
      const terminalId = isTerminal ? (props.terminalId || '') : '';

      // Compute the new full KKS
      const newFullKks = terminalId ? `${trimmedBaseKks}-${terminalId}` : trimmedBaseKks;

      // Don't rename if the KKS hasn't changed
      if (newFullKks === selectedComponent.kks) return;

      const oldKks = selectedComponent.kks;
      const success = renameComponent(oldKks, newFullKks);
      // Update selection to use new KKS
      if (success) {
        select([newFullKks], []);
      }
    },
    [selectedComponent, renameComponent, select]
  );

  // Handle Building KKS change
  const handleBuildingKksChange = useCallback(
    (buildingKks: string) => {
      if (!selectedComponent) return;
      const trimmedBuildingKks = buildingKks.trim().toUpperCase();
      updateComponent(selectedComponent.kks, {
        buildingKks: trimmedBuildingKks,
      });
    },
    [selectedComponent, updateComponent]
  );

  // Handle rotation change
  const handleRotationChange = useCallback(
    (rotation: ComponentRotation) => {
      if (!selectedComponent) return;
      rotateComponent(selectedComponent.kks, rotation);
    },
    [selectedComponent, rotateComponent]
  );

  // Handle flip change
  const handleFlipChange = useCallback(
    (flip: { flipX?: boolean; flipY?: boolean }) => {
      if (!selectedComponent) return;
      updateComponent(selectedComponent.kks, flip);
    },
    [selectedComponent, updateComponent]
  );

  // Handle style change
  const handleStyleChange = useCallback(
    (style: { strokeColor?: string; fillColor?: string }) => {
      if (!selectedComponent) return;
      updateComponent(selectedComponent.kks, {
        style: {
          ...selectedComponent.style,
          ...style,
        },
      });
    },
    [selectedComponent, updateComponent]
  );

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    deleteMultiple(selection.componentKks, selection.connectionKks);
    clearSelection();
  }, [selection, deleteMultiple, clearSelection]);

  // Handle connection update
  const handleConnectionUpdate = useCallback(
    (updates: Partial<Connection>) => {
      if (!selectedConnection) return;
      updateConnection(selectedConnection.kks, updates);
    },
    [selectedConnection, updateConnection]
  );

  // Handle connection delete
  const handleDeleteConnection = useCallback(() => {
    if (!selectedConnection) return;
    deleteMultiple([], [selectedConnection.kks]);
    clearSelection();
  }, [selectedConnection, deleteMultiple, clearSelection]);

  // Handle building update
  const handleBuildingUpdate = useCallback(
    (updates: Partial<BuildingPolygon>) => {
      if (!selectedBuildingId) return;
      updateBuilding(selectedBuildingId, updates);
    },
    [selectedBuildingId, updateBuilding]
  );

  // Handle building delete
  const handleDeleteBuilding = useCallback(() => {
    if (!selectedBuildingId) return;
    deleteBuilding(selectedBuildingId);
    selectBuilding(null);
  }, [selectedBuildingId, deleteBuilding, selectBuilding]);


  // Check if component is a terminal
  const isTerminal = selectedComponent?.type.startsWith('terminals:');

  // Render based on selection state
  // Show connection properties if a connection is selected
  if (selectedConnection) {
    return (
      <div className={`flex flex-col h-full overflow-y-auto ${className}`}>
        <ConnectionProperties
          connection={selectedConnection}
          onUpdate={handleConnectionUpdate}
          onDelete={handleDeleteConnection}
        />
      </div>
    );
  }

  // Show building properties if a building is selected
  if (selectedBuilding) {
    return (
      <div className={`flex flex-col h-full overflow-y-auto ${className}`}>
        <BuildingProperties
          building={selectedBuilding}
          onUpdate={handleBuildingUpdate}
          onDelete={handleDeleteBuilding}
        />
      </div>
    );
  }

  if (selection.componentKks.length === 0 && selection.connectionKks.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <NoSelection />
      </div>
    );
  }

  if (selection.componentKks.length > 1) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <MultiSelectionInfo
          count={selection.componentKks.length}
          onDelete={handleDeleteSelected}
        />
      </div>
    );
  }

  if (!selectedComponent || !symbolDefinition) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <NoSelection />
      </div>
    );
  }

  const propertySchema = symbolDefinition.propertySchema;

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${className}`}>
      {/* Component Info */}
      <ComponentInfo
        component={selectedComponent}
        symbolName={symbolDefinition.displayName}
        symbolCategory={symbolDefinition.category}
        onUpdateKks={handleKksChange}
        onUpdateBuildingKks={handleBuildingKksChange}
        onPropertyChange={handlePropertyChange}
      />

      {/* Rotation Controls */}
      {symbolDefinition.rotatable && (
        <RotationControls
          rotation={selectedComponent.rotation}
          rotationSteps={symbolDefinition.rotationSteps}
          onRotate={handleRotationChange}
        />
      )}

      {/* Flip Controls */}
      <FlipControls
        flipX={selectedComponent.flipX || false}
        flipY={selectedComponent.flipY || false}
        onFlipChange={handleFlipChange}
      />

      {/* Label Settings */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-2">Label Display</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedComponent.wrapLabel || false}
            onChange={(e) => updateComponent(selectedComponent.kks, { wrapLabel: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Wrap KKS to 2 lines</span>
        </label>
        <p className="text-xs text-gray-400 mt-1">Splits KKS after 7 characters (e.g., 10KBA10 / AA001)</p>
      </div>

      {/* Terminal Link Settings - only for terminals */}
      {isTerminal && diagram && (
        <TerminalSettings
          component={selectedComponent}
          currentSystemKks={diagram.systemKks}
          onPropertyChange={handlePropertyChange}
        />
      )}

      {/* Dynamic Property Fields (excluding terminal link properties) */}
      {propertySchema?.properties && (
        <div className="border-t border-gray-200 pt-3 mt-1">
          <h4 className="text-xs font-medium text-gray-600 mb-2">Properties</h4>
          {Object.entries(propertySchema.properties)
            .filter(([name]) => !isTerminal || !['targetSystemKks', 'targetTerminalKks'].includes(name))
            .map(([name, definition]) => (
              <PropertyField
                key={name}
                name={name}
                definition={definition}
                value={(selectedComponent.properties as Record<string, unknown>)[name]}
                onChange={(value) => handlePropertyChange(name, value)}
              />
            ))}
        </div>
      )}

      {/* Style Controls */}
      <StyleControls
        strokeColor={selectedComponent.style?.strokeColor || '#1a1a1a'}
        fillColor={selectedComponent.style?.fillColor || '#ffffff'}
        onStyleChange={handleStyleChange}
      />

      {/* Delete Button */}
      <div className="border-t border-gray-200 pt-3 mt-3">
        <button
          onClick={handleDeleteSelected}
          className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          Delete Component
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
