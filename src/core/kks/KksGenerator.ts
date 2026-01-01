/**
 * KKS Code Generator
 *
 * Generates and validates KKS (Kraftwerk-Kennzeichensystem) codes
 * for power plant components.
 *
 * KKS Structure:
 * [Unit][System][SystemNo][Equipment][SeqNo]
 * Example: 1LAA10AP001
 * - 1: Unit 1
 * - LAA: Primary Coolant System
 * - 10: System number
 * - AP: Pump
 * - 001: Sequence number
 */

import {
  KksCode,
  KksParseResult,
  KksGenerationOptions,
  KKS_EQUIPMENT_TYPES,
  KKS_MAIN_GROUPS,
} from '../../types/kks.types';

// ============================================================================
// KKS Pattern Regex
// ============================================================================

/**
 * Full KKS code pattern
 * Group 1: Unit (1 char)
 * Group 2: System letters (3 chars)
 * Group 3: System number (2 digits)
 * Group 4: Equipment letters (2 chars)
 * Group 5: Sequence number (3 digits)
 */
const KKS_PATTERN = /^([0-9A-Z])([A-Z]{3})(\d{2})([A-Z]{2})(\d{3})$/;

/**
 * System code pattern (Level 1)
 */
const SYSTEM_PATTERN = /^([A-Z]{3})(\d{2})$/;

/**
 * Equipment code pattern (Level 2)
 */
const EQUIPMENT_PATTERN = /^([A-Z]{2})(\d{3})$/;

// ============================================================================
// KKS Generator Class
// ============================================================================

export class KksGenerator {
  private usedCodes: Set<string> = new Set();

  /**
   * Register an existing KKS code
   */
  registerCode(code: string): void {
    this.usedCodes.add(code.toUpperCase());
  }

  /**
   * Unregister a KKS code (e.g., when component is deleted)
   */
  unregisterCode(code: string): void {
    this.usedCodes.delete(code.toUpperCase());
  }

  /**
   * Clear all registered codes
   */
  clearCodes(): void {
    this.usedCodes.clear();
  }

  /**
   * Check if a KKS code is already in use
   */
  isCodeInUse(code: string): boolean {
    return this.usedCodes.has(code.toUpperCase());
  }

  /**
   * Generate a new KKS code
   */
  generate(options: KksGenerationOptions): string {
    const { unitKks, systemKks, equipmentType, buildingKks } = options;

    // Find next available sequence number
    let sequenceNumber = 1;
    let code: string;

    do {
      const seqStr = sequenceNumber.toString().padStart(3, '0');
      code = `${unitKks}${systemKks}${equipmentType}${seqStr}`;
      sequenceNumber++;

      // Safety limit
      if (sequenceNumber > 999) {
        throw new Error('No available sequence numbers for this equipment type');
      }
    } while (this.isCodeInUse(code));

    // Register the new code
    this.registerCode(code);

    return code;
  }

  /**
   * Generate the next available sequence number for a given prefix
   */
  getNextSequence(unitKks: string, systemKks: string, equipmentType: string): number {
    const prefix = `${unitKks}${systemKks}${equipmentType}`;
    let maxSeq = 0;

    for (const code of this.usedCodes) {
      if (code.startsWith(prefix)) {
        const seqStr = code.slice(-3);
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    return maxSeq + 1;
  }

  /**
   * Suggest KKS codes based on partial input
   */
  suggest(partial: string, limit = 5): string[] {
    const suggestions: string[] = [];
    const upperPartial = partial.toUpperCase();

    // Get used codes that match the prefix
    for (const code of this.usedCodes) {
      if (code.startsWith(upperPartial)) {
        suggestions.push(code);
        if (suggestions.length >= limit) break;
      }
    }

    return suggestions;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Parse a KKS code string into its components
 */
export function parseKksCode(code: string): KksParseResult {
  if (!code || typeof code !== 'string') {
    return { valid: false, errors: ['Invalid input'] };
  }

  const upperCode = code.toUpperCase().trim();
  const match = upperCode.match(KKS_PATTERN);

  if (!match) {
    return {
      valid: false,
      errors: ['Invalid KKS format. Expected: [Unit][System][SysNo][Equip][Seq] (e.g., 1LAA10AP001)'],
    };
  }

  const [, unit, system, systemNumber, equipment, sequence] = match;

  return {
    valid: true,
    code: {
      full: upperCode,
      unit,
      system,
      systemNumber,
      equipment,
      sequence,
    },
  };
}

/**
 * Validate a KKS code
 */
export function validateKksCode(code: string): { valid: boolean; errors: string[] } {
  const result = parseKksCode(code);

  if (!result.valid) {
    return { valid: false, errors: result.errors || [] };
  }

  const errors: string[] = [];
  const { unit, system, equipment } = result.code!;

  // Validate main group
  const mainGroup = system.charAt(0);
  if (!KKS_MAIN_GROUPS[mainGroup]) {
    errors.push(`Unknown main group: ${mainGroup}`);
  }

  // Equipment type validation is optional (custom types allowed)
  if (!KKS_EQUIPMENT_TYPES[equipment]) {
    // Just a warning, not an error
    console.debug(`Non-standard equipment type: ${equipment}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format a KKS code for display (with separators)
 */
export function formatKksCode(code: string | KksCode): string {
  if (typeof code === 'string') {
    const result = parseKksCode(code);
    if (!result.valid) return code;
    code = result.code!;
  }

  return `${code.unit}-${code.system}${code.systemNumber}-${code.equipment}${code.sequence}`;
}

/**
 * Get description for a KKS code
 */
export function getKksDescription(code: string | KksCode): string {
  if (typeof code === 'string') {
    const result = parseKksCode(code);
    if (!result.valid) return 'Invalid KKS code';
    code = result.code!;
  }

  const parts: string[] = [];

  // Unit
  parts.push(`Unit ${code.unit}`);

  // System main group
  const mainGroup = code.system.charAt(0);
  if (KKS_MAIN_GROUPS[mainGroup]) {
    parts.push(KKS_MAIN_GROUPS[mainGroup]);
  }

  // Equipment type
  if (KKS_EQUIPMENT_TYPES[code.equipment]) {
    parts.push(KKS_EQUIPMENT_TYPES[code.equipment]);
  } else {
    parts.push(`Equipment ${code.equipment}`);
  }

  // Sequence
  parts.push(`#${parseInt(code.sequence, 10)}`);

  return parts.join(' - ');
}

/**
 * Extract the system KKS from a full component KKS
 */
export function extractSystemKks(componentKks: string): string | null {
  const result = parseKksCode(componentKks);
  if (!result.valid) return null;
  return `${result.code!.system}${result.code!.systemNumber}`;
}

/**
 * Extract the unit KKS from a full component KKS
 */
export function extractUnitKks(componentKks: string): string | null {
  const result = parseKksCode(componentKks);
  if (!result.valid) return null;
  return result.code!.unit;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const kksGenerator = new KksGenerator();
