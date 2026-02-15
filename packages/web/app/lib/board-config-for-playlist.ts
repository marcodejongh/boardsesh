import { BoardName, BoardDetails } from './types';
import {
  getSizesForLayoutId,
  getSetsForLayoutAndSize,
  getBoardDetails,
  LAYOUTS,
} from './__generated__/product-sizes-data';
import { getMoonBoardDetails, MOONBOARD_LAYOUTS, MOONBOARD_SETS, MoonBoardLayoutKey } from './moonboard-config';

/**
 * Derive BoardDetails for a playlist using the largest available size and all sets.
 * Used when viewing playlists outside of a board session.
 */
export function getBoardDetailsForPlaylist(
  boardType: string,
  layoutId: number | null | undefined,
): BoardDetails | null {
  const boardName = boardType as BoardName;

  if (boardName === 'moonboard') {
    return getMoonBoardDetailsForPlaylist(layoutId);
  }

  const effectiveLayoutId = layoutId ?? getDefaultLayoutForBoard(boardName);
  if (!effectiveLayoutId) return null;

  const sizes = getSizesForLayoutId(boardName, effectiveLayoutId);
  if (sizes.length === 0) return null;

  // Pick the size with the largest area
  const largest = sizes.reduce((best, size) => {
    const area = (size.edgeRight - size.edgeLeft) * (size.edgeTop - size.edgeBottom);
    const bestArea = (best.edgeRight - best.edgeLeft) * (best.edgeTop - best.edgeBottom);
    return area > bestArea ? size : best;
  });

  const sets = getSetsForLayoutAndSize(boardName, effectiveLayoutId, largest.id);
  if (sets.length === 0) return null;

  const setIds = sets.map((s) => s.id);

  try {
    return getBoardDetails({
      board_name: boardName,
      layout_id: effectiveLayoutId,
      size_id: largest.id,
      set_ids: setIds,
    });
  } catch {
    return null;
  }
}

function getMoonBoardDetailsForPlaylist(layoutId: number | null | undefined): BoardDetails | null {
  const effectiveLayoutId = layoutId ?? MOONBOARD_LAYOUTS['moonboard-2024'].id;

  const layoutEntry = Object.entries(MOONBOARD_LAYOUTS).find(
    ([, layout]) => layout.id === effectiveLayoutId,
  );
  if (!layoutEntry) return null;

  const [layoutKey] = layoutEntry;
  const sets = MOONBOARD_SETS[layoutKey as MoonBoardLayoutKey] || [];
  const setIds = sets.map((s) => s.id);

  try {
    return getMoonBoardDetails({
      layout_id: effectiveLayoutId,
      set_ids: setIds,
    });
  } catch {
    return null;
  }
}

/**
 * Get the default layout ID for a board type.
 * Returns the first layout in the LAYOUTS map.
 */
export function getDefaultLayoutForBoard(boardType: string): number | null {
  if (boardType === 'moonboard') {
    return MOONBOARD_LAYOUTS['moonboard-2024'].id;
  }

  const boardLayouts = LAYOUTS[boardType as BoardName];
  if (!boardLayouts) return null;

  const ids = Object.keys(boardLayouts).map(Number);
  return ids.length > 0 ? ids[0] : null;
}

/** Default angle fallback when no angle specified. 40 is the most common training angle. */
const DEFAULT_ANGLE = 40;

/**
 * Get a default angle for a board type.
 * Returns the default training angle for all board types.
 */
export function getDefaultAngleForBoard(_boardType: string): number {
  return DEFAULT_ANGLE;
}
