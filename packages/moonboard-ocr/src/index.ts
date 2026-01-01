/**
 * Node.js entry point for @boardsesh/moonboard-ocr
 *
 * This module provides a Sharp-based implementation for Node.js environments.
 * For browser usage, import from '@boardsesh/moonboard-ocr/browser' instead.
 *
 * @example
 * ```typescript
 * import { parseScreenshot } from '@boardsesh/moonboard-ocr';
 *
 * const result = await parseScreenshot('/path/to/screenshot.png');
 * if (result.success) {
 *   console.log('Climb:', result.climb);
 * }
 * ```
 */

// Main parsing functions
export {
  parseScreenshot,
  parseMultipleScreenshots,
  parseWithProcessor,
  deduplicateClimbs,
} from './parser.js';

// Image processor for advanced use cases
export { SharpImageProcessor } from './image-processor/sharp-processor.js';
export type {
  ImageProcessor,
  RawPixelData,
  ImageMetadata,
  ImageRegion,
  NodeImageSource,
} from './image-processor/types.js';

// Core algorithms (for advanced use cases)
export {
  detectBoardRegion,
  findCircleCenters,
  detectHoldsFromPixelData,
  classifyPixelColor,
  findNearestGridPosition,
} from './core/holds.js';
export { runOCR, parseHeaderText } from './core/ocr.js';
export { calculateRegions } from './core/regions.js';

// Types
export type {
  ParseResult,
  MoonBoardClimb,
  DetectedHold,
  GridCoordinate,
  HoldType,
  Column,
  Row,
  BoardRegion,
  HeaderRegion,
} from './types.js';

// Constants
export { GRID_POSITIONS, GRID_CONFIG, HOLD_COLORS } from './types.js';
