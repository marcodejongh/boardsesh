import type { BoardDetails, ParsedBoardRouteParameters } from './types';
import type { SetIdList } from './board-data';
import { getBoardDetails } from './__generated__/product-sizes-data';
import { getMoonBoardDetails } from './moonboard-config';

/**
 * Get board details for any board type (Aurora or MoonBoard).
 *
 * This is a unified helper that routes to the appropriate board details function
 * based on the board name. For MoonBoard, it uses getMoonBoardDetails; for Aurora
 * boards (kilter, tension), it uses the generated getBoardDetails.
 */
export function getBoardDetailsForBoard(
  params: ParsedBoardRouteParameters | { board_name: string; layout_id: number; size_id: number; set_ids: SetIdList }
): BoardDetails {
  if (params.board_name === 'moonboard') {
    return getMoonBoardDetails({
      layout_id: params.layout_id,
      set_ids: params.set_ids,
    });
  }
  return getBoardDetails(params as Parameters<typeof getBoardDetails>[0]);
}
