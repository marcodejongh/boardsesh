/**
 * Default board configurations for each layout.
 * Used for rendering thumbnails when the exact size/sets configuration is not known.
 * These represent the most common configurations for each layout.
 */

import { BoardName } from '@/app/lib/types';
import { SetIdList } from '@/app/lib/board-data';

export interface DefaultBoardConfig {
  sizeId: number;
  setIds: SetIdList;
}

/**
 * Default configurations for each layout.
 * Key format: "{boardName}-{layoutId}"
 */
const DEFAULT_CONFIGS: Record<string, DefaultBoardConfig> = {
  // Kilter Original (layout 1) - 12x14 Commercial with Bolt Ons + Screw Ons
  'kilter-1': { sizeId: 7, setIds: [1, 20] },
  // Kilter Homewall (layout 8) - 10x12 Full Ride LED Kit with all sets
  'kilter-8': { sizeId: 25, setIds: [26, 27, 28, 29] },
  // Tension Original (layout 9) - Full Wall with all sets
  'tension-9': { sizeId: 1, setIds: [8, 9, 10, 11] },
  // Tension Board 2 Mirror (layout 10) - 12x12 with Wood + Plastic
  'tension-10': { sizeId: 6, setIds: [12, 13] },
  // Tension Board 2 Spray (layout 11) - 12x12 with Wood + Plastic
  'tension-11': { sizeId: 6, setIds: [12, 13] },
  // MoonBoard 2010 (layout 1) - Original School Holds
  'moonboard-1': { sizeId: 1, setIds: [1] },
  // MoonBoard 2016 (layout 2) - All available sets
  'moonboard-2': { sizeId: 1, setIds: [2, 3, 4] },
  // MoonBoard 2024 (layout 3) - All available sets
  'moonboard-3': { sizeId: 1, setIds: [5, 6, 7, 8, 9, 10] },
  // MoonBoard Masters 2017 (layout 4) - All available sets
  'moonboard-4': { sizeId: 1, setIds: [11, 12, 13, 14, 15, 16] },
  // MoonBoard Masters 2019 (layout 5) - All available sets
  'moonboard-5': { sizeId: 1, setIds: [17, 18, 19, 20, 21, 22, 23] },
};

/**
 * Get the default board configuration for a given board type and layout.
 * Returns null if no default configuration is found.
 */
export function getDefaultBoardConfig(
  boardName: BoardName,
  layoutId: number,
): DefaultBoardConfig | null {
  const key = `${boardName}-${layoutId}`;
  return DEFAULT_CONFIGS[key] || null;
}

/**
 * Get the board path for a climb based on the default configuration.
 * Used for constructing URLs to climb view pages.
 */
export function getDefaultClimbViewPath(
  boardName: BoardName,
  layoutId: number,
  angle: number,
  climbUuid: string,
): string | null {
  const config = getDefaultBoardConfig(boardName, layoutId);
  if (!config) return null;

  return `/${boardName}/${layoutId}/${config.sizeId}/${config.setIds.join(',')}/${angle}/view/${climbUuid}`;
}
