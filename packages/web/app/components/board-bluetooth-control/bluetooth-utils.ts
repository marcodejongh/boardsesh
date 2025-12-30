/**
 * Shared utilities for Bluetooth board control.
 */

import type { HoldRenderData } from '../board-renderer/types';
import type { BoardName } from '@/app/lib/types';
import { fetchLedPlacements } from '@/app/lib/graphql/operations/board-config.client';

/**
 * Convert frames string to use mirrored hold IDs.
 */
export const convertToMirroredFramesString = (frames: string, holdsData: HoldRenderData[]): string => {
  // Create a map for quick lookup of mirroredHoldId
  const holdIdToMirroredIdMap = new Map<number, number>();
  holdsData.forEach((hold) => {
    if (hold.mirroredHoldId) {
      holdIdToMirroredIdMap.set(hold.id, hold.mirroredHoldId);
    }
  });

  return frames
    .split('p') // Split into hold data entries
    .filter((hold) => hold) // Remove empty entries
    .map((holdData) => {
      const [holdId, stateCode] = holdData.split('r').map((str) => Number(str)); // Split hold data into holdId and stateCode
      const mirroredHoldId = holdIdToMirroredIdMap.get(holdId);

      if (mirroredHoldId === undefined) {
        throw new Error(`Mirrored hold ID is not defined for hold ID ${holdId}.`);
      }

      // Construct the mirrored hold data
      return `p${mirroredHoldId}r${stateCode}`;
    })
    .join(''); // Reassemble into a single string
};

/**
 * Create a cached LED placements fetcher.
 * Returns a function that fetches LED placements with in-memory caching.
 */
export function createLedPlacementsFetcher() {
  let cachedPlacements: Record<number, number> | null = null;
  let cacheKey: string | null = null;

  return async (
    boardName: BoardName,
    layoutId: number,
    sizeId: number
  ): Promise<Record<number, number> | null> => {
    const newCacheKey = `${boardName}-${layoutId}-${sizeId}`;

    // Return cached value if available and matches current board config
    if (cachedPlacements && cacheKey === newCacheKey) {
      return cachedPlacements;
    }

    // Fetch from API
    const placements = await fetchLedPlacements(boardName, layoutId, sizeId);

    if (placements) {
      cachedPlacements = placements;
      cacheKey = newCacheKey;
    }

    return placements;
  };
}
