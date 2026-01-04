/**
 * Property Configuration Panel
 *
 * Allows users to select and configure properties for symbols being designed.
 * - Browse standard properties by category
 * - Add/remove properties from symbol
 * - Configure property settings (required, default values, etc.)
 * - Create custom properties
 */

import React, { useState, useMemo } from 'react';
import { useDesignerStore } from '../../../store/designerStore';
import {
  PROPERTY_LIBRARY,
  getPropertiesForEquipment,
  type PropertyTemplate,
  type PropertyCategory,
} from '../../../data/properties/PropertyLibrary';
import type { PropertyFieldDefinition } from '../../../types/symbol.types';

const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  identification: 'Identification',
  physical: 'Physical',
  process: 'Process',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  material: 'Material',
  safety: 'Safety',
  control: 'Control',
  performance: 'Performance',
  design: 'Design',
  operational: 'Operational',
  maintenance: 'Maintenance',
};

export const PropertyConfigPanel: React.FC = () => {
  const { metadata, propertySchema, setPropertySchema } = useDesignerStore();
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | 'all'>('all');
  const [showCustomPropertyDialog, setShowCustomPropertyDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get properties applicable to current symbol's KKS code
  const applicableProperties = useMemo(() => {
    if (!metadata.kksEquipmentCode) {
      return PROPERTY_LIBRARY.filter((p) => p.isCommon);
    }
    return getPropertiesForEquipment(metadata.kksEquipmentCode);
  }, [metadata.kksEquipmentCode]);

  // Filter properties by category and search
  const filteredProperties = useMemo(() => {
    let props = applicableProperties;

    if (selectedCategory !== 'all') {
      props = props.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      props = props.filter(
        (p) =>
          p.label.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query)
      );
    }

    return props;
  }, [applicableProperties, selectedCategory, searchQuery]);

  // Check if a property is already added
  const isPropertyAdded = (propertyId: string): boolean => {
    return propertyId in (propertySchema?.properties || {});
  };

  // Add a property to the symbol
  const addProperty = (prop: PropertyTemplate) => {
    const { id, category, applicableTo, isCommon, ...fieldDef } = prop;

    const newProperties = {
      ...(propertySchema?.properties || {}),
      [id]: fieldDef as PropertyFieldDefinition,
    };

    setPropertySchema({
      required: propertySchema?.required || [],
      properties: newProperties,
    });
  };

  // Remove a property from the symbol
  const removeProperty = (propertyId: string) => {
    const newProperties = { ...(propertySchema?.properties || {}) };
    delete newProperties[propertyId];

    const newRequired = (propertySchema?.required || []).filter((r) => r !== propertyId);

    setPropertySchema({
      required: newRequired,
      properties: newProperties,
    });
  };

  // Toggle property required status
  const toggleRequired = (propertyId: string) => {
    const currentRequired = propertySchema?.required || [];
    const newRequired = currentRequired.includes(propertyId)
      ? currentRequired.filter((r) => r !== propertyId)
      : [...currentRequired, propertyId];

    setPropertySchema({
      required: newRequired,
      properties: propertySchema?.properties || {},
    });
  };

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<PropertyCategory | 'all', number>> = { all: applicableProperties.length };
    applicableProperties.forEach((prop) => {
      counts[prop.category] = (counts[prop.category] || 0) + 1;
    });
    return counts;
  }, [applicableProperties]);

  // Get added properties count
  const addedPropertiesCount = Object.keys(propertySchema?.properties || {}).length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Property Configuration</h3>
          <span className="text-xs text-gray-500">
            {addedPropertiesCount} properties added
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="px-2 py-2 border-b border-gray-200 bg-gray-50 overflow-x-auto">
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            All ({categoryCounts.all || 0})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const count = categoryCounts[key as PropertyCategory] || 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as PropertyCategory)}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Property List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>No properties found</p>
            <p className="text-xs mt-1">Try selecting a different category or adjusting your search</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProperties.map((prop) => {
              const isAdded = isPropertyAdded(prop.id);
              const isRequired = propertySchema?.required?.includes(prop.id);

              return (
                <div
                  key={prop.id}
                  className={`p-3 rounded-md border transition-all ${
                    isAdded
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {prop.label}
                        </h4>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {prop.type}
                        </span>
                        {prop.isCommon && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            Common
                          </span>
                        )}
                      </div>
                      {prop.description && (
                        <p className="text-xs text-gray-600 mt-1">{prop.description}</p>
                      )}
                      {prop.units && (
                        <p className="text-xs text-gray-500 mt-1">
                          Units: {prop.units.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdded && (
                        <button
                          onClick={() => toggleRequired(prop.id)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            isRequired
                              ? 'bg-orange-500 text-white hover:bg-orange-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={isRequired ? 'Required' : 'Optional'}
                        >
                          {isRequired ? 'Required' : 'Optional'}
                        </button>
                      )}
                      <button
                        onClick={() => (isAdded ? removeProperty(prop.id) : addProperty(prop))}
                        className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                          isAdded
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {isAdded ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Added Properties Summary */}
      {addedPropertiesCount > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Added Properties</h4>
          <div className="flex flex-wrap gap-1">
            {Object.keys(propertySchema?.properties || {}).map((propId) => {
              const prop = PROPERTY_LIBRARY.find((p) => p.id === propId);
              const isRequired = propertySchema?.required?.includes(propId);
              return (
                <span
                  key={propId}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {prop?.label || propId}
                  {isRequired && <span className="text-orange-600">*</span>}
                  <button
                    onClick={() => removeProperty(propId)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer - Add Custom Property */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <button
          onClick={() => setShowCustomPropertyDialog(true)}
          className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
        >
          + Add Custom Property
        </button>
      </div>

      {/* Custom Property Dialog */}
      {showCustomPropertyDialog && (
        <CustomPropertyDialog
          onClose={() => setShowCustomPropertyDialog(false)}
          onAdd={(property) => {
            const newProperties = {
              ...(propertySchema?.properties || {}),
              [property.id]: property.definition,
            };
            setPropertySchema({
              required: propertySchema?.required || [],
              properties: newProperties,
            });
            setShowCustomPropertyDialog(false);
          }}
          existingIds={Object.keys(propertySchema?.properties || {})}
        />
      )}
    </div>
  );
};

// ============================================================================
// Custom Property Dialog
// ============================================================================

interface CustomPropertyDialogProps {
  onClose: () => void;
  onAdd: (property: { id: string; definition: PropertyFieldDefinition }) => void;
  existingIds: string[];
}

const CustomPropertyDialog: React.FC<CustomPropertyDialogProps> = ({ onClose, onAdd, existingIds }) => {
  const [propertyId, setPropertyId] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'string' | 'number' | 'boolean' | 'select' | 'multi-select'>('string');
  const [description, setDescription] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [options, setOptions] = useState<string[]>(['']);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [error, setError] = useState('');

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    // Validation
    if (!propertyId.trim()) {
      setError('Property ID is required');
      return;
    }
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (existingIds.includes(propertyId)) {
      setError('Property ID already exists');
      return;
    }
    if ((type === 'select' || type === 'multi-select') && options.filter(o => o.trim()).length === 0) {
      setError('At least one option is required for select type');
      return;
    }

    // Build property definition
    const definition: PropertyFieldDefinition = {
      type,
      label: label.trim(),
      description: description.trim() || undefined,
      defaultValue: defaultValue.trim() || undefined,
    };

    // Add type-specific fields
    if (type === 'select' || type === 'multi-select') {
      definition.options = options
        .filter(o => o.trim())
        .map(o => ({ value: o.trim(), label: o.trim() }));
    }

    if (type === 'number') {
      if (min.trim()) definition.min = parseFloat(min);
      if (max.trim()) definition.max = parseFloat(max);
    }

    onAdd({ id: propertyId.trim(), definition });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add Custom Property</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Property ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                setError('');
              }}
              placeholder="e.g., custom_field_1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, underscores only)</p>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setError('');
              }}
              placeholder="e.g., Custom Field 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Display name shown in UI</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Yes/No</option>
              <option value="select">Select (dropdown)</option>
              <option value="multi-select">Multi-Select</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this property..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Default Value */}
          {type !== 'boolean' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Value (optional)
              </label>
              <input
                type={type === 'number' ? 'number' : 'text'}
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder={type === 'number' ? '0' : 'Enter default value...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Number-specific fields */}
          {type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Value (optional)
                </label>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  placeholder="Minimum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Value (optional)
                </label>
                <input
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder="Maximum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Select options */}
          {(type === 'select' || type === 'multi-select') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      disabled={options.length === 1}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddOption}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Option
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Property
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyConfigPanel;
