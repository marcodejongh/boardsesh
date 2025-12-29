/**
 * Fetches in server components are cached by default by next.
 * But direct query calls are not, therefore always use the rest api
 * when fetching data in server components, as it will leverage the next cache and be more
 * performant.
 */
import 'server-only';
import { sql } from '@/app/lib/db/db';

import {
  Climb,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  HoldTuple,
  BoardDetails,
  ImageFileName,
  BoardName,
  LayoutId,
  Size,
} from '../types';
import { HoldRenderData } from '@/app/components/board-renderer/types';
import { getBoardImageDimensions } from '@/app/components/board-renderer/util';
import { SetIdList } from '../board-data';
import {
  getProductSize,
  getLayout,
  getSizesForLayoutId,
  getAllLayouts,
  getSetsForLayoutAndSize,
  getImageFilename,
  getLedPlacements,
  getHolePlacements,
} from '@/app/lib/__generated__/product-sizes-data';

const getTableName = (board_name: string, table_name: string) => {
  switch (board_name) {
    case 'tension':
    case 'kilter':
      return `${board_name}_${table_name}`;
    default:
      return `${table_name}`;
  }
};

// Note: The following types were previously used for database queries
// but are no longer needed now that board details use hardcoded data.
// Keeping ProductSizeRow for potential backwards compatibility.
export type ProductSizeRow = {
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
};

// Collect data for each set_id - now fully synchronous using hardcoded data
export const getBoardDetails = ({
  board_name,
  layout_id,
  size_id,
  set_ids,
}: Pick<ParsedBoardRouteParameters, 'board_name' | 'layout_id' | 'size_id' | 'set_ids'>): BoardDetails => {
  // Get hardcoded size data (eliminates product_sizes query)
  const sizeData = getProductSize(board_name, size_id);
  if (!sizeData) {
    throw new Error('Size dimensions not found');
  }

  // Get hardcoded layout data
  const layoutData = getLayout(board_name, layout_id);

  // Get sets from hardcoded data (no DB query needed)
  const setsResult = getSets(board_name, layout_id, size_id);

  // Get LED placements from hardcoded data (no DB query needed)
  const ledPlacements = getLedPlacements(board_name, layout_id, size_id);

  // Get image filenames and hold placements from hardcoded data (no DB query needed)
  const imagesToHolds = getImageUrlHoldsMap(set_ids, board_name, layout_id, size_id);

  const { edgeLeft: edge_left, edgeRight: edge_right, edgeBottom: edge_bottom, edgeTop: edge_top } = sizeData;

  const { width: boardWidth, height: boardHeight } = getBoardImageDimensions(board_name, Object.keys(imagesToHolds)[0]);
  const xSpacing = boardWidth / (edge_right - edge_left);
  const ySpacing = boardHeight / (edge_top - edge_bottom);

  const holdsData: HoldRenderData[] = Object.values<HoldTuple[]>(imagesToHolds).flatMap((holds) =>
    holds
      .filter(([, , x, y]) => x > edge_left && x < edge_right && y > edge_bottom && y < edge_top)
      .map(([holdId, mirroredHoldId, x, y]) => ({
        id: holdId,
        mirroredHoldId,
        cx: (x - edge_left) * xSpacing,
        cy: boardHeight - (y - edge_bottom) * ySpacing,
        r: xSpacing * 4,
      })),
  );

  const selectedSets = setsResult.filter((s) => set_ids.includes(s.id));

  return {
    images_to_holds: imagesToHolds,
    holdsData,
    edge_left,
    edge_right,
    edge_bottom,
    edge_top,
    boardHeight,
    boardWidth,
    board_name,
    layout_id,
    size_id,
    set_ids,
    ledPlacements,
    supportsMirroring: board_name === 'tension' && layout_id !== 11,
    // From hardcoded data
    layout_name: layoutData?.name,
    size_name: sizeData.name,
    size_description: sizeData.description,
    set_names: selectedSets.map((s) => s.name),
  };
};

export const getClimb = async (params: ParsedBoardRouteParametersWithUuid): Promise<Climb> => {
  const result = await sql`
        SELECT climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
        climbs.frames, COALESCE(climb_stats.angle, ${params.angle}) as angle, COALESCE(climb_stats.ascensionist_count, 0) as ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
        ROUND(climb_stats.difficulty_average::numeric - climb_stats.display_difficulty::numeric, 2) AS difficulty_error,
        climb_stats.benchmark_difficulty
        FROM ${sql.unsafe(getTableName(params.board_name, 'climbs'))} climbs
        LEFT JOIN ${sql.unsafe(getTableName(params.board_name, 'climb_stats'))} climb_stats ON climb_stats.climb_uuid = climbs.uuid AND climb_stats.angle = ${params.angle}
        LEFT JOIN ${sql.unsafe(
          getTableName(params.board_name, 'difficulty_grades'),
        )} dg on dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
        INNER JOIN ${sql.unsafe(getTableName(params.board_name, 'product_sizes'))} product_sizes ON product_sizes.id = ${params.size_id}
        WHERE climbs.layout_id = ${params.layout_id}
        AND product_sizes.id = ${params.size_id}
        AND climbs.uuid = ${params.climb_uuid}
        AND climbs.frames_count = 1
        limit 1
      `;
  return result[0] as Climb;
};

export interface ClimbStatsForAngle {
  angle: number;
  ascensionist_count: string; // comes as string from DB
  quality_average: string | null; // comes as string from DB
  difficulty_average: number | null;
  display_difficulty: number | null;
  fa_username: string | null;
  fa_at: string | null;
  difficulty: string | null;
}

export const getClimbStatsForAllAngles = async (
  params: ParsedBoardRouteParametersWithUuid
): Promise<ClimbStatsForAngle[]> => {
  const result = await sql`
    SELECT 
      climb_stats.angle,
      COALESCE(climb_stats.ascensionist_count, 0) as ascensionist_count,
      ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
      climb_stats.difficulty_average,
      climb_stats.display_difficulty,
      climb_stats.fa_username,
      climb_stats.fa_at,
      dg.boulder_name as difficulty
    FROM ${sql.unsafe(getTableName(params.board_name, 'climb_stats'))} climb_stats
    LEFT JOIN ${sql.unsafe(
      getTableName(params.board_name, 'difficulty_grades'),
    )} dg on dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
    WHERE climb_stats.climb_uuid = ${params.climb_uuid}
    ORDER BY climb_stats.angle ASC
  `;
  return result as ClimbStatsForAngle[];
};

/**
 * Get image URL to holds mapping from hardcoded data (no database query).
 * Returns a Record mapping image filenames to arrays of HoldTuples.
 */
function getImageUrlHoldsMap(
  set_ids: SetIdList,
  board_name: BoardName,
  layout_id: number,
  size_id: number,
): Record<ImageFileName, HoldTuple[]> {
  const result: Record<ImageFileName, HoldTuple[]> = {};

  for (const set_id of set_ids) {
    // Get image filename from hardcoded data
    const imageFilename = getImageFilename(board_name, layout_id, size_id, set_id);
    if (!imageFilename) {
      throw new Error(`Could not find image for set_id ${set_id} for layout_id: ${layout_id} and size_id: ${size_id}`);
    }

    // Get hole placements from hardcoded data
    const holds = getHolePlacements(board_name, layout_id, set_id);

    result[imageFilename] = holds;
  }

  return result;
}

export type LayoutRow = {
  id: number;
  name: string;
};

export const getLayouts = (board_name: BoardName): LayoutRow[] => {
  // Use hardcoded data instead of database query
  const layouts = getAllLayouts(board_name);
  return layouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
  }));
};

export type SizeRow = {
  id: number;
  name: string;
  description: string;
};

export const getSizes = (board_name: BoardName, layout_id: LayoutId): SizeRow[] => {
  // Use hardcoded data instead of database query
  const sizes = getSizesForLayoutId(board_name, layout_id);
  return sizes.map((size) => ({
    id: size.id,
    name: size.name,
    description: size.description,
  }));
};

export type SetRow = {
  id: number;
  name: string;
};

export const getSets = (board_name: BoardName, layout_id: LayoutId, size_id: Size): SetRow[] => {
  // Use hardcoded data instead of database query
  return getSetsForLayoutAndSize(board_name, layout_id, size_id);
};

