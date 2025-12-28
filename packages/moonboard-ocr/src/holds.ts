import sharp from 'sharp';
import { DetectedHold, HoldType, GridCoordinate, Column, GRID_CONFIG } from './types.js';

interface PixelColor {
  r: number;
  g: number;
  b: number;
}

interface CircleCenter {
  x: number;
  y: number;
  type: HoldType;
  pixelCount: number;
}

/**
 * Detect colored hold markers using flood-fill connected component analysis.
 *
 * Strategy:
 * 1. Find colored circles by flood-filling connected pixels of same color
 * 2. Calculate center of mass for each circle
 * 3. Map circle position to grid coordinate based on cell dimensions
 */
export async function detectHolds(
  imageBuffer: Buffer,
  boardRegion: { x: number; y: number; width: number; height: number }
): Promise<DetectedHold[]> {
  // Extract board region
  const { data, info } = await sharp(imageBuffer)
    .extract({
      left: boardRegion.x,
      top: boardRegion.y,
      width: boardRegion.width,
      height: boardRegion.height,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Find all colored circles using flood fill
  const circles = findCircleCenters(data, width, height, channels);

  // Calculate grid cell dimensions
  const cellWidth = width / GRID_CONFIG.numColumns;
  const cellHeight = height / GRID_CONFIG.numRows;

  // Convert circle positions to grid coordinates
  const detectedHolds: DetectedHold[] = circles.map(circle => {
    // Calculate column (A-K)
    const colIdx = Math.min(
      Math.floor(circle.x / cellWidth),
      GRID_CONFIG.numColumns - 1
    );
    const column = GRID_CONFIG.columns[colIdx];

    // Calculate row (18 at top, 1 at bottom)
    const rowIdx = Math.floor(circle.y / cellHeight);
    const row = Math.min(18, Math.max(1, 18 - rowIdx)) as typeof GRID_CONFIG.rows[number];

    const coordinate = `${column}${row}` as GridCoordinate;

    return {
      type: circle.type,
      coordinate,
      pixelX: boardRegion.x + circle.x,
      pixelY: boardRegion.y + circle.y,
      confidence: 1,
    };
  });

  return detectedHolds;
}

/**
 * Find centers of colored circles using flood-fill connected components.
 */
function findCircleCenters(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): CircleCenter[] {
  const visited = new Set<number>();
  const circles: CircleCenter[] = [];

  // Minimum pixels to be considered a valid circle (filters noise)
  const minPixels = 500;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited.has(idx)) continue;

      const pixelIdx = idx * channels;
      const r = data[pixelIdx];
      const g = data[pixelIdx + 1];
      const b = data[pixelIdx + 2];

      const holdType = classifyPixelColor({ r, g, b });
      if (!holdType) continue;

      // Flood fill to find all connected pixels of same type
      const component = floodFill(data, width, height, channels, x, y, holdType, visited);

      if (component.length >= minPixels) {
        // Calculate center of mass
        let sumX = 0, sumY = 0;
        for (const p of component) {
          sumX += p.x;
          sumY += p.y;
        }

        circles.push({
          x: Math.round(sumX / component.length),
          y: Math.round(sumY / component.length),
          type: holdType,
          pixelCount: component.length,
        });
      }
    }
  }

  return circles;
}

/**
 * Flood fill to find all connected pixels of the same hold type.
 */
function floodFill(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  startX: number,
  startY: number,
  targetType: HoldType,
  visited: Set<number>
): { x: number; y: number }[] {
  const pixels: { x: number; y: number }[] = [];
  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = y * width + x;
    if (visited.has(idx)) continue;

    const pixelIdx = idx * channels;
    const r = data[pixelIdx];
    const g = data[pixelIdx + 1];
    const b = data[pixelIdx + 2];

    const pixelType = classifyPixelColor({ r, g, b });
    if (pixelType !== targetType) continue;

    visited.add(idx);
    pixels.push({ x, y });

    // Add 4-connected neighbors
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return pixels;
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
  if (redDist < 50 || redDist2 < 50) {
    return 'finish';
  }

  // Blue circle (HAND holds) - intermediate moves
  // Exact color: #2961ff = RGB(41, 97, 255)
  const blueDist = Math.sqrt(
    Math.pow(r - 41, 2) + Math.pow(g - 97, 2) + Math.pow(b - 255, 2)
  );
  if (blueDist < 50) {
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
  if ((greenDist1 < 40 || greenDist2 < 40) && g > r && g > b) {
    return 'start';
  }

  return null;
}
