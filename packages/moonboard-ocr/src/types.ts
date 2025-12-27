// Grid coordinates for MoonBoard 2024
// Columns: A-K (11 columns)
// Rows: 1-18 (bottom to top)
export type Column = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
export type Row = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export type GridCoordinate = `${Column}${Row}`;

export type HoldType = 'start' | 'hand' | 'finish';

export interface DetectedHold {
  type: HoldType;
  coordinate: GridCoordinate;
  // Pixel position in the original image (for debugging)
  pixelX: number;
  pixelY: number;
  // Confidence score (0-1)
  confidence: number;
}

export interface MoonBoardClimb {
  // Climb metadata from OCR
  name: string;
  setter: string;
  angle: number;
  userGrade: string;
  setterGrade: string;
  isBenchmark: boolean;  // Orange "B" icon indicates official benchmark climb

  // Hold positions
  holds: {
    start: GridCoordinate[];
    hand: GridCoordinate[];
    finish: GridCoordinate[];
  };

  // Source tracking
  sourceFile: string;

  // Optional: parsing confidence/errors
  parseWarnings?: string[];
}

export interface ParseResult {
  success: boolean;
  climb?: MoonBoardClimb;
  error?: string;
  warnings: string[];
}

export interface BoardRegion {
  // Coordinates of the board area in the image
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeaderRegion {
  // Coordinates of the header/text area
  x: number;
  y: number;
  width: number;
  height: number;
}

// Color detection thresholds (in HSV)
export interface ColorRange {
  hueMin: number;
  hueMax: number;
  satMin: number;
  satMax: number;
  valMin: number;
  valMax: number;
}

export const HOLD_COLORS: Record<HoldType, ColorRange> = {
  // Red circles for start holds
  start: {
    hueMin: 0,
    hueMax: 10,
    satMin: 150,
    satMax: 255,
    valMin: 150,
    valMax: 255,
  },
  // Blue circles for hand holds
  hand: {
    hueMin: 100,
    hueMax: 130,
    satMin: 150,
    satMax: 255,
    valMin: 150,
    valMax: 255,
  },
  // Yellow/Green circles for finish holds
  finish: {
    hueMin: 40,
    hueMax: 80,
    satMin: 150,
    satMax: 255,
    valMin: 150,
    valMax: 255,
  },
};

// MoonBoard 2024 grid configuration
export const GRID_CONFIG = {
  columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as Column[],
  rows: [18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as Row[],
  numColumns: 11,
  numRows: 18,
};
