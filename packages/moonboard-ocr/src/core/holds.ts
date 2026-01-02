import { HoldType, GridCoordinate, GRID_POSITIONS, DetectedHold } from '../types.js';
import { RawPixelData, ImageRegion } from '../image-processor/types.js';

interface CircleCenter {
  x: number;
  y: number;
  type: HoldType;
  pixelCount: number;
}

/**
 * Check if a pixel is the MoonBoard yellow color.
 */
function isYellowPixel(r: number, g: number, b: number): boolean {
  // MoonBoard yellow: ~RGB(238, 223, 80)
  // Allow some tolerance for compression artifacts
  return (
    r >= 200 &&
    r <= 255 &&
    g >= 180 &&
    g <= 240 &&
    b >= 40 &&
    b <= 120 &&
    r > b &&
    g > b
  ); // Yellow has high R and G, low B
}

/**
 * Auto-detect the yellow MoonBoard region in raw pixel data.
 * The board is yellow (#eedf50) surrounded by gray UI elements.
 */
export function detectBoardRegion(
  pixelData: RawPixelData
): ImageRegion | null {
  const { data, width, height, channels } = pixelData;

  // Find bounding box of yellow pixels
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
  let yellowCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if pixel is yellow (MoonBoard background color)
      if (isYellowPixel(r, g, b)) {
        yellowCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Need a significant amount of yellow to be valid
  if (yellowCount < 1000) {
    return null;
  }

  // The detected yellow region may include UI elements above/below the actual grid
  // Trim a small percentage from top and bottom to exclude buttons/labels
  const detectedWidth = maxX - minX;
  const detectedHeight = maxY - minY;

  // Trim 2% from top and bottom to exclude any UI elements
  const topTrim = Math.round(detectedHeight * 0.02);
  const bottomTrim = Math.round(detectedHeight * 0.02);

  return {
    x: minX,
    y: minY + topTrim,
    width: detectedWidth,
    height: detectedHeight - topTrim - bottomTrim,
  };
}

/**
 * Classify a pixel color as a hold type or null
 *
 * MoonBoard color scheme:
 * - RED circles (#f44336) = FINISH holds (top of climb)
 * - BLUE circles (#2961ff) = HAND holds (intermediate)
 * - GREEN circles (#4caf50) = START holds (bottom of climb)
 */
export function classifyPixelColor(
  r: number,
  g: number,
  b: number
): HoldType | null {
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

/**
 * Flood fill to find all connected pixels of the same hold type.
 */
function floodFill(
  data: Uint8Array | Uint8ClampedArray,
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

    const pixelType = classifyPixelColor(r, g, b);
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
 * Find centers of colored circles using flood-fill connected components.
 * Works with 4-channel RGBA data.
 */
export function findCircleCenters(pixelData: RawPixelData): CircleCenter[] {
  const { data, width, height, channels } = pixelData;
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

      const holdType = classifyPixelColor(r, g, b);
      if (!holdType) continue;

      // Flood fill to find all connected pixels of same type
      const component = floodFill(
        data,
        width,
        height,
        channels,
        x,
        y,
        holdType,
        visited
      );

      if (component.length >= minPixels) {
        // Calculate center of mass
        let sumX = 0,
          sumY = 0;
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
 * Find the nearest grid coordinate to a relative position.
 */
export function findNearestGridPosition(
  relX: number,
  relY: number
): { coordinate: GridCoordinate; distance: number } {
  let nearestCoord: GridCoordinate = 'A1';
  let minDistance = Infinity;

  for (const [coord, pos] of Object.entries(GRID_POSITIONS)) {
    const dx = relX - pos.x;
    const dy = relY - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      nearestCoord = coord as GridCoordinate;
    }
  }

  return { coordinate: nearestCoord, distance: minDistance };
}

/**
 * Map circle positions to grid coordinates
 */
export function mapCirclesToHolds(
  circles: CircleCenter[],
  boardRegion: ImageRegion,
  pixelDataDimensions: { width: number; height: number }
): DetectedHold[] {
  return circles
    .map((circle) => {
      // Convert pixel position to relative position (0-1)
      const relX = circle.x / pixelDataDimensions.width;
      const relY = circle.y / pixelDataDimensions.height;

      // Find nearest grid position
      const { coordinate, distance } = findNearestGridPosition(relX, relY);

      // Calculate confidence based on distance (closer = higher confidence)
      // Max reasonable distance is ~0.05 (half a cell width)
      const confidence = Math.max(0, 1 - distance / 0.1);

      return {
        type: circle.type,
        coordinate,
        pixelX: boardRegion.x + circle.x,
        pixelY: boardRegion.y + circle.y,
        confidence,
      };
    })
    .filter((hold) => hold.confidence > 0.5);
}

/**
 * Detect holds from raw pixel data of the board region.
 */
export function detectHoldsFromPixelData(
  pixelData: RawPixelData,
  boardRegion: ImageRegion
): DetectedHold[] {
  const circles = findCircleCenters(pixelData);
  return mapCirclesToHolds(circles, boardRegion, {
    width: pixelData.width,
    height: pixelData.height,
  });
}
