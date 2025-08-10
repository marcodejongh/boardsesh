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
}: ParsedBoardRouteParameters): Promise<BoardDetails> => {
  const imageUrlHoldsMapEntriesPromises = getImageUrlHoldsMapObjectEntries(set_ids, board_name, layout_id, size_id);

  const [ledPlacementsResult, sizeDimensionsResult, ...imgUrlMapEntries] = await Promise.all([
    sql`
        SELECT 
            placements.id,
            leds.position
        FROM ${sql.unsafe(getTableName(board_name, 'placements'))} placements
        INNER JOIN ${sql.unsafe(getTableName(board_name, 'leds'))} leds ON placements.hole_id = leds.hole_id
        WHERE placements.layout_id = ${layout_id}
        AND leds.product_size_id = ${size_id}
    `,
    sql`
    SELECT edge_left, edge_right, edge_bottom, edge_top
    FROM ${sql.unsafe(getTableName(board_name, 'product_sizes'))}
    WHERE id = ${size_id}
    `,
    ...imageUrlHoldsMapEntriesPromises,
  ]);

  const ledPlacements = ledPlacementsResult as LedPlacementRow[];
  const sizeDimensions = sizeDimensionsResult as ProductSizeRow[];
  const imagesToHolds = Object.fromEntries(imgUrlMapEntries);

  if (sizeDimensions.length === 0) {
    throw new Error('Size dimensions not found');
  }

  const { width: boardWidth, height: boardHeight } = getBoardImageDimensions(board_name, Object.keys(imagesToHolds)[0]);
  const { edge_left, edge_right, edge_bottom, edge_top } = sizeDimensions[0];
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

  // Fetch names for slug-based URLs
  const [layouts, sizes, sets] = await Promise.all([
    getLayouts(board_name),
    getSizes(board_name, layout_id),
    getSets(board_name, layout_id, size_id),
  ]);

  const layout = layouts.find((l) => l.id === layout_id);
  const size = sizes.find((s) => s.id === size_id);
  const selectedSets = sets.filter((s) => set_ids.includes(s.id));

  return {
    images_to_holds: imagesToHolds,
    holdsData,
    edge_left: sizeDimensions[0].edge_left,
    edge_right: sizeDimensions[0].edge_right,
    edge_bottom: sizeDimensions[0].edge_bottom,
    edge_top: sizeDimensions[0].edge_top,
    boardHeight,
    boardWidth,
    board_name,
    layout_id,
    size_id,
    set_ids,
    ledPlacements: Object.fromEntries(ledPlacements.map(({ id, position }) => [id, position])),
    supportsMirroring: board_name === 'tension' && layout_id !== 11,
    // Added for slug-based URLs
    layout_name: layout?.name,
    size_name: size?.name,
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
  ascensionist_count: number;
  quality_average: number | null;
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

export const getLayouts = async (board_name: BoardName) => {
  const layouts = await sql`
    SELECT id, name
    FROM ${sql.unsafe(getTableName(board_name, 'layouts'))} layouts
    WHERE is_listed = true
    AND password IS NULL
  `;
  return layouts as LayoutRow[];
};

export type SizeRow = {
  id: number;
  name: string;
  description: string;
};

export const getSizes = async (board_name: BoardName, layout_id: LayoutId) => {
  const layouts = await sql`
    SELECT product_sizes.id, product_sizes.name, product_sizes.description
    FROM ${sql.unsafe(getTableName(board_name, 'product_sizes'))} product_sizes
    INNER JOIN ${sql.unsafe(getTableName(board_name, 'layouts'))} layouts ON product_sizes.product_id = layouts.product_id
    WHERE layouts.id = ${layout_id}
  `;
  return layouts as SizeRow[];
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

export type BoardSelectorOptions = {
  layouts: Record<BoardName, LayoutRow[]>;
  sizes: Record<string, SizeRow[]>;
  sets: Record<string, SetRow[]>;
};

export const getAllBoardSelectorOptions = async (): Promise<BoardSelectorOptions> => {
  // Single query to get all layouts, sizes, and sets for all boards
  /*
    WITH board_data AS (
      SELECT 
        $1::text as board_name,
        'layouts' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        layouts.id,
        layouts.name,
        null::text as description
      FROM ${getTableName('kilter', 'layouts')} layouts
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        $1::text as board_name,
        'sizes' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        sizes.id,
        sizes.name,
        sizes.description
      FROM ${getTableName('kilter', 'product_sizes')} sizes
      INNER JOIN ${getTableName('kilter', 'layouts')} layouts ON sizes.product_id = layouts.product_id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        $1::text as board_name,
        'sets' as type,
        psls.product_size_id::text as parent_id,
        psls.layout_id::text as grandparent_id,
        sets.id,
        sets.name,
        null::text as description
      FROM ${getTableName('kilter', 'sets')} sets
      INNER JOIN ${getTableName('kilter', 'product_sizes_layouts_sets')} psls 
        ON psls.set_id = sets.id
      INNER JOIN ${getTableName('kilter', 'layouts')} layouts ON psls.layout_id = layouts.id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        $2::text as board_name,
        'layouts' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        layouts.id,
        layouts.name,
        null::text as description
      FROM ${getTableName('tension', 'layouts')} layouts
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        $2::text as board_name,
        'sizes' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        sizes.id,
        sizes.name,
        sizes.description
      FROM ${getTableName('tension', 'product_sizes')} sizes
      INNER JOIN ${getTableName('tension', 'layouts')} layouts ON sizes.product_id = layouts.product_id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        $2::text as board_name,
        'sets' as type,
        psls.product_size_id::text as parent_id,
        psls.layout_id::text as grandparent_id,
        sets.id,
        sets.name,
        null::text as description
      FROM ${getTableName('tension', 'sets')} sets
      INNER JOIN ${getTableName('tension', 'product_sizes_layouts_sets')} psls 
        ON psls.set_id = sets.id
      INNER JOIN ${getTableName('tension', 'layouts')} layouts ON psls.layout_id = layouts.id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
    )
    SELECT 
      board_name,
      type,
      parent_id,
      grandparent_id,
      id,
      name,
      description
    FROM board_data
    ORDER BY board_name, type, parent_id, grandparent_id, name;
  */

  const rows = (await sql`
    WITH board_data AS (
      SELECT 
        ${'kilter'}::text as board_name,
        'layouts' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        layouts.id,
        layouts.name,
        null::text as description
      FROM ${sql.unsafe(getTableName('kilter', 'layouts'))} layouts
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        ${'kilter'}::text as board_name,
        'sizes' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        sizes.id,
        sizes.name,
        sizes.description
      FROM ${sql.unsafe(getTableName('kilter', 'product_sizes'))} sizes
      INNER JOIN ${sql.unsafe(getTableName('kilter', 'layouts'))} layouts ON sizes.product_id = layouts.product_id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        ${'kilter'}::text as board_name,
        'sets' as type,
        psls.product_size_id::text as parent_id,
        psls.layout_id::text as grandparent_id,
        sets.id,
        sets.name,
        null::text as description
      FROM ${sql.unsafe(getTableName('kilter', 'sets'))} sets
      INNER JOIN ${sql.unsafe(getTableName('kilter', 'product_sizes_layouts_sets'))} psls 
        ON psls.set_id = sets.id
      INNER JOIN ${sql.unsafe(getTableName('kilter', 'layouts'))} layouts ON psls.layout_id = layouts.id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        ${'tension'}::text as board_name,
        'layouts' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        layouts.id,
        layouts.name,
        null::text as description
      FROM ${sql.unsafe(getTableName('tension', 'layouts'))} layouts
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        ${'tension'}::text as board_name,
        'sizes' as type,
        layouts.id::text as parent_id,
        null::text as grandparent_id,
        sizes.id,
        sizes.name,
        sizes.description
      FROM ${sql.unsafe(getTableName('tension', 'product_sizes'))} sizes
      INNER JOIN ${sql.unsafe(getTableName('tension', 'layouts'))} layouts ON sizes.product_id = layouts.product_id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
      
      UNION ALL
      
      SELECT 
        ${'tension'}::text as board_name,
        'sets' as type,
        psls.product_size_id::text as parent_id,
        psls.layout_id::text as grandparent_id,
        sets.id,
        sets.name,
        null::text as description
      FROM ${sql.unsafe(getTableName('tension', 'sets'))} sets
      INNER JOIN ${sql.unsafe(getTableName('tension', 'product_sizes_layouts_sets'))} psls 
        ON psls.set_id = sets.id
      INNER JOIN ${sql.unsafe(getTableName('tension', 'layouts'))} layouts ON psls.layout_id = layouts.id
      WHERE layouts.is_listed = true AND layouts.password IS NULL
    )
    SELECT 
      board_name,
      type,
      parent_id,
      grandparent_id,
      id,
      name,
      description
    FROM board_data
    ORDER BY board_name, type, parent_id, grandparent_id, name
  `) as {
    board_name: BoardName;
    type: 'layouts' | 'sizes' | 'sets';
    parent_id: string | null;
    grandparent_id: string | null;
    id: number;
    name: string;
    description: string | null;
  }[];

  const result: BoardSelectorOptions = {
    layouts: {} as Record<BoardName, LayoutRow[]>,
    sizes: {},
    sets: {},
  };

  // Process the results
  for (const row of rows) {
    if (row.type === 'layouts') {
      if (!result.layouts[row.board_name]) {
        result.layouts[row.board_name] = [];
      }
      result.layouts[row.board_name].push({
        id: row.id,
        name: row.name,
      });
    } else if (row.type === 'sizes') {
      const key = `${row.board_name}-${row.parent_id}`;
      if (!result.sizes[key]) {
        result.sizes[key] = [];
      }
      result.sizes[key].push({
        id: row.id,
        name: row.name,
        description: row.description || '',
      });
    } else if (row.type === 'sets') {
      const key = `${row.board_name}-${row.grandparent_id}-${row.parent_id}`;
      if (!result.sets[key]) {
        result.sets[key] = [];
      }
      result.sets[key].push({
        id: row.id,
        name: row.name,
      });
    }
  }

  return result;
};
