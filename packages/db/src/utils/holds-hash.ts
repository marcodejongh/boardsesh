/**
 * Utility for generating a deterministic hash from climb frames.
 * Used for duplicate detection - same holds with same states produce the same hash.
 *
 * This is in the db package so it can be shared between:
 * - packages/web (saveClimb, shared-sync)
 * - packages/db/scripts (backfill script)
 */

interface HoldStatePair {
  holdId: number;
  roleCode: number;
}

/**
 * Parse a frames string to extract hold-state pairs.
 * Frames format: "p{holdId}r{roleCode}p{holdId}r{roleCode}..."
 * Multiple frames are separated by commas.
 *
 * For duplicate detection, we flatten all frames since we care about
 * the complete set of holds, not their frame organization.
 */
function parseFramesToHoldStatePairs(frames: string): HoldStatePair[] {
  const pairs: HoldStatePair[] = [];

  // Split by frames (comma-separated), then process each frame
  const frameStrings = frames.split(',').filter(Boolean);

  for (const frameString of frameStrings) {
    // Parse format: p{holdId}r{roleCode}p{holdId}r{roleCode}...
    const holdMatches = frameString.matchAll(/p(\d+)r(\d+)/g);

    for (const match of holdMatches) {
      pairs.push({
        holdId: parseInt(match[1], 10),
        roleCode: parseInt(match[2], 10),
      });
    }
  }

  return pairs;
}

/**
 * Generate a deterministic hash string from a frames string.
 *
 * The hash is a canonical string representation of sorted hold-state pairs:
 * "holdId:roleCode|holdId:roleCode|..."
 *
 * This ensures the same holds with the same states always produce
 * the same hash, regardless of the order they appear in the frames.
 */
export function generateHoldsHash(frames: string): string {
  if (!frames || frames.trim() === '') {
    return '';
  }

  const pairs = parseFramesToHoldStatePairs(frames);

  if (pairs.length === 0) {
    return '';
  }

  // Sort pairs by holdId first, then by roleCode for determinism
  pairs.sort((a, b) => {
    if (a.holdId !== b.holdId) {
      return a.holdId - b.holdId;
    }
    return a.roleCode - b.roleCode;
  });

  // Create canonical string: "holdId:roleCode|holdId:roleCode|..."
  return pairs.map(p => `${p.holdId}:${p.roleCode}`).join('|');
}

/**
 * Check if two frames strings represent the same set of holds.
 */
export function framesAreEquivalent(frames1: string, frames2: string): boolean {
  return generateHoldsHash(frames1) === generateHoldsHash(frames2);
}
