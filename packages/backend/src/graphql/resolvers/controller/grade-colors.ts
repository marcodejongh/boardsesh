/**
 * V-grade color scheme based on thecrag.com grade coloring
 * Ported from packages/web/app/lib/grade-colors.ts for backend use
 *
 * Color progression from yellow (easy) to purple (hard):
 * - V0: Yellow
 * - V1-V2: Orange
 * - V3-V4: Dark orange/red-orange
 * - V5-V6: Red
 * - V7-V10: Dark red/crimson
 * - V11+: Purple/magenta
 */

// V-grade to hex color mapping
const V_GRADE_COLORS: Record<string, string> = {
  V0: '#FFEB3B', // Yellow
  V1: '#FFC107', // Amber/Yellow-orange
  V2: '#FF9800', // Orange
  V3: '#FF7043', // Deep orange
  V4: '#FF5722', // Red-orange
  V5: '#F44336', // Red
  V6: '#E53935', // Red (slightly darker)
  V7: '#D32F2F', // Dark red
  V8: '#C62828', // Darker red
  V9: '#B71C1C', // Deep red
  V10: '#A11B4A', // Red-purple transition
  V11: '#9C27B0', // Purple
  V12: '#7B1FA2', // Dark purple
  V13: '#6A1B9A', // Darker purple
  V14: '#5C1A87', // Deep purple
  V15: '#4A148C', // Very deep purple
  V16: '#38006B', // Near black purple
  V17: '#2A0054', // Darkest purple
};

// Font grade to hex color mapping (uses same color as corresponding V-grade)
const FONT_GRADE_COLORS: Record<string, string> = {
  '4a': '#FFEB3B', // V0
  '4b': '#FFEB3B', // V0
  '4c': '#FFEB3B', // V0
  '5a': '#FFC107', // V1
  '5b': '#FFC107', // V1
  '5c': '#FF9800', // V2
  '6a': '#FF7043', // V3
  '6a+': '#FF7043', // V3
  '6b': '#FF5722', // V4
  '6b+': '#FF5722', // V4
  '6c': '#F44336', // V5
  '6c+': '#F44336', // V5
  '7a': '#E53935', // V6
  '7a+': '#D32F2F', // V7
  '7b': '#C62828', // V8
  '7b+': '#C62828', // V8
  '7c': '#B71C1C', // V9
  '7c+': '#A11B4A', // V10
  '8a': '#9C27B0', // V11
  '8a+': '#7B1FA2', // V12
  '8b': '#6A1B9A', // V13
  '8b+': '#5C1A87', // V14
  '8c': '#4A148C', // V15
  '8c+': '#38006B', // V16
};

// Default color when grade cannot be determined
const DEFAULT_GRADE_COLOR = '#808080'; // Gray

/**
 * Get color for a V-grade string (e.g., "V3", "V10")
 * @param vGrade - V-grade string like "V3" or "V10"
 * @returns Hex color string, or default color if not found
 */
export function getVGradeColor(vGrade: string | null | undefined): string {
  if (!vGrade) return DEFAULT_GRADE_COLOR;
  const normalized = vGrade.toUpperCase();
  return V_GRADE_COLORS[normalized] ?? DEFAULT_GRADE_COLOR;
}

/**
 * Get color for a Font grade string (e.g., "6a", "7b+")
 * @param fontGrade - Font grade string like "6a" or "7b+"
 * @returns Hex color string, or default color if not found
 */
export function getFontGradeColor(fontGrade: string | null | undefined): string {
  if (!fontGrade) return DEFAULT_GRADE_COLOR;
  return FONT_GRADE_COLORS[fontGrade.toLowerCase()] ?? DEFAULT_GRADE_COLOR;
}

/**
 * Get color for a difficulty string that may contain both Font and V-grade (e.g., "6a/V3")
 * Extracts the V-grade and returns its color
 * @param difficulty - Difficulty string like "6a/V3" or "V5"
 * @returns Hex color string, always returns a color (defaults to gray)
 */
export function getGradeColor(difficulty: string | null | undefined): string {
  if (!difficulty) return DEFAULT_GRADE_COLOR;

  // Try to extract V-grade first
  const vGradeMatch = difficulty.match(/V\d+/i);
  if (vGradeMatch) {
    return getVGradeColor(vGradeMatch[0]);
  }

  // Fall back to Font grade
  const fontGradeMatch = difficulty.match(/\d[abc]\+?/i);
  if (fontGradeMatch) {
    return getFontGradeColor(fontGradeMatch[0]);
  }

  return DEFAULT_GRADE_COLOR;
}
