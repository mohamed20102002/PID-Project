/**
 * References Service
 *
 * Handles loading reference data from external files.
 * Currently supports:
 * - KKS System Abbreviations (from KKSID.xlsx)
 *
 * File structure:
 *   ./data/references/
 *   ├── kks/
 *   │   └── KKSID.xlsx    (KKS abbreviations and system names)
 *   └── ... (future reference data)
 */

export interface KKSEntry {
  kks: string;        // KKS code (e.g., "KBA", "UJA", "JNG1", "JNG2")
  systemName: string; // Full system name
  segments?: string[]; // Valid segment numbers for this system (from column C)
}

export interface KKSReferencesResult {
  success: boolean;
  fileExists: boolean;
  entries: KKSEntry[];
  totalCount: number;
  error?: string;
  expectedPath?: string;
}

class ReferencesServiceClass {
  private kksCache: KKSEntry[] | null = null;
  private kksFileExists: boolean | null = null;
  private lastLoadTime: number | null = null;

  /**
   * Load KKS references from the Excel file
   * Caches results to avoid repeated file reads
   */
  async loadKKSReferences(forceReload = false): Promise<KKSReferencesResult> {
    // Return cached data if available and not forcing reload
    if (!forceReload && this.kksCache !== null && this.kksFileExists !== null) {
      return {
        success: true,
        fileExists: this.kksFileExists,
        entries: this.kksCache,
        totalCount: this.kksCache.length,
      };
    }

    try {
      const response = await fetch('/api/storage/references/kks');
      const result = await response.json();

      if (result.success) {
        this.kksCache = result.entries;
        this.kksFileExists = result.fileExists;
        this.lastLoadTime = Date.now();
        console.log(`[ReferencesService] Loaded ${result.totalCount} KKS entries`);
      } else {
        this.kksFileExists = result.fileExists ?? false;
        this.kksCache = [];
      }

      return result;
    } catch (error) {
      console.error('[ReferencesService] Failed to load KKS references:', error);
      return {
        success: false,
        fileExists: false,
        entries: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Failed to load KKS references',
      };
    }
  }

  /**
   * Search KKS entries by code or system name
   */
  searchKKS(query: string): KKSEntry[] {
    if (!this.kksCache || !query.trim()) {
      return this.kksCache || [];
    }

    const normalizedQuery = query.trim().toUpperCase();

    return this.kksCache.filter((entry) => {
      const kksMatch = entry.kks.toUpperCase().includes(normalizedQuery);
      const nameMatch = entry.systemName.toUpperCase().includes(normalizedQuery);
      return kksMatch || nameMatch;
    });
  }

  /**
   * Get a specific KKS entry by code
   */
  getKKSByCode(code: string): KKSEntry | undefined {
    if (!this.kksCache) return undefined;
    return this.kksCache.find(
      (entry) => entry.kks.toUpperCase() === code.toUpperCase()
    );
  }

  /**
   * Check if KKS file is loaded
   */
  isKKSLoaded(): boolean {
    return this.kksCache !== null;
  }

  /**
   * Check if KKS file exists
   */
  doesKKSFileExist(): boolean {
    return this.kksFileExists === true;
  }

  /**
   * Get all cached KKS entries
   */
  getAllKKS(): KKSEntry[] {
    return this.kksCache || [];
  }

  /**
   * Get last load time
   */
  getLastLoadTime(): number | null {
    return this.lastLoadTime;
  }

  /**
   * Clear cache (force reload on next access)
   */
  clearCache(): void {
    this.kksCache = null;
    this.kksFileExists = null;
    this.lastLoadTime = null;
  }
}

// Export singleton instance
export const ReferencesService = new ReferencesServiceClass();
