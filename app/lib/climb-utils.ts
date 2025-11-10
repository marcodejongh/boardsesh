/**
 * Utility functions for climb-related operations
 */

/**
 * Check if a climb description contains "no matching" text
 * Uses regex pattern: \b(?:no|don'?t)\s?match(?:ing)?\b
 * @param description - The climb description to check
 * @returns true if the description contains "no matching" pattern
 */
export function hasNoMatchingPattern(description: string): boolean {
  if (!description) return false;
  
  const noMatchingRegex = /\b(?:no|don'?t)\s*match(?:ing)?\b/i;
  return noMatchingRegex.test(description);
}