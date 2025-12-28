// Table selection utility for backend
// Similar to packages/web/app/lib/db/queries/util/table-select.ts
import {
  kilterClimbs,
  kilterClimbStats,
  kilterDifficultyGrades,
  kilterProductSizes,
  kilterLayouts,
  kilterSets,
  kilterProductSizesLayoutsSets,
  kilterHoles,
  kilterPlacements,
  kilterLeds,
  kilterProducts,
  tensionClimbs,
  tensionClimbStats,
  tensionDifficultyGrades,
  tensionProductSizes,
  tensionLayouts,
  tensionSets,
  tensionProductSizesLayoutsSets,
  tensionHoles,
  tensionPlacements,
  tensionLeds,
  tensionProducts,
} from '@boardsesh/db/schema';

export type BoardName = 'kilter' | 'tension';

// Define the table structure
export type TableSet = {
  climbs: typeof kilterClimbs | typeof tensionClimbs;
  climbStats: typeof kilterClimbStats | typeof tensionClimbStats;
  difficultyGrades: typeof kilterDifficultyGrades | typeof tensionDifficultyGrades;
  productSizes: typeof kilterProductSizes | typeof tensionProductSizes;
  layouts: typeof kilterLayouts | typeof tensionLayouts;
  sets: typeof kilterSets | typeof tensionSets;
  productSizesLayoutsSets: typeof kilterProductSizesLayoutsSets | typeof tensionProductSizesLayoutsSets;
  holes: typeof kilterHoles | typeof tensionHoles;
  placements: typeof kilterPlacements | typeof tensionPlacements;
  leds: typeof kilterLeds | typeof tensionLeds;
  products: typeof kilterProducts | typeof tensionProducts;
};

// Create a complete mapping of all tables
const BOARD_TABLES: Record<BoardName, TableSet> = {
  kilter: {
    climbs: kilterClimbs,
    climbStats: kilterClimbStats,
    difficultyGrades: kilterDifficultyGrades,
    productSizes: kilterProductSizes,
    layouts: kilterLayouts,
    sets: kilterSets,
    productSizesLayoutsSets: kilterProductSizesLayoutsSets,
    holes: kilterHoles,
    placements: kilterPlacements,
    leds: kilterLeds,
    products: kilterProducts,
  },
  tension: {
    climbs: tensionClimbs,
    climbStats: tensionClimbStats,
    difficultyGrades: tensionDifficultyGrades,
    productSizes: tensionProductSizes,
    layouts: tensionLayouts,
    sets: tensionSets,
    productSizesLayoutsSets: tensionProductSizesLayoutsSets,
    holes: tensionHoles,
    placements: tensionPlacements,
    leds: tensionLeds,
    products: tensionProducts,
  },
} as const;

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
