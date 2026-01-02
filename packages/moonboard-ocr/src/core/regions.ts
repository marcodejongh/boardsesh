import { ImageRegion } from '../image-processor/types';

export interface ImageRegions {
  header: ImageRegion;
  board: ImageRegion;
}

/**
 * Calculate header and board regions based on image dimensions
 *
 * The MoonBoard app has a consistent layout:
 * - Status bar + nav bar at top (dark area)
 * - Header with climb name, setter, grade (white area)
 * - "Any marked holds" button
 * - Board grid (yellow background with holds)
 * - Controls at bottom
 *
 * Calibrated for iPhone screenshots (1290x2796)
 */
export function calculateRegions(width: number, height: number): ImageRegions {
  // Header region: starts after nav bar, includes name/setter/grade
  // On 2796px height: roughly y=308 to y=504
  const headerTop = Math.round(height * 0.11);
  const headerHeight = Math.round(height * 0.07);

  // Board region: the actual 11x18 grid of holds
  // Calibrated for labeled MoonBoard screenshots with "Show hold markers" enabled
  // These values are fine-tuned to align grid cells with actual hold positions
  const boardTop = Math.round(height * 0.249); // Start at row 18 (top)
  const boardBottom = Math.round(height * 0.88); // End at row 1 (bottom)
  const boardHeight = boardBottom - boardTop;

  // Skip the row number labels on left
  const boardLeft = Math.round(width * 0.1);
  const boardRight = Math.round(width * 0.95);
  const boardWidth = boardRight - boardLeft;

  return {
    header: {
      x: 0,
      y: headerTop,
      width: width,
      height: headerHeight,
    },
    board: {
      x: boardLeft,
      y: boardTop,
      width: boardWidth,
      height: boardHeight,
    },
  };
}
