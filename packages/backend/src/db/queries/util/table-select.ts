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
import { eq } from 'drizzle-orm';

export type BoardName = 'kilter' | 'tension';

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

/**
 * Get the table name for raw SQL queries
 * @param boardName The board name
 * @param tableName The base table name (e.g., 'climb_stats')
 * @returns The unified table name (e.g., 'board_climb_stats')
 */
export function getTableName(_boardName: BoardName, tableName: string): string {
  // Convert table name to unified format (e.g., 'climbs' -> 'board_climbs')
  const tableMap: Record<string, string> = {
    climbs: 'board_climbs',
    climb_stats: 'board_climb_stats',
    difficulty_grades: 'board_difficulty_grades',
    product_sizes: 'board_product_sizes',
    layouts: 'board_layouts',
    users: 'board_users',
    circuits: 'board_circuits',
    climb_stats_history: 'board_climb_stats_history',
    attempts: 'board_attempts',
    products: 'board_products',
    user_syncs: 'board_user_syncs',
    shared_syncs: 'board_shared_syncs',
    climb_holds: 'board_climb_holds',
    beta_links: 'board_beta_links',
    walls: 'board_walls',
    tags: 'board_tags',
  };
  return tableMap[tableName] || `board_${tableName}`;
}
