/**
 * Core parsing functions that work in both Node.js and browser environments.
 * This module does NOT import sharp or any Node.js-specific modules.
 *
 * For Node.js-specific functions (that use file paths), see parser.ts
 */

import { ImageProcessor } from './image-processor/types';
import { runOCR } from './core/ocr';
import { detectHoldsFromPixelData } from './core/holds';
import { calculateRegions } from './core/regions';
import { MoonBoardClimb, ParseResult, GridCoordinate } from './types';

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
