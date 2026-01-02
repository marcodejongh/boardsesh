// MoonBoard Configuration
// This file contains all MoonBoard-specific configuration that differs from Aurora boards

// Feature flag - auto-enabled in development, or via MOONBOARD_ENABLED env var
export const MOONBOARD_ENABLED =
  process.env.NODE_ENV === 'development' || process.env.MOONBOARD_ENABLED === 'true';

// MoonBoard layout types (equivalent to Aurora "layouts")
export const MOONBOARD_LAYOUTS = {
  'moonboard-2010': { id: 1, name: 'MoonBoard 2010', folder: 'moonboard2010' },
  'moonboard-2016': { id: 2, name: 'MoonBoard 2016', folder: 'moonboard2016' },
  'moonboard-2024': { id: 3, name: 'MoonBoard 2024', folder: 'moonboard2024' },
  'moonboard-masters-2017': { id: 4, name: 'MoonBoard Masters 2017', folder: 'moonboardmasters2017' },
  'moonboard-masters-2019': { id: 5, name: 'MoonBoard Masters 2019', folder: 'moonboardmasters2019' },
} as const;

export type MoonBoardLayoutKey = keyof typeof MOONBOARD_LAYOUTS;

// Hold sets available per layout
export const MOONBOARD_SETS: Record<MoonBoardLayoutKey, { id: number; name: string; imageFile: string }[]> = {
  'moonboard-2010': [
    { id: 1, name: 'Original School Holds', imageFile: 'originalschoolholds.png' },
  ],
  'moonboard-2016': [
    { id: 2, name: 'Hold Set A', imageFile: 'holdseta.png' },
    { id: 3, name: 'Hold Set B', imageFile: 'holdsetb.png' },
    { id: 4, name: 'Original School Holds', imageFile: 'originalschoolholds.png' },
  ],
  'moonboard-2024': [
    { id: 5, name: 'Hold Set D', imageFile: 'holdsetd.png' },
    { id: 6, name: 'Hold Set E', imageFile: 'holdsete.png' },
    { id: 7, name: 'Hold Set F', imageFile: 'holdsetf.png' },
    { id: 8, name: 'Wooden Holds', imageFile: 'woodenholds.png' },
    { id: 9, name: 'Wooden Holds B', imageFile: 'woodenholdsb.png' },
    { id: 10, name: 'Wooden Holds C', imageFile: 'woodenholdsc.png' },
  ],
  'moonboard-masters-2017': [
    { id: 11, name: 'Hold Set A', imageFile: 'holdseta.png' },
    { id: 12, name: 'Hold Set B', imageFile: 'holdsetb.png' },
    { id: 13, name: 'Hold Set C', imageFile: 'holdsetc.png' },
    { id: 14, name: 'Original School Holds', imageFile: 'originalschoolholds.png' },
    { id: 15, name: 'Screw-on Feet', imageFile: 'screw-onfeet.png' },
    { id: 16, name: 'Wooden Holds', imageFile: 'woodenholds.png' },
  ],
  'moonboard-masters-2019': [
    { id: 17, name: 'Hold Set A', imageFile: 'holdseta.png' },
    { id: 18, name: 'Hold Set B', imageFile: 'holdsetb.png' },
    { id: 19, name: 'Original School Holds', imageFile: 'originalschoolholds.png' },
    { id: 20, name: 'Screw-on Feet', imageFile: 'screw-onfeet.png' },
    { id: 21, name: 'Wooden Holds', imageFile: 'woodenholds.png' },
    { id: 22, name: 'Wooden Holds B', imageFile: 'woodenholdsb.png' },
    { id: 23, name: 'Wooden Holds C', imageFile: 'woodenholdsc.png' },
  ],
};

// MoonBoard grid configuration (same for all standard layouts)
// 11 columns (A-K) x 18 rows (1-18, bottom to top)
export const MOONBOARD_GRID = {
  columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const,
  rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const,
  numColumns: 11,
  numRows: 18,
};

// MoonBoard only supports 25 and 40 degree angles
export const MOONBOARD_ANGLES = [25, 40] as const;

// MoonBoard has a single fixed size (all boards are same dimensions)
export const MOONBOARD_SIZE = {
  id: 1,
  name: 'Standard',
  description: '11x18 Grid',
  // Image dimensions from decompiled assets
  width: 650,
  height: 1000,
};

// MoonBoard hold states (different color scheme from Aurora)
export const MOONBOARD_HOLD_STATES = {
  start: { name: 'STARTING' as const, color: '#FF0000', displayColor: '#FF3333' }, // Red
  hand: { name: 'HAND' as const, color: '#0000FF', displayColor: '#4444FF' }, // Blue
  finish: { name: 'FINISH' as const, color: '#00FF00', displayColor: '#44FF44' }, // Green
} as const;

// Grid coordinate types
export type MoonBoardColumn = (typeof MOONBOARD_GRID.columns)[number];
export type MoonBoardRow = (typeof MOONBOARD_GRID.rows)[number];
export type MoonBoardCoordinate = `${MoonBoardColumn}${MoonBoardRow}`;

/**
 * Convert a grid coordinate (e.g., "A5", "K18") to a numeric hold ID.
 * IDs range from 1 to 198 (11 columns x 18 rows).
 * ID = (row - 1) * 11 + colIndex + 1
 */
export function coordinateToHoldId(coord: MoonBoardCoordinate): number {
  const col = coord.charAt(0) as MoonBoardColumn;
  const row = parseInt(coord.slice(1), 10) as MoonBoardRow;
  const colIndex = MOONBOARD_GRID.columns.indexOf(col);
  return (row - 1) * MOONBOARD_GRID.numColumns + colIndex + 1;
}

/**
 * Convert a numeric hold ID back to a grid coordinate.
 */
export function holdIdToCoordinate(holdId: number): MoonBoardCoordinate {
  const id = holdId - 1;
  const colIndex = id % MOONBOARD_GRID.numColumns;
  const row = Math.floor(id / MOONBOARD_GRID.numColumns) + 1;
  const col = MOONBOARD_GRID.columns[colIndex];
  return `${col}${row}` as MoonBoardCoordinate;
}

// Grid calibration based on actual hold positions in MoonBoard images
// These margins match the board region detection in the OCR library
const GRID_CALIBRATION = {
  // X margins: the grid doesn't fill the full image width
  leftMargin: 0.1, // 10% left margin
  rightMargin: 0.05, // 5% right margin
  // Y margins: the grid doesn't fill the full image height
  topMargin: 0.06, // 6% top margin
  bottomMargin: 0.04, // 4% bottom margin
};

/**
 * Get the relative position (0-1) for a hold ID on the board.
 * X: 0 = left edge, 1 = right edge
 * Y: 0 = top edge, 1 = bottom edge (SVG coordinate system)
 *
 * Positions are calibrated to match actual hold positions in the MoonBoard images.
 */
export function getGridPosition(holdId: number): { x: number; y: number } {
  const id = holdId - 1;
  const colIndex = id % MOONBOARD_GRID.numColumns;
  const rowIndex = Math.floor(id / MOONBOARD_GRID.numColumns);

  const { leftMargin, rightMargin, topMargin, bottomMargin } = GRID_CALIBRATION;
  const gridWidth = 1 - leftMargin - rightMargin;
  const gridHeight = 1 - topMargin - bottomMargin;

  // X: cell center position within the grid region
  const relativeX = (colIndex + 0.5) / MOONBOARD_GRID.numColumns;
  const x = leftMargin + relativeX * gridWidth;

  // Y: row 1 at bottom (rowIndex 0), row 18 at top (rowIndex 17)
  // In SVG, Y increases downward, so we invert
  const relativeY = 1 - (rowIndex + 0.5) / MOONBOARD_GRID.numRows;
  const y = topMargin + relativeY * gridHeight;

  return { x, y };
}

/**
 * Get layout info by layout ID
 */
export function getLayoutById(layoutId: number) {
  return Object.entries(MOONBOARD_LAYOUTS).find(([, layout]) => layout.id === layoutId);
}

/**
 * Get hold sets for a layout
 */
export function getHoldSetsForLayout(layoutKey: MoonBoardLayoutKey) {
  return MOONBOARD_SETS[layoutKey] || [];
}

/**
 * Get image files for selected set IDs
 */
export function getHoldSetImages(layoutKey: MoonBoardLayoutKey, setIds: number[]): string[] {
  const sets = MOONBOARD_SETS[layoutKey] || [];
  return sets.filter((s) => setIds.includes(s.id)).map((s) => s.imageFile);
}

/**
 * Get MoonBoard details in a format compatible with BoardDetails type.
 * This allows MoonBoard pages to use the same layout structure as Aurora boards.
 */
export function getMoonBoardDetails({
  layout_id,
  set_ids,
}: {
  layout_id: number;
  set_ids: number[];
}) {
  const layoutEntry = getLayoutById(layout_id);
  if (!layoutEntry) {
    throw new Error(`MoonBoard layout not found: ${layout_id}`);
  }

  const [layoutKey, layoutData] = layoutEntry;
  const sets = MOONBOARD_SETS[layoutKey as MoonBoardLayoutKey] || [];
  const selectedSets = sets.filter((s) => set_ids.includes(s.id));

  return {
    board_name: 'moonboard' as const,
    layout_id,
    size_id: MOONBOARD_SIZE.id,
    set_ids,
    layout_name: layoutData.name,
    size_name: MOONBOARD_SIZE.name,
    size_description: MOONBOARD_SIZE.description,
    set_names: selectedSets.map((s) => s.name),
    boardWidth: MOONBOARD_SIZE.width,
    boardHeight: MOONBOARD_SIZE.height,
    supportsMirroring: false,
    // MoonBoard uses grid-based rendering, not edge-based
    edge_left: 0,
    edge_right: MOONBOARD_GRID.numColumns,
    edge_bottom: 0,
    edge_top: MOONBOARD_GRID.numRows,
    // Empty - MoonBoard uses its own renderer
    images_to_holds: {},
    holdsData: [],
  };
}
