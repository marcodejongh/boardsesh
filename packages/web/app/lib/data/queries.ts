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
} from '@/app/lib/db/queries/climbs/product-sizes-data';

const getTableName = (board_name: string, table_name: string) => {
  switch (board_name) {
    case 'tension':
    case 'kilter':
      return `${board_name}_${table_name}`;
    default:
      return `${table_name}`;
  }
};

export type ImageFileNameRow = { image_filename: string };
export type HoldsRow = {
  placement_id: number;
  mirrored_placement_id: number;
  x: number;
  y: number;
};

export type ProductSizeRow = {
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
};

export type LedPlacementRow = {
  id: number;
  position: number;
};

// Collect data for each set_id
export const getBoardDetails = async ({
  board_name,
  layout_id,
  size_id,
  set_ids,
}: Pick<ParsedBoardRouteParameters, 'board_name' | 'layout_id' | 'size_id' | 'set_ids'>): Promise<BoardDetails> => {
  // Get hardcoded size data (eliminates product_sizes query)
  const sizeData = getProductSize(board_name, size_id);
  if (!sizeData) {
    throw new Error('Size dimensions not found');
  }

  // Get hardcoded layout data
  const layoutData = getLayout(board_name, layout_id);

  const imageUrlHoldsMapEntriesPromises = getImageUrlHoldsMapObjectEntries(set_ids, board_name, layout_id, size_id);

  const [ledPlacementsResult, setsResult, ...imgUrlMapEntries] = await Promise.all([
    sql`
        SELECT
            placements.id,
            leds.position
        FROM ${sql.unsafe(getTableName(board_name, 'placements'))} placements
        INNER JOIN ${sql.unsafe(getTableName(board_name, 'leds'))} leds ON placements.hole_id = leds.hole_id
        WHERE placements.layout_id = ${layout_id}
        AND leds.product_size_id = ${size_id}
    `,
    getSets(board_name, layout_id, size_id),
    ...imageUrlHoldsMapEntriesPromises,
  ]);

  const ledPlacements = ledPlacementsResult as LedPlacementRow[];
  const imagesToHolds = Object.fromEntries(imgUrlMapEntries);

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
    ledPlacements: Object.fromEntries(ledPlacements.map(({ id, position }) => [id, position])),
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

function getImageUrlHoldsMapObjectEntries(
  set_ids: SetIdList,
  board_name: string,
  layout_id: number,
  size_id: number,
): Promise<[ImageFileName, HoldTuple[]]>[] {
  return set_ids.map(async (set_id): Promise<[ImageFileName, HoldTuple[]]> => {
    const [imageRowsResult, holdsResult] = await Promise.all([
      sql`
        SELECT image_filename
        FROM ${sql.unsafe(getTableName(board_name, 'product_sizes_layouts_sets'))} product_sizes_layouts_sets
        WHERE layout_id = ${layout_id}
        AND product_size_id = ${size_id}
        AND set_id = ${set_id}
      `,
      sql`
          SELECT 
            placements.id AS placement_id, 
            mirrored_placements.id AS mirrored_placement_id, 
            holes.x, holes.y
          FROM ${sql.unsafe(getTableName(board_name, 'holes'))} holes
          INNER JOIN ${sql.unsafe(getTableName(board_name, 'placements'))} placements ON placements.hole_id = holes.id
          AND placements.set_id = ${set_id}
          AND placements.layout_id = ${layout_id}
          LEFT JOIN ${sql.unsafe(
            getTableName(board_name, 'placements'),
          )} mirrored_placements ON mirrored_placements.hole_id = holes.mirrored_hole_id
          AND mirrored_placements.set_id = ${set_id}
          AND mirrored_placements.layout_id = ${layout_id}
        `,
    ]);

    const imageRows = imageRowsResult as ImageFileNameRow[];
    const holds = holdsResult as HoldsRow[];

    if (imageRows.length === 0) {
      throw new Error(`Could not find set_id ${set_id} for layout_id: ${layout_id} and size_id: ${size_id}`);
    }
    const { image_filename } = imageRows[0];
    if (holds.length === 0) {
      return [image_filename, []];
    }

    return [
      image_filename,
      holds.map((hold) => [
        hold.placement_id, // First position: regular placement ID
        hold.mirrored_placement_id || null, // Second position: mirrored placement ID (or null)
        hold.x, // Third position: x coordinate
        hold.y,
      ]),
    ];
  });
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

export const getSets = async (board_name: BoardName, layout_id: LayoutId, size_id: Size) => {
  const layouts = await sql`
    SELECT sets.id, sets.name
      FROM ${sql.unsafe(getTableName(board_name, 'sets'))} sets
      INNER JOIN ${sql.unsafe(getTableName(board_name, 'product_sizes_layouts_sets'))} psls 
      ON sets.id = psls.set_id
      WHERE psls.product_size_id = ${size_id}
      AND psls.layout_id = ${layout_id}
  `;

  return layouts as SetRow[];
};

