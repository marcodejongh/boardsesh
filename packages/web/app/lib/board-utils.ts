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
/**
 * Generates a user-friendly page title from board details.
 * Example output: "Kilter Original 12x12 | Boardsesh"
 */
export function generateBoardTitle(boardDetails: BoardDetails): string {
  const parts: string[] = [];

  // Capitalize board name
  const boardName = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  parts.push(boardName);

  // Add layout name if available, but strip out board name prefix to avoid duplication
  if (boardDetails.layout_name) {
    // Remove board name prefix (e.g., "Kilter Board Original" -> "Original")
    const layoutName = boardDetails.layout_name
      .replace(new RegExp(`^${boardDetails.board_name}\\s*(board)?\\s*`, 'i'), '')
      .trim();

    if (layoutName) {
      parts.push(layoutName);
    }
  }

  // Add size info - prefer size_name, fallback to size_description
  if (boardDetails.size_name) {
    // Extract dimensions if present (e.g., "12 x 12 Commercial" -> "12x12")
    const sizeMatch = boardDetails.size_name.match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      parts.push(`${sizeMatch[1]}x${sizeMatch[2]}`);
    } else {
      parts.push(boardDetails.size_name);
    }
  } else if (boardDetails.size_description) {
    parts.push(boardDetails.size_description);
  }

  return `${parts.join(' ')} | Boardsesh`;
}

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
