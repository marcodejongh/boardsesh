import { useMemo } from 'react';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { Climb, BoardDetails } from '@/app/lib/types';
import { getUserBoardDetails, getBoardDetailsForPlaylist } from '@/app/lib/board-config-for-playlist';

interface UseBoardDetailsMapResult {
  boardDetailsMap: Record<string, BoardDetails>;
  defaultBoardDetails: BoardDetails | null;
  unsupportedClimbs: Set<string>;
}

/**
 * Shared hook that builds a boardDetailsMap for multi-board climb rendering.
 * Maps "boardType:layoutId" keys to BoardDetails objects, preferring user's
 * own board details over generic fallbacks.
 *
 * Used by: SetterClimbList, PlaylistDetailContent, SessionDetailContent
 */
export function useBoardDetailsMap(
  climbs: Climb[],
  myBoards: UserBoard[],
  selectedBoard?: UserBoard | null,
  fallbackBoardTypes?: string[],
): UseBoardDetailsMapResult {
  return useMemo(() => {
    const map: Record<string, BoardDetails> = {};
    const unsupported = new Set<string>();

    // Build user boards keyed by "boardType:layoutId"
    const userBoardsByKey = new Map<string, UserBoard>();
    for (const board of myBoards) {
      const key = `${board.boardType}:${board.layoutId}`;
      if (!userBoardsByKey.has(key)) {
        userBoardsByKey.set(key, board);
      }
    }

    // Resolve BoardDetails for each unique boardType:layoutId
    for (const climb of climbs) {
      const bt = climb.boardType;
      const layoutId = climb.layoutId;
      if (!bt || layoutId == null) continue;

      const key = `${bt}:${layoutId}`;
      if (map[key]) continue;

      const userBoard = userBoardsByKey.get(key);
      if (userBoard) {
        const details = getUserBoardDetails(userBoard);
        if (details) {
          map[key] = details;
          continue;
        }
      }

      const genericDetails = getBoardDetailsForPlaylist(bt, layoutId);
      if (genericDetails) {
        map[key] = genericDetails;
      }
    }

    // Mark unsupported climbs (board types the user doesn't have)
    const userBoardTypes = new Set(myBoards.map((b) => b.boardType));
    for (const climb of climbs) {
      if (climb.boardType && !userBoardTypes.has(climb.boardType)) {
        unsupported.add(climb.uuid);
      }
    }

    // Determine default board details
    let defaultDetails: BoardDetails | null = null;
    if (selectedBoard) {
      defaultDetails = getUserBoardDetails(selectedBoard);
    }
    if (!defaultDetails && myBoards.length > 0) {
      defaultDetails = getUserBoardDetails(myBoards[0]);
    }
    if (!defaultDetails) {
      const fallbackBoardType = fallbackBoardTypes?.[0] || climbs[0]?.boardType || 'kilter';
      const fallbackLayoutId = climbs[0]?.layoutId ?? null;
      defaultDetails = getBoardDetailsForPlaylist(fallbackBoardType, fallbackLayoutId);
    }

    return { boardDetailsMap: map, defaultBoardDetails: defaultDetails, unsupportedClimbs: unsupported };
  }, [climbs, myBoards, selectedBoard, fallbackBoardTypes]);
}
