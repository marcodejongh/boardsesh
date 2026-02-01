/**
 * Node.js parsing functions for @boardsesh/moonboard-ocr
 *
 * This module provides file-path based APIs using Sharp for image processing.
 * For browser usage, import from '@boardsesh/moonboard-ocr/browser' instead.
 */

import path from 'path';
import { SharpImageProcessor } from './image-processor/sharp-processor';
import { MoonBoardClimb, ParseResult } from './types';

// Re-export browser-safe core functions for backward compatibility
export { parseWithProcessor, deduplicateClimbs } from './parser-core';

/**
 * Parse a single MoonBoard screenshot from file path (Node.js API).
 * This maintains backward compatibility with the original API.
 */
export async function parseScreenshot(imagePath: string): Promise<ParseResult> {
  const processor = new SharpImageProcessor();
  await processor.load(imagePath);
  const { parseWithProcessor } = await import('./parser-core');
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
