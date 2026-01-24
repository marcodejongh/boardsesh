import { SUPPORTED_BOARDS } from '@/app/lib/board-data';
import type { BoardName } from '@/app/lib/types';

// Valid board types - use the centralized SUPPORTED_BOARDS constant
export const VALID_BOARD_TYPES = SUPPORTED_BOARDS;
export type ValidBoardType = BoardName;

// Valid hold types matching the database enum
export const VALID_HOLD_TYPES = ['jug', 'sloper', 'pinch', 'crimp', 'pocket'] as const;
export type ValidHoldType = (typeof VALID_HOLD_TYPES)[number];

/**
 * Validates and parses an integer from a string
 * Returns null if invalid
 */
export function parseIntSafe(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Validates board type against known boards
 */
export function isValidBoardType(value: unknown): value is ValidBoardType {
  return typeof value === 'string' && (VALID_BOARD_TYPES as readonly string[]).includes(value);
}

/**
 * Validates hold type against allowed enum values
 */
export function isValidHoldType(value: unknown): value is ValidHoldType {
  return typeof value === 'string' && VALID_HOLD_TYPES.includes(value as ValidHoldType);
}

/**
 * Validates a rating is in range 1-5
 */
export function isValidRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Validates pull direction is in range 0-360
 */
export function isValidPullDirection(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 360;
}
