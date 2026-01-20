/**
 * Search Engine
 *
 * Provides search functionality for P&ID components and connections.
 * Supports searching by KKS code, type, properties, and text.
 */

import { Component, Connection, Diagram } from '../../types';
import { SafetyClass, System } from '../../types/kks.types';
import { useCustomSymbolStore } from '../../store/customSymbolStore';
import { SymbolRegistry } from '../../data/symbols/SymbolRegistry';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  type: 'component' | 'connection';
  kks: string;                     // For components: KKS code; For connections: KKS (display only)
  id: string;                      // Unique ID (used for selection) - component ID or connection ID
  label: string;
  description: string;
  matchType: SearchMatchType;
  matchField: string;
  matchText: string;
  score: number;
  systemKks?: string;  // System this result belongs to (for cross-system search)
}

export type SearchMatchType = 'exact' | 'prefix' | 'contains' | 'fuzzy';

export interface SearchOptions {
  /** Search in component KKS codes */
  searchKks?: boolean;
  /** Search in component types */
  searchType?: boolean;
  /** Search in component properties */
  searchProperties?: boolean;
  /** Search in connection labels */
  searchConnections?: boolean;
  /** Maximum results to return */
  maxResults?: number;
  /** Minimum score threshold (0-1) */
  minScore?: number;
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Filter by building KKS - if set, only show components in this building */
  buildingFilter?: string;
  /** Filter by safety class - if set, only show components in systems with this safety class */
  safetyClassFilter?: SafetyClass;
  /** Systems lookup for safety class filtering */
  systemsLookup?: Record<string, System>;
}

const DEFAULT_OPTIONS: SearchOptions = {
  searchKks: true,
  searchType: true,
  searchProperties: true,
  searchConnections: true,
  maxResults: 500,  // Increased from 50 to show more results
  minScore: 0.5,  // Increased from 0.1 to filter out weak matches
  caseSensitive: false,
};

// ============================================================================
// Search Engine Class
// ============================================================================

export class SearchEngine {
  private diagram: Diagram | null = null;
  private allDiagrams: Record<string, Diagram> = {};

  /**
   * Set the current diagram to search
   */
  setDiagram(diagram: Diagram | null): void {
    this.diagram = diagram;
  }

  /**
   * Set all diagrams (from cache) for cross-system search
   */
  setAllDiagrams(diagrams: Record<string, Diagram>): void {
    this.allDiagrams = diagrams;
  }

  /**
   * Search for components and connections
   * @param searchAllSystems - if true, searches across all cached diagrams
   */
  search(query: string, options: SearchOptions = {}, searchAllSystems = false): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const normalizedQuery = opts.caseSensitive ? query : query.toLowerCase();
    const results: SearchResult[] = [];

    // Determine which diagrams to search
    const diagramsToSearch: Diagram[] = [];

    if (searchAllSystems) {
      // Search all cached diagrams
      diagramsToSearch.push(...Object.values(this.allDiagrams));
    } else if (this.diagram) {
      // Search only current diagram
      diagramsToSearch.push(this.diagram);
    }

    if (diagramsToSearch.length === 0) {
      return [];
    }

    // Search each diagram
    for (const diagram of diagramsToSearch) {
      // Check safety class filter at diagram/system level
      if (opts.safetyClassFilter && opts.systemsLookup) {
        const system = opts.systemsLookup[diagram.systemKks];
        if (system && system.safetyClass !== opts.safetyClassFilter) {
          continue; // Skip this entire diagram if safety class doesn't match
        }
      }

      // Search components - use entries to get both key and component
      for (const [componentKey, component] of Object.entries(diagram.components)) {
        // Skip "Additional Components" (category: additional) - these have auto-generated KKS
        if (component.type.startsWith('additional:')) {
          continue;
        }
        // Apply building filter if set
        if (opts.buildingFilter && component.buildingKks !== opts.buildingFilter) {
          continue;
        }
        // Pass the dictionary key as the component identifier for lookups
        const componentResults = this.searchComponent(component, normalizedQuery, opts, diagram.systemKks, componentKey);
        results.push(...componentResults);
      }

      // Search connections - use entries to get both key and connection
      if (opts.searchConnections) {
        for (const [connectionKey, connection] of Object.entries(diagram.connections)) {
          // Pass the dictionary key as the connection identifier for lookups
          const connectionResults = this.searchConnection(connection, normalizedQuery, opts, diagram.systemKks, connectionKey);
          results.push(...connectionResults);
        }
      }
    }

    // Sort by score (descending) and limit results
    return results
      .filter((r) => r.score >= (opts.minScore ?? 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxResults);
  }

  /**
   * Search within a component
   * @param componentKey - The dictionary key used to store this component (for lookups)
   */
  private searchComponent(
    component: Component,
    query: string,
    opts: SearchOptions,
    systemKks?: string,
    componentKey?: string
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const normalizeText = (text: string) =>
      opts.caseSensitive ? text : text.toLowerCase();

    // Use the dictionary key as the ID for lookups (works for both old KKS-keyed and new ID-keyed formats)
    const lookupId = componentKey || (component as any).id || component.kks;

    // Search KKS
    if (opts.searchKks) {
      const kksScore = this.matchScore(normalizeText(component.kks), query);
      if (kksScore > 0) {
        const matchType = this.getMatchType(normalizeText(component.kks), query);
        // Heavily boost exact KKS matches to show them first
        let boostedScore = kksScore * 1.5;
        if (matchType === 'exact') {
          boostedScore = kksScore * 10.0; // Show exact matches at the top
        } else if (matchType === 'prefix') {
          boostedScore = kksScore * 3.0; // Prefix matches are also very relevant
        }

        results.push({
          type: 'component',
          kks: component.kks,
          id: lookupId,
          label: component.kks,
          description: this.getComponentDescription(component),
          matchType,
          matchField: 'KKS Code',
          matchText: component.kks,
          score: boostedScore,
          systemKks,
        });
      }
    }

    // Search type - prioritize display name over raw type ID
    if (opts.searchType) {
      // Get symbol to search by display name (more reliable than raw type ID which may have old names)
      const symbol = useCustomSymbolStore.getState().getSymbol(component.type) ||
                     SymbolRegistry.getSymbol(component.type);

      let displayNameScore = 0;
      let symbolDisplayName = '';

      if (symbol) {
        symbolDisplayName = symbol.displayName;
        displayNameScore = this.matchScore(normalizeText(symbolDisplayName), query);
      }

      // Only search by raw type ID if:
      // 1. No symbol found (orphaned component), AND
      // 2. Type has proper format (contains ':') - avoids matching old IDs like "pump-flowsensor-123"
      let typeScore = 0;
      if (!symbol && component.type.includes(':')) {
        typeScore = this.matchScore(normalizeText(component.type), query);
      }

      // Use display name score if symbol found, otherwise use type score
      const bestScore = symbol ? displayNameScore : typeScore;
      if (bestScore > 0) {
        results.push({
          type: 'component',
          kks: component.kks,
          id: lookupId,
          label: component.kks,
          description: this.getComponentDescription(component),
          matchType: this.getMatchType(
            symbolDisplayName ? normalizeText(symbolDisplayName) : normalizeText(component.type),
            query
          ),
          matchField: 'Type',
          matchText: symbolDisplayName || component.type,
          score: bestScore,
          systemKks,
        });
      }
    }

    // Search properties
    if (opts.searchProperties) {
      const propResults = this.searchProperties(component, query, opts, systemKks, componentKey);
      results.push(...propResults);
    }

    return results;
  }

  /**
   * Search within component properties
   * @param componentKey - The dictionary key used to store this component (for lookups)
   */
  private searchProperties(
    component: Component,
    query: string,
    opts: SearchOptions,
    systemKks?: string,
    componentKey?: string
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const normalizeText = (text: string) =>
      opts.caseSensitive ? text : text.toLowerCase();
    const props = component.properties;

    // Use the dictionary key as the ID for lookups
    const lookupId = componentKey || (component as any).id || component.kks;

    // Search tag number
    if (props.tagNumber) {
      const score = this.matchScore(normalizeText(props.tagNumber), query);
      if (score > 0) {
        results.push({
          type: 'component',
          kks: component.kks,
          id: lookupId,
          label: component.kks,
          description: this.getComponentDescription(component),
          matchType: this.getMatchType(normalizeText(props.tagNumber), query),
          matchField: 'Tag Number',
          matchText: props.tagNumber,
          score: score * 1.2, // Boost tag matches
          systemKks,
        });
      }
    }

    // Search description
    if (props.description) {
      const score = this.matchScore(normalizeText(props.description), query);
      if (score > 0) {
        results.push({
          type: 'component',
          kks: component.kks,
          id: lookupId,
          label: component.kks,
          description: this.getComponentDescription(component),
          matchType: this.getMatchType(normalizeText(props.description), query),
          matchField: 'Description',
          matchText: props.description,
          score,
          systemKks,
        });
      }
    }

    // Search manufacturer
    if (props.manufacturer) {
      const score = this.matchScore(normalizeText(props.manufacturer), query);
      if (score > 0) {
        results.push({
          type: 'component',
          kks: component.kks,
          id: lookupId,
          label: component.kks,
          description: this.getComponentDescription(component),
          matchType: this.getMatchType(normalizeText(props.manufacturer), query),
          matchField: 'Manufacturer',
          matchText: props.manufacturer,
          score: score * 0.8, // Lower weight
          systemKks,
        });
      }
    }

    // Search custom properties
    for (const [key, value] of Object.entries(props.custom)) {
      if (typeof value.value === 'string') {
        const score = this.matchScore(normalizeText(value.value), query);
        if (score > 0) {
          results.push({
            type: 'component',
            kks: component.kks,
            id: lookupId,
            label: component.kks,
            description: this.getComponentDescription(component),
            matchType: this.getMatchType(normalizeText(value.value), query),
            matchField: key,
            matchText: value.value,
            score: score * 0.7, // Lower weight for custom props
            systemKks,
          });
        }
      }
    }

    return results;
  }

  /**
   * Search within a connection
   */
  /**
   * @param connectionKey - The dictionary key used to store this connection (for lookups)
   */
  private searchConnection(
    connection: Connection,
    query: string,
    opts: SearchOptions,
    systemKks?: string,
    connectionKey?: string
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const normalizeText = (text: string) =>
      opts.caseSensitive ? text : text.toLowerCase();

    // Use the dictionary key as the ID for lookups (works for both old KKS-keyed and new ID-keyed formats)
    const lookupId = connectionKey || connection.id || connection.kks;

    // Search KKS
    const kksScore = this.matchScore(normalizeText(connection.kks), query);
    if (kksScore > 0) {
      const matchType = this.getMatchType(normalizeText(connection.kks), query);
      // Heavily boost exact KKS matches to show them first
      let boostedScore = kksScore * 1.5;
      if (matchType === 'exact') {
        boostedScore = kksScore * 10.0; // Show exact matches at the top
      } else if (matchType === 'prefix') {
        boostedScore = kksScore * 3.0; // Prefix matches are also very relevant
      }

      results.push({
        type: 'connection',
        kks: connection.kks,
        id: lookupId,
        label: connection.label || connection.kks,
        description: this.getConnectionDescription(connection),
        matchType,
        matchField: 'KKS Code',
        matchText: connection.kks,
        score: boostedScore,
        systemKks,
      });
    }

    // Search label
    if (connection.label) {
      const labelScore = this.matchScore(normalizeText(connection.label), query);
      if (labelScore > 0) {
        results.push({
          type: 'connection',
          kks: connection.kks,
          id: lookupId,
          label: connection.label,
          description: this.getConnectionDescription(connection),
          matchType: this.getMatchType(normalizeText(connection.label), query),
          matchField: 'Label',
          matchText: connection.label,
          score: labelScore * 1.3,
          systemKks,
        });
      }
    }

    // Search line number
    if (connection.properties.lineNumber) {
      const score = this.matchScore(
        normalizeText(connection.properties.lineNumber),
        query
      );
      if (score > 0) {
        results.push({
          type: 'connection',
          kks: connection.kks,
          id: lookupId,
          label: connection.label || connection.kks,
          description: this.getConnectionDescription(connection),
          matchType: this.getMatchType(
            normalizeText(connection.properties.lineNumber),
            query
          ),
          matchField: 'Line Number',
          matchText: connection.properties.lineNumber,
          score: score * 1.2,
          systemKks,
        });
      }
    }

    return results;
  }

  /**
   * Calculate match score between text and query
   */
  private matchScore(text: string, query: string): number {
    if (!text || !query) return 0;

    // Exact match
    if (text === query) return 1.0;

    // Prefix match
    if (text.startsWith(query)) return 0.9;

    // Contains match
    if (text.includes(query)) {
      // Higher score for matches at word boundaries
      const wordBoundary = new RegExp(`\\b${this.escapeRegex(query)}`, 'i');
      if (wordBoundary.test(text)) return 0.8;
      return 0.6;
    }

    // No fuzzy matching - only show exact, prefix, or contains matches
    return 0;
  }

  /**
   * Get match type based on how the query matches
   */
  private getMatchType(text: string, query: string): SearchMatchType {
    if (text === query) return 'exact';
    if (text.startsWith(query)) return 'prefix';
    if (text.includes(query)) return 'contains';
    return 'fuzzy';
  }

  /**
   * Calculate similarity between two strings (Dice coefficient)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length < 2 || str2.length < 2) return 0;

    const bigrams1 = this.getBigrams(str1);
    const bigrams2 = this.getBigrams(str2);

    let intersection = 0;
    for (const bigram of bigrams1) {
      if (bigrams2.has(bigram)) {
        intersection++;
      }
    }

    return (2 * intersection) / (bigrams1.size + bigrams2.size);
  }

  /**
   * Get bigrams (2-character substrings) from a string
   */
  private getBigrams(str: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get component description for display
   */
  private getComponentDescription(component: Component): string {
    const parts: string[] = [];

    // Get the symbol to show display name instead of raw type
    const symbol = useCustomSymbolStore.getState().getSymbol(component.type) ||
                   SymbolRegistry.getSymbol(component.type);

    if (symbol) {
      // Use symbol display name (e.g., "Shut-Off Valve")
      parts.push(symbol.displayName);
    } else {
      // Fallback: format the type (try to split on ':')
      const [category, type] = component.type.split(':');
      if (type) {
        parts.push(`${type.charAt(0).toUpperCase()}${type.slice(1)} ${category}`);
      } else {
        // If no ':' separator, just show the raw type
        parts.push(component.type);
      }
    }

    // Tag number if available
    if (component.properties.tagNumber) {
      parts.push(`(${component.properties.tagNumber})`);
    }

    return parts.join(' ');
  }

  /**
   * Get connection description for display
   */
  private getConnectionDescription(connection: Connection): string {
    const parts: string[] = [];

    // Type
    parts.push(`${connection.type.charAt(0).toUpperCase()}${connection.type.slice(1)}`);

    // Line number
    if (connection.properties.lineNumber) {
      parts.push(`Line: ${connection.properties.lineNumber}`);
    }

    // Size
    if (connection.properties.nominalSize) {
      parts.push(connection.properties.nominalSize);
    }

    return parts.join(' | ');
  }

  /**
   * Get quick search suggestions
   */
  getSuggestions(query: string, limit = 5): string[] {
    if (!this.diagram || query.length < 2) return [];

    const suggestions = new Set<string>();

    // Collect unique KKS codes (excluding additional components)
    for (const component of Object.values(this.diagram.components)) {
      // Skip "Additional Components" (category: additional)
      if (component.type.startsWith('additional:')) {
        continue;
      }
      if (component.kks.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(component.kks);
      }
    }

    // Collect unique tag numbers (excluding additional components)
    for (const component of Object.values(this.diagram.components)) {
      // Skip "Additional Components" (category: additional)
      if (component.type.startsWith('additional:')) {
        continue;
      }
      if (
        component.properties.tagNumber &&
        component.properties.tagNumber.toLowerCase().includes(query.toLowerCase())
      ) {
        suggestions.add(component.properties.tagNumber);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }
}

// Singleton instance
export const searchEngine = new SearchEngine();
