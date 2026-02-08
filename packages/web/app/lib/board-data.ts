import { Angle, BoardName } from './types';
import { MOONBOARD_ENABLED, MOONBOARD_ANGLES } from './moonboard-config';

type ImageDimensions = {
  [imageName: string]: {
    width: number;
    height: number;
  };
};

export type SetIdList = number[];

// Conditionally include moonboard based on feature flag
export const SUPPORTED_BOARDS: BoardName[] = MOONBOARD_ENABLED
  ? ['kilter', 'tension', 'moonboard']
  : ['kilter', 'tension'];

export const BOARD_IMAGE_DIMENSIONS: Record<BoardName, ImageDimensions> = {
  kilter: {
    'product_sizes_layouts_sets/15_5_24.png': { width: 1080, height: 2498 },
    'product_sizes_layouts_sets/36-1.png': { width: 1080, height: 1350 },
    'product_sizes_layouts_sets/38-1.png': { width: 1080, height: 1350 },
    'product_sizes_layouts_sets/39-1.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/41-1.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/45-1.png': { width: 1080, height: 1170 },
    'product_sizes_layouts_sets/46-1.png': { width: 1080, height: 1170 },
    'product_sizes_layouts_sets/47.png': { width: 1200, height: 663 },
    'product_sizes_layouts_sets/48.png': { width: 1080, height: 1080 },
    'product_sizes_layouts_sets/49.png': { width: 1080, height: 1188 },
    'product_sizes_layouts_sets/50-1.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/51-1.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/53.png': { width: 1080, height: 1636 },
    'product_sizes_layouts_sets/54.png': { width: 1080, height: 1636 },
    'product_sizes_layouts_sets/55-v2.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/56-v3.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/59.png': { width: 1080, height: 1404 },
    'product_sizes_layouts_sets/60-v3.png': { width: 1080, height: 1157 },
    'product_sizes_layouts_sets/61-v3.png': { width: 1080, height: 1157 },
    'product_sizes_layouts_sets/63-v3.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/64-v3.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/65-v2.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/66-v2.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/70-v2.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/71-v3.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/72.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/73.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/77-1.png': { width: 1080, height: 1080 },
    'product_sizes_layouts_sets/78-1.png': { width: 1080, height: 1080 },
    'product_sizes_layouts_sets/original-16x12-bolt-ons-v2.png': { width: 1477, height: 1200 },
    'product_sizes_layouts_sets/original-16x12-screw-ons-v2.png': { width: 1477, height: 1200 },
  },
  tension: {
    'product_sizes_layouts_sets/1.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/10.png': { width: 1080, height: 1665 },
    'product_sizes_layouts_sets/11.png': { width: 1080, height: 1665 },
    'product_sizes_layouts_sets/12.png': { width: 1080, height: 1665 },
    'product_sizes_layouts_sets/12x10-tb2-plastic.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/12x10-tb2-wood.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/12x12-tb2-plastic.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/12x12-tb2-wood.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/13.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/14.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/15.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/16.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/17.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/18.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/19.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/2.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/20.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/21-2.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/22-2.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/23.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/24-2.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/25.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/26.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/27.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/28.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/3.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/4.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/5.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/6.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/7.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/8.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/8x10-tb2-plastic.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/8x10-tb2-wood.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/8x12-tb2-plastic.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/8x12-tb2-wood.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/9.png': { width: 1080, height: 1665 },
  },
  moonboard: {
    // MoonBoard 2010
    'moonboard2010/originalschoolholds.png': { width: 650, height: 1000 },
    // MoonBoard 2016
    'moonboard2016/holdseta.png': { width: 650, height: 1000 },
    'moonboard2016/holdsetb.png': { width: 650, height: 1000 },
    'moonboard2016/originalschoolholds.png': { width: 650, height: 1000 },
    // MoonBoard 2024
    'moonboard2024/holdsetd.png': { width: 650, height: 1000 },
    'moonboard2024/holdsete.png': { width: 650, height: 1000 },
    'moonboard2024/holdsetf.png': { width: 650, height: 1000 },
    'moonboard2024/woodenholds.png': { width: 650, height: 1000 },
    'moonboard2024/woodenholdsb.png': { width: 650, height: 1000 },
    'moonboard2024/woodenholdsc.png': { width: 650, height: 1000 },
    // MoonBoard Masters 2017
    'moonboardmasters2017/holdseta.png': { width: 650, height: 1000 },
    'moonboardmasters2017/holdsetb.png': { width: 650, height: 1000 },
    'moonboardmasters2017/holdsetc.png': { width: 650, height: 1000 },
    'moonboardmasters2017/originalschoolholds.png': { width: 650, height: 1000 },
    'moonboardmasters2017/screw-onfeet.png': { width: 650, height: 1000 },
    'moonboardmasters2017/woodenholds.png': { width: 650, height: 1000 },
    // MoonBoard Masters 2019
    'moonboardmasters2019/holdseta.png': { width: 650, height: 1000 },
    'moonboardmasters2019/holdsetb.png': { width: 650, height: 1000 },
    'moonboardmasters2019/originalschoolholds.png': { width: 650, height: 1000 },
    'moonboardmasters2019/screw-onfeet.png': { width: 650, height: 1000 },
    'moonboardmasters2019/woodenholds.png': { width: 650, height: 1000 },
    'moonboardmasters2019/woodenholdsb.png': { width: 650, height: 1000 },
    'moonboardmasters2019/woodenholdsc.png': { width: 650, height: 1000 },
  },
};

export const ANGLES: Record<BoardName, Angle[]> = {
  kilter: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  tension: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  moonboard: [...MOONBOARD_ANGLES],
};

// Unified grade system used by all boards
// difficulty_id matches board_difficulty_grades table
// font_grade is the Font/Fontainebleau grade (used for MoonBoard display)
// difficulty_name includes both Font and V-grade (used for Aurora display)
export const BOULDER_GRADES = [
  { difficulty_id: 10, font_grade: '4a', v_grade: 'V0', difficulty_name: '4a/V0' },
  { difficulty_id: 11, font_grade: '4b', v_grade: 'V0', difficulty_name: '4b/V0' },
  { difficulty_id: 12, font_grade: '4c', v_grade: 'V0', difficulty_name: '4c/V0' },
  { difficulty_id: 13, font_grade: '5a', v_grade: 'V1', difficulty_name: '5a/V1' },
  { difficulty_id: 14, font_grade: '5b', v_grade: 'V1', difficulty_name: '5b/V1' },
  { difficulty_id: 15, font_grade: '5c', v_grade: 'V2', difficulty_name: '5c/V2' },
  { difficulty_id: 16, font_grade: '6a', v_grade: 'V3', difficulty_name: '6a/V3' },
  { difficulty_id: 17, font_grade: '6a+', v_grade: 'V3', difficulty_name: '6a+/V3' },
  { difficulty_id: 18, font_grade: '6b', v_grade: 'V4', difficulty_name: '6b/V4' },
  { difficulty_id: 19, font_grade: '6b+', v_grade: 'V4', difficulty_name: '6b+/V4' },
  { difficulty_id: 20, font_grade: '6c', v_grade: 'V5', difficulty_name: '6c/V5' },
  { difficulty_id: 21, font_grade: '6c+', v_grade: 'V5', difficulty_name: '6c+/V5' },
  { difficulty_id: 22, font_grade: '7a', v_grade: 'V6', difficulty_name: '7a/V6' },
  { difficulty_id: 23, font_grade: '7a+', v_grade: 'V7', difficulty_name: '7a+/V7' },
  { difficulty_id: 24, font_grade: '7b', v_grade: 'V8', difficulty_name: '7b/V8' },
  { difficulty_id: 25, font_grade: '7b+', v_grade: 'V8', difficulty_name: '7b+/V8' },
  { difficulty_id: 26, font_grade: '7c', v_grade: 'V9', difficulty_name: '7c/V9' },
  { difficulty_id: 27, font_grade: '7c+', v_grade: 'V10', difficulty_name: '7c+/V10' },
  { difficulty_id: 28, font_grade: '8a', v_grade: 'V11', difficulty_name: '8a/V11' },
  { difficulty_id: 29, font_grade: '8a+', v_grade: 'V12', difficulty_name: '8a+/V12' },
  { difficulty_id: 30, font_grade: '8b', v_grade: 'V13', difficulty_name: '8b/V13' },
  { difficulty_id: 31, font_grade: '8b+', v_grade: 'V14', difficulty_name: '8b+/V14' },
  { difficulty_id: 32, font_grade: '8c', v_grade: 'V15', difficulty_name: '8c/V15' },
  { difficulty_id: 33, font_grade: '8c+', v_grade: 'V16', difficulty_name: '8c+/V16' },
] as const;

export type BoulderGrade = typeof BOULDER_GRADES[number];

// Alias for backwards compatibility
export const TENSION_KILTER_GRADES = BOULDER_GRADES;

// MoonBoard supports grades from 5+ (V1) and above
// Uses Font grade notation (uppercase) for display
export const MOONBOARD_MIN_DIFFICULTY_ID = 13; // 5a/V1 (MoonBoard "5+" grade)

// Helper to get grades for a specific board
export function getGradesForBoard(boardName: BoardName) {
  if (boardName === 'moonboard') {
    return BOULDER_GRADES.filter(g => g.difficulty_id >= MOONBOARD_MIN_DIFFICULTY_ID);
  }
  return BOULDER_GRADES;
}

// Helper to convert Font grade string to difficulty ID
// Handles various formats from OCR:
// - "6a", "7b+" (lowercase Font grade)
// - "6A", "7B+" (uppercase Font grade)
// - "6A/V3", "7B+/V8" (combined Font + V-grade from MoonBoard OCR)
export function fontGradeToDifficultyId(fontGrade: string): number | null {
  // Extract just the Font grade portion if combined with V-grade (e.g., "6A/V3" -> "6A")
  const fontPart = fontGrade.split('/')[0].trim();
  // Normalize to lowercase for comparison
  const normalized = fontPart.toLowerCase();
  const grade = BOULDER_GRADES.find(g => g.font_grade === normalized);
  return grade?.difficulty_id ?? null;
}

// Helper to get grade info by difficulty ID
// Note: difficultyId may come from database as a float (doublePrecision), so we round it
export function getGradeByDifficultyId(difficultyId: number): BoulderGrade | undefined {
  const roundedId = Math.round(difficultyId);
  return BOULDER_GRADES.find(g => g.difficulty_id === roundedId);
}
