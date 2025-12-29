import {
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
} from '@boardsesh/db';

export type BoardName = 'kilter' | 'tension';

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
 * Helper function to check if a board name is valid
 * @param boardName The name to check
 * @returns True if the board name is valid
 */
export function isValidBoardName(boardName: string): boardName is BoardName {
  return boardName === 'kilter' || boardName === 'tension';
}

/**
 * Get the table name for a given board and table type
 * @param boardName The board name (kilter, tension)
 * @param tableName The base table name
 * @returns The fully qualified table name
 * @throws Error if board name is invalid
 */
export function getTableName(boardName: BoardName, tableName: string): string {
  // Runtime validation to prevent SQL injection
  if (!isValidBoardName(boardName)) {
    throw new Error(`Invalid board name: ${boardName}. Must be 'kilter' or 'tension'`);
  }
  return `${boardName}_${tableName}`;
}
