import 'server-only';
import { gql } from 'graphql-request';
import { createCachedGraphQLQuery } from '../server-cached-client';
import type {
  BoardDetails,
  Layout,
  ProductSize,
  HoldSet,
  LedPlacements,
  BoardSelectorOptions,
} from '@boardsesh/shared-schema';

/**
 * Cache duration for board configuration data.
 * Since this data is static (board configurations don't change),
 * we cache for 30 days.
 */
const CACHE_DURATION = 30 * 24 * 60 * 60; // 30 days

// GraphQL Queries
const LAYOUTS_QUERY = gql`
  query Layouts($boardName: String!) {
    layouts(boardName: $boardName) {
      id
      name
      productId
    }
  }
`;

const SIZES_FOR_LAYOUT_QUERY = gql`
  query SizesForLayout($boardName: String!, $layoutId: Int!) {
    sizesForLayout(boardName: $boardName, layoutId: $layoutId) {
      id
      name
      description
      edgeLeft
      edgeRight
      edgeBottom
      edgeTop
      productId
    }
  }
`;

const SETS_FOR_LAYOUT_AND_SIZE_QUERY = gql`
  query SetsForLayoutAndSize($boardName: String!, $layoutId: Int!, $sizeId: Int!) {
    setsForLayoutAndSize(boardName: $boardName, layoutId: $layoutId, sizeId: $sizeId) {
      id
      name
    }
  }
`;

const BOARD_DETAILS_QUERY = gql`
  query BoardDetails($boardName: String!, $layoutId: Int!, $sizeId: Int!, $setIds: [Int!]!) {
    boardDetails(boardName: $boardName, layoutId: $layoutId, sizeId: $sizeId, setIds: $setIds) {
      boardName
      layoutId
      sizeId
      setIds
      edgeLeft
      edgeRight
      edgeBottom
      edgeTop
      boardWidth
      boardHeight
      supportsMirroring
      layoutName
      sizeName
      sizeDescription
      setNames
      imagesToHolds
      holdsData
    }
  }
`;

const LED_PLACEMENTS_QUERY = gql`
  query LedPlacements($boardName: String!, $layoutId: Int!, $sizeId: Int!) {
    ledPlacements(boardName: $boardName, layoutId: $layoutId, sizeId: $sizeId) {
      placements
    }
  }
`;

const BOARD_SELECTOR_OPTIONS_QUERY = gql`
  query BoardSelectorOptions {
    boardSelectorOptions {
      kilter {
        id
        name
        sizes {
          id
          name
          description
          sets {
            id
            name
          }
        }
      }
      tension {
        id
        name
        sizes {
          id
          name
          description
          sets {
            id
            name
          }
        }
      }
    }
  }
`;

// Response types
interface LayoutsResponse {
  layouts: Layout[];
}

interface SizesForLayoutResponse {
  sizesForLayout: ProductSize[];
}

interface SetsForLayoutAndSizeResponse {
  setsForLayoutAndSize: HoldSet[];
}

interface BoardDetailsResponse {
  boardDetails: BoardDetails | null;
}

interface LedPlacementsResponse {
  ledPlacements: LedPlacements | null;
}

interface BoardSelectorOptionsResponse {
  boardSelectorOptions: BoardSelectorOptions;
}

/**
 * Get all layouts for a board type.
 * Cached for 30 days since layouts don't change.
 */
export const getLayouts = async (boardName: string): Promise<Layout[]> => {
  const query = createCachedGraphQLQuery<LayoutsResponse, { boardName: string }>(
    LAYOUTS_QUERY,
    `layouts-${boardName}`,
    CACHE_DURATION
  );
  const result = await query({ boardName });
  return result.layouts;
};

/**
 * Get all sizes for a layout.
 * Cached for 30 days since sizes don't change.
 */
export const getSizesForLayout = async (
  boardName: string,
  layoutId: number
): Promise<ProductSize[]> => {
  const query = createCachedGraphQLQuery<SizesForLayoutResponse, { boardName: string; layoutId: number }>(
    SIZES_FOR_LAYOUT_QUERY,
    `sizes-${boardName}-${layoutId}`,
    CACHE_DURATION
  );
  const result = await query({ boardName, layoutId });
  return result.sizesForLayout;
};

/**
 * Get all sets for a layout and size combination.
 * Cached for 30 days since sets don't change.
 */
export const getSetsForLayoutAndSize = async (
  boardName: string,
  layoutId: number,
  sizeId: number
): Promise<HoldSet[]> => {
  const query = createCachedGraphQLQuery<SetsForLayoutAndSizeResponse, { boardName: string; layoutId: number; sizeId: number }>(
    SETS_FOR_LAYOUT_AND_SIZE_QUERY,
    `sets-${boardName}-${layoutId}-${sizeId}`,
    CACHE_DURATION
  );
  const result = await query({ boardName, layoutId, sizeId });
  return result.setsForLayoutAndSize;
};

/**
 * Get complete board details for rendering.
 * Cached for 30 days since board configuration doesn't change.
 */
export const getBoardDetailsFromAPI = async (
  boardName: string,
  layoutId: number,
  sizeId: number,
  setIds: number[]
): Promise<BoardDetails | null> => {
  const query = createCachedGraphQLQuery<BoardDetailsResponse, { boardName: string; layoutId: number; sizeId: number; setIds: number[] }>(
    BOARD_DETAILS_QUERY,
    `board-details-${boardName}-${layoutId}-${sizeId}-${setIds.join(',')}`,
    CACHE_DURATION
  );
  const result = await query({ boardName, layoutId, sizeId, setIds });
  return result.boardDetails;
};

/**
 * Get LED placements for Bluetooth board control.
 * Cached for 30 days since LED mappings don't change.
 */
export const getLedPlacementsFromAPI = async (
  boardName: string,
  layoutId: number,
  sizeId: number
): Promise<LedPlacements | null> => {
  const query = createCachedGraphQLQuery<LedPlacementsResponse, { boardName: string; layoutId: number; sizeId: number }>(
    LED_PLACEMENTS_QUERY,
    `led-placements-${boardName}-${layoutId}-${sizeId}`,
    CACHE_DURATION
  );
  const result = await query({ boardName, layoutId, sizeId });
  return result.ledPlacements;
};

/**
 * Get all board selector options for the setup wizard.
 * Cached for 30 days since board configurations don't change.
 */
export const getBoardSelectorOptionsFromAPI = async (): Promise<BoardSelectorOptions> => {
  const query = createCachedGraphQLQuery<BoardSelectorOptionsResponse, Record<string, never>>(
    BOARD_SELECTOR_OPTIONS_QUERY,
    'board-selector-options',
    CACHE_DURATION
  );
  const result = await query();
  return result.boardSelectorOptions;
};
