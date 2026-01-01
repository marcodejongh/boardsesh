/**
 * Canvas-based parser tests.
 *
 * These tests validate the Canvas (Browser) implementation of the parser.
 * Uses node-canvas to simulate browser Canvas API in Node.js.
 * Uses shared expected results from fixtures/expected-results.ts.
 *
 * NOTE: OCR results may vary slightly between Sharp and node-canvas due to
 * different image processing pipelines. Hold detection should be consistent.
 */

import { describe, it } from 'vitest';
import path from 'path';
import { NodeCanvasImageProcessor } from './helpers/node-canvas-processor.js';
import { parseWithProcessor } from '../parser.js';
import { EXPECTED_RESULTS } from './fixtures/expected-results.js';
import { validateParseResult } from './helpers/test-utils.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('MoonBoard OCR Parser (Canvas Implementation)', () => {
  for (const expected of EXPECTED_RESULTS) {
    describe(expected.fixture, () => {
      it('should extract correct climb data', async () => {
        const processor = new NodeCanvasImageProcessor();
        await processor.load(path.join(FIXTURES_DIR, expected.fixture));
        const result = await parseWithProcessor(processor);

        validateParseResult(result, expected, {
          validateOcr: true,
          partialNameMatch: true, // Use partial match due to OCR variations
        });
      });
    });
  }
});
