/**
 * Fetches in server components are cached by default by next.
 * But direct query calls are not, therefore always use the rest api
 * when fetching data in server components, as it will leverage the next cache and be more
 * performant.
 */
import 'server-only';
import { sql } from '@/app/lib/db/db';

import { Climb, ParsedBoardRouteParametersWithUuid, BoardName, LayoutId, Size } from '../types';
import {
  getSizesForLayoutId,
  getAllLayouts,
  getSetsForLayoutAndSize,
  getSizeEdges,
} from '@/app/lib/__generated__/product-sizes-data';

export const getClimb = async (params: ParsedBoardRouteParametersWithUuid): Promise<Climb> => {
  // MoonBoard uses grid-based rendering with a fixed size, so it has no entries in PRODUCT_SIZES.
  // Skip the size edges validation for MoonBoard.
  if (params.board_name !== 'moonboard') {
    const sizeEdges = getSizeEdges(params.board_name, params.size_id);
    if (!sizeEdges) {
      throw new Error(`Invalid size_id ${params.size_id} for board ${params.board_name}`);
    }
  }

  const result = await sql`
        SELECT climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
        climbs.frames, COALESCE(climb_stats.angle, ${params.angle}) as angle, COALESCE(climb_stats.ascensionist_count, 0) as ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
        ROUND(climb_stats.difficulty_average::numeric - climb_stats.display_difficulty::numeric, 2) AS difficulty_error,
        climb_stats.benchmark_difficulty
        FROM board_climbs climbs
        LEFT JOIN board_climb_stats climb_stats
          ON climb_stats.climb_uuid = climbs.uuid
          AND climb_stats.angle = ${params.angle}
          AND climb_stats.board_type = ${params.board_name}
        LEFT JOIN board_difficulty_grades dg
          ON dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
          AND dg.board_type = ${params.board_name}
        WHERE climbs.board_type = ${params.board_name}
        AND climbs.layout_id = ${params.layout_id}
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
    FROM board_climb_stats climb_stats
    LEFT JOIN board_difficulty_grades dg
      ON dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
      AND dg.board_type = ${params.board_name}
    WHERE climb_stats.board_type = ${params.board_name}
    AND climb_stats.climb_uuid = ${params.climb_uuid}
    ORDER BY climb_stats.angle ASC
  `;
  return result as ClimbStatsForAngle[];
};

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

