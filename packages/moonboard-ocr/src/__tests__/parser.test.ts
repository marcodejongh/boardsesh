/**
 * Sharp-based parser tests.
 *
 * These tests validate the Sharp (Node.js) implementation of the parser.
 * Uses shared expected results from fixtures/expected-results.ts.
 */

import { describe, it } from 'vitest';
import path from 'path';
import { parseScreenshot } from '../parser';
import { EXPECTED_RESULTS } from './fixtures/expected-results';
import { validateParseResult } from './helpers/test-utils';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('MoonBoard OCR Parser (Sharp Implementation)', () => {
  for (const expected of EXPECTED_RESULTS) {
    describe(expected.fixture, () => {
      it('should extract correct climb data', async () => {
        const result = await parseScreenshot(path.join(FIXTURES_DIR, expected.fixture));

        validateParseResult(result, expected, {
          validateOcr: true,
          partialNameMatch: true, // Use partial match for multi-line names
        });
      });
    });
  }
});
