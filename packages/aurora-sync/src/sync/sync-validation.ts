/**
 * Validation utilities for Aurora sync data.
 *
 * Aurora API responses are untrusted input - all values must be validated
 * before writing to our database.
 *
 * NOTE: This is a copy of packages/web/app/lib/data-sync/aurora/sync-validation.ts
 * Will be consolidated into a shared package in a follow-up.
 */

// --- Bounds constants ---

export const CLIMB_STATS_BOUNDS = {
  displayDifficulty: { min: 0, max: 50 },
  benchmarkDifficulty: { min: 0, max: 50 },
  ascensionistCount: { min: 0, max: 10_000_000 },
  difficultyAverage: { min: 0, max: 50 },
  qualityAverage: { min: 0, max: 5 },
} as const;

export const STRING_LIMITS = {
  name: 500,
  description: 10_000,
  comment: 5_000,
  username: 255,
  frames: 500_000,
  url: 2_048,
  color: 20,
  serialNumber: 255,
  tableName: 100,
} as const;

export const MAX_RECORDS_PER_TABLE = 10_000;

// Earliest reasonable timestamp for Aurora data (Aurora Climbing founded ~2016)
const MIN_SYNC_YEAR = 2016;

// --- Validation functions ---

/**
 * Validates and clamps a numeric value within bounds.
 * Returns fallback (default null) for NaN, Infinity, or out-of-range values.
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number | null = null,
): number | null {
  if (value == null) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < min || num > max) return fallback;
  return num;
}

/**
 * Validates a sync timestamp string.
 * - Rejects unparseable timestamps
 * - Rejects timestamps before MIN_SYNC_YEAR
 * - Clamps future timestamps to current time + 24h
 * Returns the validated timestamp string, or null if invalid.
 */
export function validateSyncTimestamp(timestamp: string): string | null {
  if (!timestamp || typeof timestamp !== 'string') return null;

  const parsed = Date.parse(timestamp);
  if (isNaN(parsed)) {
    console.warn(`[sync-validation] Rejecting unparseable timestamp: ${timestamp}`);
    return null;
  }

  const date = new Date(parsed);
  const minDate = new Date(MIN_SYNC_YEAR, 0, 1);
  const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // now + 24h

  if (date < minDate) {
    console.warn(`[sync-validation] Rejecting pre-${MIN_SYNC_YEAR} timestamp: ${timestamp}`);
    return null;
  }

  if (date > maxDate) {
    console.warn(`[sync-validation] Clamping future timestamp: ${timestamp} -> now`);
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
  }

  return timestamp;
}

/**
 * Validates that a string is a valid http/https URL within length limits.
 */
export function isValidHttpUrl(urlStr: unknown, maxLength: number = STRING_LIMITS.url): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  if (urlStr.length > maxLength) return false;

  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Truncates a string to maxLength characters. Returns the original string if already within limits.
 */
export function truncate(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  console.warn(`[sync-validation] Truncating string from ${value.length} to ${maxLength} chars`);
  return value.slice(0, maxLength);
}

/**
 * Truncates a string, returning null if the input is null/undefined.
 */
export function truncateOrNull(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  if (value.length <= maxLength) return value;
  console.warn(`[sync-validation] Truncating string from ${value.length} to ${maxLength} chars`);
  return value.slice(0, maxLength);
}

/**
 * Caps an array to MAX_RECORDS_PER_TABLE, logging a warning if truncated.
 */
export function capRecords<T>(records: T[], tableName: string, max: number = MAX_RECORDS_PER_TABLE): T[] {
  if (records.length <= max) return records;
  console.warn(
    `[sync-validation] Capping ${tableName} from ${records.length} to ${max} records`,
  );
  return records.slice(0, max);
}

// Known valid table names for sync tracking
export const VALID_SHARED_SYNC_TABLES = new Set([
  'products',
  'product_sizes',
  'holes',
  'leds',
  'products_angles',
  'layouts',
  'product_sizes_layouts_sets',
  'placements',
  'sets',
  'placement_roles',
  'climbs',
  'climb_stats',
  'beta_links',
  'attempts',
  'kits',
]);

export const VALID_USER_SYNC_TABLES = new Set([
  'users',
  'walls',
  'wall_expungements',
  'draft_climbs',
  'ascents',
  'bids',
  'tags',
  'circuits',
]);
