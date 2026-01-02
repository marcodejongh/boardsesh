import path from 'path';
import { ImageProcessor } from './image-processor/types.js';
import { SharpImageProcessor } from './image-processor/sharp-processor.js';
import { runOCR } from './core/ocr.js';
import { detectHoldsFromPixelData } from './core/holds.js';
import { calculateRegions } from './core/regions.js';
import { MoonBoardClimb, ParseResult, GridCoordinate } from './types.js';

/**
 * Parse a MoonBoard screenshot using the provided ImageProcessor.
 * This is the core parsing function used by both Node and browser implementations.
 */
export async function parseWithProcessor(
  processor: ImageProcessor
): Promise<ParseResult> {
  const warnings: string[] = [];

  try {
    const metadata = processor.getMetadata();
    const regions = calculateRegions(metadata.width, metadata.height);

    // Extract header for OCR
    const ocrImageData = await processor.extractForOCR(regions.header);
    const ocrResult = await runOCR(ocrImageData);
    warnings.push(...ocrResult.warnings);

    // Extract board region for hold detection
    const boardPixels = await processor.extractRegion(regions.board);
    const detectedHolds = detectHoldsFromPixelData(boardPixels, regions.board);

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
      sourceFile: processor.getSourceName(),
      parseWarnings: warnings.length > 0 ? warnings : undefined,
    };

    return { success: true, climb, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to parse image: ${message}`, warnings };
  }
}

/**
 * Parse a single MoonBoard screenshot from file path (Node.js API).
 * This maintains backward compatibility with the original API.
 */
export async function parseScreenshot(imagePath: string): Promise<ParseResult> {
  const processor = new SharpImageProcessor();
  await processor.load(imagePath);
  return parseWithProcessor(processor);
}

/**
 * Parse multiple screenshots and combine results (Node.js API)
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
