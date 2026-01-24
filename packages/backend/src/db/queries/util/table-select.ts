import {
  boardClimbs,
  boardClimbStats,
  boardDifficultyGrades,
  boardProductSizes,
  boardLayouts,
  boardUsers,
  boardCircuits,
  boardClimbStatsHistory,
  boardAttempts,
  boardProducts,
  boardSharedSyncs,
  boardUserSyncs,
  boardClimbHolds,
  boardBetaLinks,
  boardWalls,
  boardTags,
} from '@boardsesh/db';
import type { BoardName } from '@boardsesh/shared-schema';
import { SUPPORTED_BOARDS } from '@boardsesh/shared-schema';

export type { BoardName };

// Unified tables - all queries should filter by board_type
export const UNIFIED_TABLES = {
  climbs: boardClimbs,
  climbStats: boardClimbStats,
  difficultyGrades: boardDifficultyGrades,
  productSizes: boardProductSizes,
  layouts: boardLayouts,
  users: boardUsers,
  circuits: boardCircuits,
  climbStatsHistory: boardClimbStatsHistory,
  attempts: boardAttempts,
  products: boardProducts,
  userSyncs: boardUserSyncs,
  sharedSyncs: boardSharedSyncs,
  climbHolds: boardClimbHolds,
  betaLinks: boardBetaLinks,
  walls: boardWalls,
  tags: boardTags,
} as const;

export type UnifiedTableSet = typeof UNIFIED_TABLES;

/**
 * Get a unified table (all queries should filter by board_type)
 * @param tableName The name of the unified table to retrieve
 * @returns The unified table
 */
export function getUnifiedTable<K extends keyof UnifiedTableSet>(
  tableName: K
): UnifiedTableSet[K] {
  return UNIFIED_TABLES[tableName];
}

/**
 * Helper function to check if a board name is valid
 * @param boardName The name to check
 * @returns True if the board name is valid
 */
export function isValidBoardName(boardName: string): boardName is BoardName {
  return SUPPORTED_BOARDS.includes(boardName as BoardName);
}

/**
 * Extended board name type that includes moonboard for unified tables
 * @deprecated BoardName now includes moonboard, use BoardName instead
 */
export type UnifiedBoardName = BoardName;

/**
 * Check if a board name is valid for unified tables (includes moonboard)
 * @param boardName The name to check
 * @returns True if the board name is valid for unified tables
 * @deprecated Use isValidBoardName instead - it now includes moonboard
 */
export function isValidUnifiedBoardName(boardName: string): boardName is UnifiedBoardName {
  return isValidBoardName(boardName);
}

// =============================================================================
// Legacy Compatibility Layer
// =============================================================================

/**
 * TableSet type for backward compatibility.
 * All tables are unified tables that require board_type filtering.
 */
export type TableSet = typeof UNIFIED_TABLES;

/**
 * Get all tables (returns unified tables for backward compatibility).
 * IMPORTANT: All queries using these tables MUST filter by board_type.
 *
 * @param boardName The board name (used for documentation, actual filtering must be done in queries)
 * @returns The unified table set
 *
 * @deprecated Use UNIFIED_TABLES directly and add board_type conditions to queries
 */
export function getBoardTables(_boardName: BoardName): TableSet {
  return UNIFIED_TABLES;
}
