import { PgTable } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import {
  // Legacy board-specific tables (for backward compatibility during migration)
  kilterClimbs,
  kilterClimbStats,
  kilterDifficultyGrades,
  kilterProductSizes,
  kilterLayouts,
  kilterUsers,
  kilterCircuits,
  kilterAscents,
  kilterBids,
  kilterClimbStatsHistory,
  tensionClimbs,
  tensionClimbStats,
  tensionDifficultyGrades,
  tensionProductSizes,
  tensionLayouts,
  tensionUsers,
  tensionCircuits,
  tensionAscents,
  tensionBids,
  tensionClimbStatsHistory,
  kilterAttempts,
  tensionAttempts,
  tensionProducts,
  kilterProducts,
  kilterSharedSyncs,
  tensionSharedSyncs,
  kilterUserSyncs,
  tensionUserSyncs,
  kilterClimbHolds,
  tensionClimbHolds,
  kilterBetaLinks,
  tensionBetaLinks,
  kilterWalls,
  tensionWalls,
  kilterTags,
  tensionTags,
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

// Define the base table structure
export type TableSet = {
  climbs: typeof kilterClimbs | typeof tensionClimbs;
  climbStats: typeof kilterClimbStats | typeof tensionClimbStats;
  difficultyGrades: typeof kilterDifficultyGrades | typeof tensionDifficultyGrades;
  productSizes: typeof kilterProductSizes | typeof tensionProductSizes;
  layouts: typeof kilterLayouts | typeof tensionLayouts;
  users: typeof kilterUsers | typeof tensionUsers;
  circuits: typeof kilterCircuits | typeof tensionCircuits;
  ascents: typeof kilterAscents | typeof tensionAscents;
  bids: typeof kilterBids | typeof tensionBids;
  climbStatsHistory: typeof kilterClimbStatsHistory | typeof tensionClimbStatsHistory;
  attempts: typeof kilterAttempts | typeof tensionAttempts;
  products: typeof kilterProducts | typeof tensionProducts;
  userSyncs: typeof kilterUserSyncs | typeof tensionUserSyncs;
  sharedSyncs: typeof kilterSharedSyncs | typeof tensionSharedSyncs;
  climbHolds: typeof kilterClimbHolds | typeof tensionClimbHolds;
  betaLinks: typeof kilterBetaLinks | typeof tensionBetaLinks;
  walls: typeof kilterWalls | typeof tensionWalls;
  tags: typeof kilterTags | typeof tensionTags;
};

// Create a complete mapping of all tables
const BOARD_TABLES: Record<BoardName, TableSet> = {
  kilter: {
    climbs: kilterClimbs,
    climbStats: kilterClimbStats,
    difficultyGrades: kilterDifficultyGrades,
    productSizes: kilterProductSizes,
    layouts: kilterLayouts,
    users: kilterUsers,
    circuits: kilterCircuits,
    ascents: kilterAscents,
    bids: kilterBids,
    climbStatsHistory: kilterClimbStatsHistory,
    attempts: kilterAttempts,
    products: kilterProducts,
    userSyncs: kilterUserSyncs,
    sharedSyncs: kilterSharedSyncs,
    climbHolds: kilterClimbHolds,
    betaLinks: kilterBetaLinks,
    walls: kilterWalls,
    tags: kilterTags,
  },
  tension: {
    climbs: tensionClimbs,
    climbStats: tensionClimbStats,
    difficultyGrades: tensionDifficultyGrades,
    productSizes: tensionProductSizes,
    layouts: tensionLayouts,
    users: tensionUsers,
    circuits: tensionCircuits,
    ascents: tensionAscents,
    bids: tensionBids,
    climbStatsHistory: tensionClimbStatsHistory,
    attempts: tensionAttempts,
    products: tensionProducts,
    userSyncs: tensionUserSyncs,
    sharedSyncs: tensionSharedSyncs,
    climbHolds: tensionClimbHolds,
    betaLinks: tensionBetaLinks,
    walls: tensionWalls,
    tags: tensionTags,
  },
} as const;

/**
 * Get a specific table for a given board
 * @param tableName The name of the table to retrieve
 * @param boardName The board (kilter or tension)
 * @returns The requested table
 */
export function getTable<K extends keyof TableSet>(tableName: K, boardName: BoardName): TableSet[K] {
  return BOARD_TABLES[boardName][tableName];
}

/**
 * Get all tables for a specific board
 * @param boardName The board (kilter or tension)
 * @returns All tables for the specified board
 */
export function getBoardTables(boardName: BoardName): TableSet {
  return BOARD_TABLES[boardName];
}

/**
 * Helper type to get the type of a specific table
 */
export type BoardTable<K extends keyof TableSet> = TableSet[K];

/**
 * Helper type to get the inferred row type of a table
 */
export type InferredRow<K extends keyof TableSet> = TableSet[K] extends PgTable<infer T> ? T : never;

/**
 * Helper function to check if a board name is valid
 * @param boardName The name to check
 * @returns True if the board name is valid
 */
export function isValidBoardName(boardName: string): boardName is BoardName {
  return boardName === 'kilter' || boardName === 'tension';
}

/**
 * Get the table name prefix for a board (e.g., 'kilter_' or 'tension_')
 * @param boardName The board name
 * @returns The table name prefix
 */
export function getBoardPrefix(boardName: BoardName): string {
  return `${boardName}_`;
}

/**
 * Get the fully qualified table name for a given board and table
 * @param boardName The board name
 * @param tableName The base table name
 * @returns The fully qualified table name
 */
export function getFullTableName(boardName: BoardName, tableName: keyof TableSet): string {
  return `${getBoardPrefix(boardName)}${tableName}`;
}

const tableSelectUtils = {
  getTable,
  getBoardTables,
  isValidBoardName,
  getBoardPrefix,
  getFullTableName,
};

export default tableSelectUtils;

// =============================================================================
// Unified Tables (New API)
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
