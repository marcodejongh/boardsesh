import sharp from 'sharp';
import path from 'path';
import { extractHeaderText } from './ocr.js';
import { detectHolds } from './holds.js';
import { MoonBoardClimb, ParseResult, GridCoordinate } from './types.js';

// Region definitions for MoonBoard app screenshots
// These values are calibrated for typical phone screenshots
// May need adjustment based on device resolution

interface ImageRegions {
  header: { x: number; y: number; width: number; height: number };
  board: { x: number; y: number; width: number; height: number };
}

/**
 * Parse a single MoonBoard screenshot and extract climb data
 */
export async function parseScreenshot(imagePath: string): Promise<ParseResult> {
  const warnings: string[] = [];

  try {
    // Load image and get dimensions
    const imageBuffer = await sharp(imagePath).toBuffer();
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, error: 'Could not read image dimensions', warnings };
    }

    // Calculate regions based on image dimensions
    const regions = calculateRegions(metadata.width, metadata.height);

    // Extract text from header
    const ocrResult = await extractHeaderText(imageBuffer, regions.header);
    warnings.push(...ocrResult.warnings);

    // Detect holds on the board
    const detectedHolds = await detectHolds(imageBuffer, regions.board);

    // Group holds by type
    const startHolds: GridCoordinate[] = [];
    const handHolds: GridCoordinate[] = [];
    const finishHolds: GridCoordinate[] = [];

    for (const hold of detectedHolds) {
      switch (hold.type) {
        case 'start':
          startHolds.push(hold.coordinate);
          break;
        case 'hand':
          handHolds.push(hold.coordinate);
          break;
        case 'finish':
          finishHolds.push(hold.coordinate);
          break;
      }
    }

    // Validate we found some holds
    if (startHolds.length === 0) {
      warnings.push('No start holds detected');
    }
    if (finishHolds.length === 0) {
      warnings.push('No finish holds detected');
    }
    if (startHolds.length + handHolds.length + finishHolds.length === 0) {
      return { success: false, error: 'No holds detected in image', warnings };
    }

    // Build the climb object
    const climb: MoonBoardClimb = {
      name: ocrResult.name,
      setter: ocrResult.setter,
      angle: ocrResult.angle,
      userGrade: ocrResult.userGrade,
      setterGrade: ocrResult.setterGrade,
      isBenchmark: ocrResult.isBenchmark,
      holds: {
        start: [...new Set(startHolds)], // Dedupe
        hand: [...new Set(handHolds)],
        finish: [...new Set(finishHolds)],
      },
      sourceFile: path.basename(imagePath),
      parseWarnings: warnings.length > 0 ? warnings : undefined,
    };

    return { success: true, climb, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to parse image: ${message}`, warnings };
  }
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
function calculateRegions(width: number, height: number): ImageRegions {
  // Header region: starts after nav bar, includes name/setter/grade
  // On 2796px height: roughly y=308 to y=504
  const headerTop = Math.round(height * 0.11);
  const headerHeight = Math.round(height * 0.07);

  // Board region: the actual 11x18 grid of holds
  // Must exclude:
  // - "Any marked holds" button at top
  // - Column letters row (A-K) at top
  // - Row numbers (1-18) on left side
  // On 2796px height image:
  // - Actual grid starts around y=580 (below column letters)
  // - Grid ends around y=2400
  // - Grid left edge around x=130 (right of row numbers)
  // - Grid right edge around x=1220
  const boardTop = Math.round(height * 0.238);  // Skip header + column letters (tuned for grid alignment)
  const boardBottom = Math.round(height * 0.86);
  const boardHeight = boardBottom - boardTop;

  // Skip the row number labels on left
  const boardLeft = Math.round(width * 0.10);
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

/**
 * Parse multiple screenshots and combine results
 */
export async function parseMultipleScreenshots(
  imagePaths: string[],
  onProgress?: (current: number, total: number, file: string) => void
): Promise<{ climbs: MoonBoardClimb[]; errors: Array<{ file: string; error: string }> }> {
  const climbs: MoonBoardClimb[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    onProgress?.(i + 1, imagePaths.length, path.basename(imagePath));

    const result = await parseScreenshot(imagePath);
    if (result.success && result.climb) {
      climbs.push(result.climb);
    } else {
      errors.push({ file: path.basename(imagePath), error: result.error || 'Unknown error' });
    }
  }

  return { climbs, errors };
}

/**
 * Deduplicate climbs by their hold configuration
 * Two climbs with the same holds are considered the same climb
 */
export function deduplicateClimbs(climbs: MoonBoardClimb[]): MoonBoardClimb[] {
  const seen = new Map<string, MoonBoardClimb>();

  for (const climb of climbs) {
    // Create a unique key from sorted hold positions
    const key = [
      ...climb.holds.start.sort(),
      '|',
      ...climb.holds.hand.sort(),
      '|',
      ...climb.holds.finish.sort(),
    ].join(',');

    // Keep the first occurrence (or could prefer one with better OCR results)
    if (!seen.has(key)) {
      seen.set(key, climb);
    }
  }

  return Array.from(seen.values());
}
