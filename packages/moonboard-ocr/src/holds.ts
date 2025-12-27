import sharp from 'sharp';
import { DetectedHold, HoldType, GridCoordinate, Column, Row, GRID_CONFIG } from './types.js';

interface PixelColor {
  r: number;
  g: number;
  b: number;
}

interface CellDetection {
  row: number;
  col: number;
  type: HoldType;
  count: number;
}

/**
 * Detect colored hold markers in the board region using grid-based sampling.
 * This is much faster than scanning every pixel.
 *
 * Strategy: Divide the board into 11x18 grid cells and sample each cell
 * for the presence of colored circle markers.
 */
export async function detectHolds(
  imageBuffer: Buffer,
  boardRegion: { x: number; y: number; width: number; height: number }
): Promise<DetectedHold[]> {
  // Crop and resize board region for faster processing
  const scaledWidth = 330; // 30px per column
  const scaledHeight = 540; // 30px per row

  const { data, info } = await sharp(imageBuffer)
    .extract({
      left: boardRegion.x,
      top: boardRegion.y,
      width: boardRegion.width,
      height: boardRegion.height,
    })
    .resize(scaledWidth, scaledHeight)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const cellWidth = width / GRID_CONFIG.numColumns;
  const cellHeight = height / GRID_CONFIG.numRows;

  const cellDetections: CellDetection[] = [];

  // Sample each grid cell
  for (let row = 0; row < GRID_CONFIG.numRows; row++) {
    for (let col = 0; col < GRID_CONFIG.numColumns; col++) {
      // Calculate cell bounds
      const cellX = Math.floor(col * cellWidth);
      const cellY = Math.floor(row * cellHeight);
      const cellW = Math.floor(cellWidth);
      const cellH = Math.floor(cellHeight);

      // Count colored pixels in this cell
      const colorCounts = { start: 0, hand: 0, finish: 0 };

      for (let y = cellY; y < cellY + cellH && y < height; y++) {
        for (let x = cellX; x < cellX + cellW && x < width; x++) {
          const idx = (y * width + x) * channels;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const holdType = classifyPixelColor({ r, g, b });
          if (holdType) {
            colorCounts[holdType]++;
          }
        }
      }

      // Check if any color has enough pixels (threshold for circle detection)
      // With exact color matching, we can use a lower threshold
      const threshold = (cellW * cellH) * 0.03; // 3% of cell area

      for (const [type, count] of Object.entries(colorCounts)) {
        if (count > threshold) {
          // Position-based validation
          // MoonBoard grid: row 18 at top of image, row 1 at bottom
          // Image row 0-2 → grid rows 16-18 (top)
          // Image row 15-17 → grid rows 1-3 (bottom)
          const gridRow = GRID_CONFIG.rows[row];

          // Finish holds (RED) should be at the top (rows 15-18)
          if (type === 'finish' && gridRow < 15) {
            continue; // Skip finish holds detected below row 15
          }

          // Start holds (GREEN) should be at the bottom (rows 1-8)
          if (type === 'start' && gridRow > 8) {
            continue; // Skip start holds detected above row 8
          }

          cellDetections.push({
            row,
            col,
            type: type as HoldType,
            count,
          });
        }
      }
    }
  }

  // Deduplicate adjacent cells of the same type - keep only the cell with the highest count
  const deduplicatedHolds = deduplicateAdjacentCells(cellDetections);

  // Convert to DetectedHold format
  const detectedHolds: DetectedHold[] = deduplicatedHolds.map(cell => {
    const column = GRID_CONFIG.columns[cell.col];
    const rowNum = GRID_CONFIG.rows[cell.row];
    const coordinate = `${column}${rowNum}` as GridCoordinate;

    return {
      type: cell.type,
      coordinate,
      pixelX: boardRegion.x + Math.floor((cell.col + 0.5) * (boardRegion.width / GRID_CONFIG.numColumns)),
      pixelY: boardRegion.y + Math.floor((cell.row + 0.5) * (boardRegion.height / GRID_CONFIG.numRows)),
      confidence: 1,
    };
  });

  return detectedHolds;
}

/**
 * Deduplicate adjacent cells of the same hold type.
 * When a circle spans multiple cells, keep only the cell with the highest pixel count.
 */
function deduplicateAdjacentCells(cells: CellDetection[]): CellDetection[] {
  if (cells.length === 0) return [];

  // Group cells by type
  const byType = new Map<HoldType, CellDetection[]>();
  for (const cell of cells) {
    const group = byType.get(cell.type) || [];
    group.push(cell);
    byType.set(cell.type, group);
  }

  const result: CellDetection[] = [];

  // For each type, find connected components and keep the best cell from each
  for (const [type, typeCells] of byType) {
    const visited = new Set<string>();

    for (const cell of typeCells) {
      const key = `${cell.row},${cell.col}`;
      if (visited.has(key)) continue;

      // BFS to find all connected cells of same type
      const component: CellDetection[] = [];
      const queue = [cell];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentKey = `${current.row},${current.col}`;
        if (visited.has(currentKey)) continue;
        visited.add(currentKey);
        component.push(current);

        // Check adjacent cells (4-connected)
        for (const other of typeCells) {
          const otherKey = `${other.row},${other.col}`;
          if (visited.has(otherKey)) continue;

          const rowDiff = Math.abs(other.row - current.row);
          const colDiff = Math.abs(other.col - current.col);

          // Adjacent if difference is 1 in one dimension and 0 in other
          if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            queue.push(other);
          }
        }
      }

      // Keep the cell with highest count from this component
      const best = component.reduce((a, b) => a.count > b.count ? a : b);
      result.push(best);
    }
  }

  return result;
}

/**
 * Classify a pixel color as a hold type or null
 *
 * MoonBoard color scheme:
 * - RED circles (#f44336) = FINISH holds (top of climb)
 * - BLUE circles (#2961ff) = HAND holds (intermediate)
 * - GREEN circles (#4caf50) = START holds (bottom of climb)
 */
function classifyPixelColor(color: PixelColor): HoldType | null {
  const { r, g, b } = color;

  // Red circle (FINISH holds) - top of climb
  // Exact color: #f44336 = RGB(244, 67, 54)
  // Also matches rendered color ~RGB(225, 82, 64)
  const redDist = Math.sqrt(
    Math.pow(r - 244, 2) + Math.pow(g - 67, 2) + Math.pow(b - 54, 2)
  );
  const redDist2 = Math.sqrt(
    Math.pow(r - 225, 2) + Math.pow(g - 82, 2) + Math.pow(b - 64, 2)
  );
  if (redDist < 40 || redDist2 < 40) {
    return 'finish';
  }

  // Blue circle (HAND holds) - intermediate moves
  // Exact color: #2961ff = RGB(41, 97, 255)
  const blueDist = Math.sqrt(
    Math.pow(r - 41, 2) + Math.pow(g - 97, 2) + Math.pow(b - 255, 2)
  );
  if (blueDist < 40) {
    return 'hand';
  }

  // Green circle (START holds) - bottom of climb
  // Design color: #4caf50 = RGB(76, 175, 80)
  // Actual rendered: ~RGB(85, 171, 103) or ~RGB(100, 160, 80)
  const greenDist1 = Math.sqrt(
    Math.pow(r - 76, 2) + Math.pow(g - 175, 2) + Math.pow(b - 80, 2)
  );
  const greenDist2 = Math.sqrt(
    Math.pow(r - 100, 2) + Math.pow(g - 160, 2) + Math.pow(b - 80, 2)
  );
  if ((greenDist1 < 30 || greenDist2 < 30) && g > r && g > b) {
    return 'start';
  }

  return null;
}
