import type { AuroraBoardName } from './api-wrappers/aurora/types';

/**
 * Valid Aurora board names (boards that use Aurora API).
 * Centralized to avoid duplicating ['kilter', 'tension'] across API routes.
 */
export const AURORA_BOARD_NAMES: AuroraBoardName[] = ['kilter', 'tension'];

/**
 * Check if a board name is a valid Aurora board (kilter or tension).
 */
export function isAuroraBoardName(boardName: string): boardName is AuroraBoardName {
  return AURORA_BOARD_NAMES.includes(boardName as AuroraBoardName);
}

/**
 * Kilter Homewall layout ID.
 * Used for layout-specific features like tall climbs filtering.
 */
export const KILTER_HOMEWALL_LAYOUT_ID = 8;

/**
 * Kilter Homewall product ID.
 * Used for product-specific size queries.
 */
export const KILTER_HOMEWALL_PRODUCT_ID = 7;

/**
 * Regex pattern to strip board name prefix from layout names.
 * Used in slug generation and URL utilities.
 * Matches patterns like "Kilter Board ..." or "Tension Board ..."
 */
export const BOARD_NAME_PREFIX_REGEX = /^(kilter|tension)\s+board\s+/i;
