/**
 * Symbol Registry
 *
 * Central registry for all P&ID symbol definitions.
 * Provides lookup, filtering, and management of symbols.
 */

import { SymbolDefinition, SymbolCategory } from '../../types/symbol.types';
import { valveSymbols } from './valves';
import { pumpSymbols } from './pumps';
import { vesselSymbols } from './vessels';
import { instrumentSymbols } from './instruments';
import { pipingSymbols } from './piping';
import { terminalSymbols } from './terminals';

/**
 * Symbol Registry class for managing all P&ID symbols
 */
class SymbolRegistryClass {
  private symbols: Map<string, SymbolDefinition> = new Map();
  private categorizedSymbols: Map<SymbolCategory, SymbolDefinition[]> = new Map();
  private customSymbols: Map<string, SymbolDefinition> = new Map();

  constructor() {
    this.initializeSymbols();
  }

  /**
   * Initialize the registry with all built-in symbols
   */
  private initializeSymbols(): void {
    // Register valve symbols
    Object.values(valveSymbols).forEach((symbol) => {
      this.registerSymbol(symbol);
    });

    // Register pump symbols
    Object.values(pumpSymbols).forEach((symbol) => {
      this.registerSymbol(symbol);
    });

    // Register vessel symbols
    Object.values(vesselSymbols).forEach((symbol) => {
      this.registerSymbol(symbol);
    });

    // Register instrument symbols
    Object.values(instrumentSymbols).forEach((symbol) => {
      this.registerSymbol(symbol);
    });

    // Register piping symbols
    Object.values(pipingSymbols).forEach((symbol) => {
      this.registerSymbol(symbol);
    });

    // Register terminal symbols (cross-system connectors)
    Object.values(terminalSymbols).forEach((symbol) => {
      this.registerSymbol(symbol);
    });
  }

  /**
   * Register a symbol in the registry
   */
  private registerSymbol(symbol: SymbolDefinition): void {
    this.symbols.set(symbol.id, symbol);

    // Add to categorized map
    const category = symbol.category;
    if (!this.categorizedSymbols.has(category)) {
      this.categorizedSymbols.set(category, []);
    }
    this.categorizedSymbols.get(category)!.push(symbol);
  }

  /**
   * Get a symbol by its ID
   */
  getSymbol(id: string): SymbolDefinition | undefined {
    return this.symbols.get(id) || this.customSymbols.get(id);
  }

  /**
   * Get all symbols
   */
  getAllSymbols(): SymbolDefinition[] {
    return [
      ...Array.from(this.symbols.values()),
      ...Array.from(this.customSymbols.values()),
    ];
  }

  /**
   * Get symbols by category
   */
  getSymbolsByCategory(category: SymbolCategory): SymbolDefinition[] {
    const builtIn = this.categorizedSymbols.get(category) || [];
    const custom = Array.from(this.customSymbols.values()).filter(
      (s) => s.category === category
    );
    return [...builtIn, ...custom];
  }

  /**
   * Get all available categories
   */
  getCategories(): SymbolCategory[] {
    const categories = new Set<SymbolCategory>();

    this.categorizedSymbols.forEach((_, category) => {
      categories.add(category);
    });

    this.customSymbols.forEach((symbol) => {
      categories.add(symbol.category);
    });

    return Array.from(categories);
  }

  /**
   * Get symbols by KKS equipment code
   */
  getSymbolsByKksCode(kksCode: string): SymbolDefinition[] {
    return this.getAllSymbols().filter(
      (symbol) => symbol.kksEquipmentCode === kksCode
    );
  }

  /**
   * Search symbols by name or description
   */
  searchSymbols(query: string): SymbolDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSymbols().filter(
      (symbol) =>
        symbol.name.toLowerCase().includes(lowerQuery) ||
        symbol.displayName.toLowerCase().includes(lowerQuery) ||
        symbol.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Register a custom symbol
   */
  registerCustomSymbol(symbol: SymbolDefinition): void {
    // Ensure custom symbols have a unique ID prefix
    const customId = symbol.id.startsWith('custom:')
      ? symbol.id
      : `custom:${symbol.id}`;

    const customSymbol = { ...symbol, id: customId };
    this.customSymbols.set(customId, customSymbol);
  }

  /**
   * Remove a custom symbol
   */
  removeCustomSymbol(id: string): boolean {
    return this.customSymbols.delete(id);
  }

  /**
   * Get all custom symbols
   */
  getCustomSymbols(): SymbolDefinition[] {
    return Array.from(this.customSymbols.values());
  }

  /**
   * Check if a symbol exists
   */
  hasSymbol(id: string): boolean {
    return this.symbols.has(id) || this.customSymbols.has(id);
  }

  /**
   * Get symbol count
   */
  getSymbolCount(): number {
    return this.symbols.size + this.customSymbols.size;
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: SymbolCategory): string {
    const displayNames: Record<SymbolCategory, string> = {
      // A - Aggregates
      'AA': 'AA - Fittings & Breaking Devices',
      'AB': 'AB - Gateways, Hatches & Doors',
      'AC': 'AC - Heat Exchangers & Heating Surfaces',
      'AG': 'AG - Generator Sets',
      'AH': 'AH - Heaters, Coolers & Air Conditioners',
      'AM': 'AM - Mixers & Stirrers',
      'AN': 'AN - Compressors & Fans',
      'AP': 'AP - Pumping Units',
      'AT': 'AT - Cleaning, Drying & Separating Devices',
      // B - Devices
      'BB': 'BB - Storage Devices (Vessels & Containers)',
      'BN': 'BN - Jet Pumps, Ejectors & Injectors',
      'BP': 'BP - Flow Restrictors & Throttle Washers',
      'BQ': 'BQ - Supports, Brackets & Penetrations',
      'BR': 'BR - Pipelines, Channels & Trays',
      'BS': 'BS - Silencers',
      // C - Sensors (Direct Measuring Circuits)
      'CE': 'CE - Electrical Quantities',
      'CF': 'CF - Flow & Mass Flow',
      'CJ': 'CJ - Power (Mechanical & Thermal)',
      'CL': 'CL - Level & Media Separation',
      'CM': 'CM - Humidity',
      'CP': 'CP - Pressure',
      'CQ': 'CQ - Quality & Substance Analysis',
      'CS': 'CS - Speed, Revolutions & Acceleration',
      'CT': 'CT - Temperature',
      // Legacy categories
      valves: 'Valves',
      pumps: 'Pumps',
      vessels: 'Vessels & Tanks',
      instruments: 'Instruments',
      terminals: 'System Terminals',
      'heat-exchangers': 'Heat Exchangers',
      piping: 'Piping Components',
      reactors: 'Reactors',
      compressors: 'Compressors',
      electrical: 'Electrical',
      misc: 'Miscellaneous',
    };
    return displayNames[category] || category;
  }

  /**
   * Get category icon (for UI)
   */
  getCategoryIcon(category: SymbolCategory): string {
    const icons: Record<SymbolCategory, string> = {
      // A - Aggregates
      'AA': '⛭',  // Fittings
      'AB': '🚪',  // Gateways
      'AC': '≋',   // Heat Exchangers
      'AG': '⚡',  // Generators
      'AH': '🌡',  // Heaters/Coolers
      'AM': '🔄',  // Mixers
      'AN': '💨',  // Compressors/Fans
      'AP': '⚙',   // Pumps
      'AT': '🔬',  // Separators
      // B - Devices
      'BB': '⬡',   // Vessels
      'BN': '💉',  // Jet Pumps
      'BP': '⊘',   // Restrictors
      'BQ': '⊞',   // Supports
      'BR': '┃',   // Pipelines
      'BS': '🔇',  // Silencers
      // C - Sensors
      'CE': '⚡',  // Electrical
      'CF': '🌊',  // Flow
      'CJ': '⚡',  // Power
      'CL': '📊',  // Level
      'CM': '💧',  // Humidity
      'CP': '◎',   // Pressure
      'CQ': '🔍',  // Quality
      'CS': '⏱',   // Speed
      'CT': '🌡',  // Temperature
      // Legacy categories
      valves: '⛭',
      pumps: '⚙',
      vessels: '⬡',
      instruments: '◉',
      terminals: '⬚',
      'heat-exchangers': '≋',
      piping: '┃',
      reactors: '⬢',
      compressors: '⚙',
      electrical: '⚡',
      misc: '◇',
    };
    return icons[category] || '◇';
  }

  /**
   * Export custom symbols to JSON
   */
  exportCustomSymbols(): string {
    return JSON.stringify(Array.from(this.customSymbols.values()), null, 2);
  }

  /**
   * Import custom symbols from JSON
   */
  importCustomSymbols(json: string): void {
    try {
      const symbols = JSON.parse(json) as SymbolDefinition[];
      symbols.forEach((symbol) => {
        this.registerCustomSymbol(symbol);
      });
    } catch (error) {
      console.error('Failed to import custom symbols:', error);
      throw new Error('Invalid symbol definition JSON');
    }
  }

  /**
   * Clear all custom symbols
   */
  clearCustomSymbols(): void {
    this.customSymbols.clear();
  }
}

// Export singleton instance
export const SymbolRegistry = new SymbolRegistryClass();

// Export the class for testing
export { SymbolRegistryClass };

// Export category order for consistent UI display
// Organized by KKS main categories: A (Aggregates), B (Devices), C (Sensors)
export const CATEGORY_ORDER: SymbolCategory[] = [
  // A - Aggregates
  'AA', 'AB', 'AC', 'AG', 'AH', 'AM', 'AN', 'AP', 'AT',
  // B - Devices
  'BB', 'BN', 'BP', 'BQ', 'BR', 'BS',
  // C - Sensors
  'CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT',
  // Legacy categories (for backward compatibility)
  'valves',
  'pumps',
  'vessels',
  'instruments',
  'terminals',
  'piping',
  'heat-exchangers',
  'reactors',
  'compressors',
  'electrical',
  'misc',
];

// KKS Main Categories structure for hierarchical display
export interface KKSMainCategoryInfo {
  code: string;
  name: string;
  subCategories: SymbolCategory[];
}

export const KKS_HIERARCHY: KKSMainCategoryInfo[] = [
  {
    code: 'A',
    name: 'Aggregates',
    subCategories: ['AA', 'AB', 'AC', 'AG', 'AH', 'AM', 'AN', 'AP', 'AT'],
  },
  {
    code: 'B',
    name: 'Devices',
    subCategories: ['BB', 'BN', 'BP', 'BQ', 'BR', 'BS'],
  },
  {
    code: 'C',
    name: 'Sensors',
    subCategories: ['CE', 'CF', 'CJ', 'CL', 'CM', 'CP', 'CQ', 'CS', 'CT'],
  },
];
