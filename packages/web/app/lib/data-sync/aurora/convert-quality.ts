/**
 * Convert Aurora quality (1-5) to Boardsesh quality (1-5)
 * Formula: quality / 3.0 * 5
 *
 * Aurora uses a 1-3 scale (with some 4-5 values), while Boardsesh uses a 1-5 scale.
 * This conversion scales the Aurora rating to match the Boardsesh scale.
 */
export function convertQuality(auroraQuality: number | null | undefined): number | null {
  if (auroraQuality == null) return null;
  return Math.round((auroraQuality / 3.0) * 5);
}
