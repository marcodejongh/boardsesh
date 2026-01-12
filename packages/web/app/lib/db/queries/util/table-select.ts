import { eq } from 'drizzle-orm';
import {
  // Unified tables
  boardAttempts,
  boardDifficultyGrades,
  boardProducts,
  boardSets,
  boardProductSizes,
  boardLayouts,
  boardHoles,
  boardPlacementRoles,
  boardLeds,
  boardPlacements,
  boardProductSizesLayoutsSets,
  boardClimbs,
  boardClimbStats,
  boardClimbHolds,
  boardClimbStatsHistory,
  boardBetaLinks,
  boardUsers,
  boardCircuits,
  boardCircuitsClimbs,
  boardWalls,
  boardTags,
  boardUserSyncs,
  boardSharedSyncs,
} from '@/lib/db/schema';
import { AuroraBoardName } from '@/app/lib/api-wrappers/aurora/types';

// Re-export AuroraBoardName as BoardName for backward compatibility within this module
export type BoardName = AuroraBoardName;

// =============================================================================
// Unified Tables API
// =============================================================================

/**
 * Unified table set - all queries should filter by board_type
 */
export const UNIFIED_TABLES = {
  attempts: boardAttempts,
  difficultyGrades: boardDifficultyGrades,
  products: boardProducts,
  sets: boardSets,
  productSizes: boardProductSizes,
  layouts: boardLayouts,
  holes: boardHoles,
  placementRoles: boardPlacementRoles,
  leds: boardLeds,
  placements: boardPlacements,
  productSizesLayoutsSets: boardProductSizesLayoutsSets,
  climbs: boardClimbs,
  climbStats: boardClimbStats,
  climbHolds: boardClimbHolds,
  climbStatsHistory: boardClimbStatsHistory,
  betaLinks: boardBetaLinks,
  users: boardUsers,
  circuits: boardCircuits,
  circuitsClimbs: boardCircuitsClimbs,
  walls: boardWalls,
  tags: boardTags,
  userSyncs: boardUserSyncs,
  sharedSyncs: boardSharedSyncs,
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
 * Helper to create board_type equality condition for WHERE clauses
 * @param table A unified table with boardType column
 * @param boardName The board name to filter by
 * @returns A drizzle eq() condition
 */
export function boardTypeCondition(
  table: { boardType: typeof boardClimbs.boardType },
  boardName: BoardName
) {
  return eq(table.boardType, boardName);
}

/**
 * Helper function to check if a board name is valid
 * @param boardName The name to check
 * @returns True if the board name is valid
 */
export function isValidBoardName(boardName: string): boardName is BoardName {
  return boardName === 'kilter' || boardName === 'tension';
}

/**
 * Extended board name type that includes moonboard for unified tables
 */
export type UnifiedBoardName = BoardName | 'moonboard';

/**
 * Check if a board name is valid for unified tables (includes moonboard)
 * @param boardName The name to check
 * @returns True if the board name is valid for unified tables
 */
export function isValidUnifiedBoardName(boardName: string): boardName is UnifiedBoardName {
  return boardName === 'kilter' || boardName === 'tension' || boardName === 'moonboard';
}

const tableSelectUtils = {
  getUnifiedTable,
  boardTypeCondition,
  isValidBoardName,
  isValidUnifiedBoardName,
  UNIFIED_TABLES,
};

export default tableSelectUtils;
