/**
 * KKS (Kraftwerk-Kennzeichensystem) Type Definitions
 *
 * The KKS coding system is the standard identification system for power plants.
 * Structure: [Unit][System][SystemNo][Equipment][SeqNo]
 * Example: 1LAA10AP001 = Unit 1, Primary Coolant System, Pump #001
 *
 * Level 0: Unit identifier (1 digit/letter)
 * Level 1: System classification (3 letters + 2 digits)
 * Level 2: Equipment identifier (2 letters + 3 digits)
 */

// ============================================================================
// KKS Code Components
// ============================================================================

/**
 * KKS Level 0 - Unit/Plant identifier
 * Single character identifying the power plant unit
 */
export interface KksUnit {
  code: string;           // e.g., "1", "2", "A"
  name: string;           // e.g., "Unit 1"
  description?: string;
}

/**
 * KKS Level 1 - System classification
 * Three letters for system type + two digits for system number
 */
export interface KksSystemCode {
  mainGroup: string;      // First letter (e.g., "L" for steam/water)
  subGroup1: string;      // Second letter (e.g., "A" for main steam)
  subGroup2: string;      // Third letter (e.g., "A" for specific system)
  number: string;         // Two digits (e.g., "10")
}

/**
 * KKS Level 2 - Equipment classification
 * Two letters for equipment type + three digits for sequence
 */
export interface KksEquipmentCode {
  type: string;           // Two letters (e.g., "AP" for pump)
  sequenceNumber: string; // Three digits (e.g., "001")
}

/**
 * Complete KKS code structure
 */
export interface KksCode {
  full: string;           // Complete KKS code (e.g., "1LAA10AP001")
  unit: string;           // Level 0
  system: string;         // Level 1 letters (e.g., "LAA")
  systemNumber: string;   // Level 1 number (e.g., "10")
  equipment: string;      // Level 2 letters (e.g., "AP")
  sequence: string;       // Level 2 number (e.g., "001")
  building?: string;      // Location code (optional)
}

// ============================================================================
// Plant Hierarchy
// ============================================================================

/**
 * Top-level plant definition
 */
export interface Plant {
  kks: string;            // Plant identifier (e.g., "NPP1")
  name: string;           // Plant name (e.g., "Nuclear Power Plant 1")
  description?: string;
  units: Record<string, Unit>;
  buildings: Record<string, Building>;
  createdAt: string;      // ISO timestamp
  modifiedAt: string;     // ISO timestamp
}
 
/**
 * Power plant unit (Level 0)
 */
export interface Unit {
  kks: string;            // Unit identifier (e.g., "1")
  name: string;           // Unit name (e.g., "Unit 1")
  description?: string;
  systems: Record<string, System>;
  buildings: Record<string, Building>;  // Buildings belonging to this unit
}

/**
 * Safety classification for nuclear systems
 */
export type SafetyClass = 'A' | 'B' | 'C' | 'NNS' | 'N/A';

/**
 * Seismic classification for nuclear systems
 */
export type SeismicClass = 'S1' | 'S2' | 'S3' | 'NS' | 'N/A';

/**
 * System type classification
 * NOS = Normal Operation System
 * SS = Safety System
 * A system can be both NOS and SS simultaneously
 */
export type SystemType = 'NOS' | 'SS';

/**
 * Connection to another system
 */
export interface SystemConnection {
  targetSystemKks: string;  // KKS of connected system
  connectionType?: string;  // Type of connection (e.g., "supply", "return", "signal")
  description?: string;     // Description of the connection
}

/**
 * Plant system (Level 1)
 */
export interface System {
  kks: string;            // System KKS (e.g., "LAA10")
  code: KksSystemCode;    // Parsed system code
  name: string;           // System name (e.g., "Primary Coolant System")
  description?: string;
  unitKks?: string;       // Parent unit KKS
  color?: string;         // Display color for this system
  diagrams: string[];     // List of diagram KKS codes in this system
  safetyClass?: SafetyClass;     // Safety classification
  seismicClass?: SeismicClass;   // Seismic classification
  systemTypes?: SystemType[];    // System type classification (NOS/SS)
  connectedSystems?: SystemConnection[];  // Connections to other systems
}

/**
 * Building/Location (for location codes)
 */
export interface Building {
  kks: string;            // Building/location code
  name: string;           // Building name (e.g., "Reactor Building")
  abbreviation?: string;  // Short name (e.g., "RB")
  floors: Floor[];
}

/**
 * Building floor
 */
export interface Floor {
  id: string;
  name: string;           // e.g., "Level 0", "Basement"
  elevation?: number;     // Elevation in meters
}

// ============================================================================
// KKS Main Groups (First Letter Classification)
// ============================================================================

/**
 * Standard KKS main groups according to VGB standard
 */
export const KKS_MAIN_GROUPS: Record<string, string> = {
  'A': 'General Auxiliary Systems',
  'B': 'Conventional Power Generation',
  'C': 'Instrumentation and Control',
  'D': 'Service Systems',
  'E': 'Electrical Power Systems',
  'G': 'Water Treatment',
  'H': 'Heat Distribution',
  'J': 'Nuclear Reactor',
  'K': 'Reactor Auxiliary Systems',
  'L': 'Steam/Water/Gas Cycle',
  'M': 'Main Machine Sets',
  'N': 'Nuclear Specific Systems',
  'P': 'Cooling Water Systems',
  'Q': 'Auxiliary Systems',
  'R': 'Gas Systems',
  'S': 'Waste Treatment',
  'T': 'Radioactive Waste',
  'U': 'Buildings and Structures',
  'V': 'Communication Systems',
  'W': 'Workshops',
  'X': 'Special Systems',
  'Y': 'Control Rooms',
  'Z': 'Reserved',
};

/**
 * KKS Sector No. 4 - Equipment Classification Codes
 * Based on standard KKS equipment identification system
 */
export const KKS_EQUIPMENT_TYPES: Record<string, string> = {
  // ========================================
  // A - AGGREGATES
  // ========================================
  'AA': 'Fittings & Breaking Devices',
  'AB': 'Gateways, Hatches & Doors',
  'AC': 'Heat Exchangers & Heating Surfaces',
  'AG': 'Generator Sets',
  'AH': 'Heaters, Coolers & Air Conditioners',
  'AM': 'Mixers & Stirrers',
  'AN': 'Compressors & Fans',
  'AP': 'Pumping Units',
  'AT': 'Cleaning, Drying, Filtering & Separating Devices',

  // ========================================
  // B - DEVICES
  // ========================================
  'BB': 'Storage Devices (Vessels & Containers)',
  'BN': 'Jet Pumps, Ejectors & Injectors',
  'BP': 'Flow Restrictors, Limiters & Throttle Washers',
  'BQ': 'Supports, Brackets & Pipeline Penetrations',
  'BR': 'Pipelines, Channels & Trays',
  'BS': 'Silencers',

  // ========================================
  // C - SENSORS (Direct Measuring Circuits)
  // ========================================
  'CE': 'Electrical Quantities Sensors',
  'CF': 'Flow & Mass Flow Sensors',
  'CJ': 'Power Sensors (Mechanical & Thermal)',
  'CL': 'Level Sensors & Media Separation',
  'CM': 'Humidity Sensors',
  'CP': 'Pressure Sensors',
  'CQ': 'Quality & Substance Analysis Sensors',
  'CS': 'Speed, Revolutions & Acceleration Sensors',
  'CT': 'Temperature Sensors',
};

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result of KKS code parsing
 */
export interface KksParseResult {
  valid: boolean;
  code?: KksCode;
  errors?: string[];
}

/**
 * KKS code generation options
 */
export interface KksGenerationOptions {
  unitKks: string;
  systemKks: string;
  equipmentType: string;
  buildingKks?: string;
}

/**
 * Search filter by KKS hierarchy
 */
export interface KksFilter {
  plantKks?: string;
  unitKks?: string;
  systemKks?: string;
  buildingKks?: string;
  equipmentType?: string;
}
