/**
 * KKS Equipment Codes (Sector No. 4)
 *
 * Defines the hierarchical structure of KKS equipment classification codes.
 * Main categories: A (Aggregates), B (Devices), C (Sensors)
 */

export interface KKSSubCategory {
  code: string;
  name: string;
  description: string;
}

export interface KKSMainCategory {
  code: string;
  name: string;
  subCategories: KKSSubCategory[];
}

/**
 * A - Aggregates
 */
export const AGGREGATES: KKSMainCategory = {
  code: 'A',
  name: 'Aggregates',
  subCategories: [
    { code: 'AA', name: 'Fittings & Breaking Devices', description: 'Fittings, breaking devices' },
    { code: 'AB', name: 'Gateways, Hatches & Doors', description: 'Gateways, hatches, doors' },
    { code: 'AC', name: 'Heat Exchangers & Heating Surfaces', description: 'Heat exchangers, heating surfaces' },
    { code: 'AG', name: 'Generator Sets', description: 'Generator sets' },
    { code: 'AH', name: 'Heaters, Coolers & Air Conditioners', description: 'Heaters, coolers, air conditioners' },
    { code: 'AM', name: 'Mixers & Stirrers', description: 'Mixers, stirrers' },
    { code: 'AN', name: 'Compressors & Fans', description: 'Compressors, fans' },
    { code: 'AP', name: 'Pumping Units', description: 'Pumping units' },
    { code: 'AT', name: 'Cleaning, Drying & Separating Devices', description: 'Devices for cleaning, drying, filtering and separating media' },
  ],
};

/**
 * B - Devices
 */
export const DEVICES: KKSMainCategory = {
  code: 'B',
  name: 'Devices',
  subCategories: [
    { code: 'BB', name: 'Storage Devices (Vessels & Containers)', description: 'Storage devices (vessels, containers)' },
    { code: 'BN', name: 'Jet Pumps, Ejectors & Injectors', description: 'Jet pumps, ejectors, injectors' },
    { code: 'BP', name: 'Flow Restrictors & Throttle Washers', description: 'Restriction devices, flow limiters, throttle washers' },
    { code: 'BQ', name: 'Supports, Brackets & Penetrations', description: 'Supports, load-bearing structures, brackets, pipeline penetrations' },
    { code: 'BR', name: 'Pipelines, Channels & Trays', description: 'Pipelines, channels, trays' },
    { code: 'BS', name: 'Silencers', description: 'Silencers' },
  ],
};

/**
 * C - Sensors (Direct measuring circuits)
 */
export const SENSORS: KKSMainCategory = {
  code: 'C',
  name: 'Sensors',
  subCategories: [
    { code: 'CE', name: 'Electrical Quantities', description: 'Electrical quantities measurement' },
    { code: 'CF', name: 'Flow & Mass Flow', description: 'Flow, mass flow measurement' },
    { code: 'CJ', name: 'Power (Mechanical & Thermal)', description: 'Power (mechanical, thermal) measurement' },
    { code: 'CL', name: 'Level & Media Separation', description: 'Level (also media separation line) measurement' },
    { code: 'CM', name: 'Humidity', description: 'Humidity measurement' },
    { code: 'CP', name: 'Pressure', description: 'Pressure measurement' },
    { code: 'CQ', name: 'Quality & Substance Analysis', description: 'Quality indicators (analyses, properties of substances)' },
    { code: 'CS', name: 'Speed, Revolutions & Acceleration', description: 'Speed, revolutions, frequency (mechanical), acceleration' },
    { code: 'CT', name: 'Temperature', description: 'Temperature measurement' },
  ],
};

/**
 * All KKS Main Categories
 */
export const KKS_MAIN_CATEGORIES: KKSMainCategory[] = [
  AGGREGATES,
  DEVICES,
  SENSORS,
];

/**
 * Get all KKS sub-category codes as a flat list
 */
export const getAllKKSCodes = (): string[] => {
  return KKS_MAIN_CATEGORIES.flatMap(main =>
    main.subCategories.map(sub => sub.code)
  );
};

/**
 * Get KKS sub-category by code
 */
export const getKKSSubCategory = (code: string): KKSSubCategory | undefined => {
  for (const main of KKS_MAIN_CATEGORIES) {
    const sub = main.subCategories.find(s => s.code === code);
    if (sub) return sub;
  }
  return undefined;
};

/**
 * Get main category for a sub-category code
 */
export const getMainCategoryForCode = (code: string): KKSMainCategory | undefined => {
  return KKS_MAIN_CATEGORIES.find(main =>
    main.subCategories.some(sub => sub.code === code)
  );
};

/**
 * Get display name for KKS code
 */
export const getKKSDisplayName = (code: string): string => {
  const sub = getKKSSubCategory(code);
  return sub ? `${code} - ${sub.name}` : code;
};

/**
 * Get full description for KKS code
 */
export const getKKSDescription = (code: string): string => {
  const sub = getKKSSubCategory(code);
  return sub ? sub.description : code;
};
