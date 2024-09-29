/**
 * Fetches in server components are cached by default by next.
 * But direct query calls are not, therefore always use the rest api
 * when fetching data in server components, as it will leverage the next cache and be more
 * performant.
 */

import "server-only";
import { sql } from "@/lib/db";

import {
  BoulderProblem,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  SearchRequest,
  SearchRequestPagination,
  HoldTuple,
  BoardDetails,
  ImagesToHolds,
  ImageFileName,
} from "../types";
import { PAGE_LIMIT } from "@/app/components/board-page/constants";
import { HoldRenderData } from "@/app/components/board-renderer/types";
import { getBoardImageDimensions } from "@/app/components/board-renderer/util";
import { SetIdList } from "../board-data";

const getTableName = (board_name: string, table_name: string) => {
  switch (board_name) {
    case "tension":
    case "kilter":
      return `${board_name}_${table_name}`;
    default:
      return `${table_name}`;
  }
};

type ImageFileNameRow = { image_filename: string };
type HoldsRow = { 
  placement_id: number;
  mirrored_placement_id: number;
  x: number;
  y: number;
};

type ProductSizeRow = { 
  edge_left: number; 
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
}

// Collect data for each set_id
export const getBoardDetails = async ({
  board_name,
  layout_id,
  size_id,
  set_ids,
}: ParsedBoardRouteParameters): Promise<BoardDetails> => {
  const imageUrlHoldsMapEntriesPromises = 
    getImageUrlHoldsMapObjectEntries(set_ids, board_name, layout_id, size_id);

  const [ { rows: sizeDimensions }, ...imgUrlMapEntries ] = await Promise.all([
    sql.query<ProductSizeRow>(
      `
    SELECT edge_left, edge_right, edge_bottom, edge_top
    FROM ${getTableName(board_name, "product_sizes")}
    WHERE id = $1
  `,
      [size_id],
    ), ...imageUrlHoldsMapEntriesPromises
  ]);
  const imagesToHolds = Object.fromEntries(imgUrlMapEntries);


  if (sizeDimensions.length === 0) {
    throw new Error("Size dimensions not found");
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
  };
};

export const getBoulderProblem = async (params: ParsedBoardRouteParametersWithUuid): Promise<BoulderProblem> => {
  return (
    await sql.query({
      text: `
        SELECT climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
        climbs.frames, climb_stats.angle, climb_stats.ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
        ROUND(climb_stats.difficulty_average::numeric - climb_stats.display_difficulty::numeric, 2) AS difficulty_error,
        climb_stats.benchmark_difficulty
        FROM ${getTableName(params.board_name, "climbs")} climbs
        LEFT JOIN ${getTableName(params.board_name, "climb_stats")} climb_stats ON climb_stats.climb_uuid = climbs.uuid
        LEFT JOIN ${getTableName(
          params.board_name,
          "difficulty_grades",
        )} dg on dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
        INNER JOIN ${getTableName(params.board_name, "product_sizes")} product_sizes ON product_sizes.id = $1
        WHERE climbs.layout_id = $2
        AND product_sizes.id = $3
        AND climbs.uuid = $4
        AND climb_stats.angle = $5
        AND climbs.frames_count = 1
        limit 1
      `,
      values: [params.size_id, params.layout_id, params.size_id, params.climb_uuid, params.angle],
    })
  ).rows[0];
};

export type SearchBoulderProblemResult = {
  boulderproblems: BoulderProblem[];
  totalCount: number;
};

export const searchBoulderProblems = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
): Promise<SearchBoulderProblemResult> => {
  const allowedSortColumns: Record<SearchRequest["sortBy"], string> = {
    ascents: "ascensionist_count",
    difficulty: "display_difficulty",
    name: "name",
    quality: "quality_average",
  };

  const safeSortBy = allowedSortColumns[searchParams.sortBy] || "ascensionist_count";

  const query = await sql.query({
    text: `
        WITH filtered_climbs AS (
          SELECT
            climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
            climbs.frames, climb_stats.angle, climb_stats.ascensionist_count,
            dg.boulder_name as difficulty,
            ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
            ROUND(climb_stats.difficulty_average::numeric - climb_stats.display_difficulty::numeric, 2) AS difficulty_error,
            climb_stats.benchmark_difficulty
          FROM ${getTableName(params.board_name, "climbs")} climbs
          LEFT JOIN ${getTableName(
            params.board_name,
            "climb_stats",
          )} climb_stats ON climb_stats.climb_uuid = climbs.uuid
          LEFT JOIN ${getTableName(
            params.board_name,
            "difficulty_grades",
          )} dg on dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
          INNER JOIN ${getTableName(params.board_name, "product_sizes")} product_sizes ON product_sizes.id = $1
          WHERE climbs.layout_id = $2
          AND climbs.is_listed = true
          AND climbs.is_draft = false

          -- Ensures only boulder problems are found and not routes
          AND climbs.frames_count = 1
          AND product_sizes.id = $3
          AND climb_stats.angle = $11
          AND climb_stats.ascensionist_count >= $4
          ${
            searchParams.minGrade && searchParams.maxGrade
              ? "AND ROUND(climb_stats.display_difficulty::numeric, 0) BETWEEN $5 AND $6"
              : ""
          }
          AND climb_stats.quality_average >= $7
          AND ABS(ROUND(climb_stats.display_difficulty::numeric, 0) - climb_stats.difficulty_average::numeric) <= $8
        )
        SELECT *, 
        (SELECT COUNT(*) FROM filtered_climbs) as total_count
        FROM filtered_climbs
        ORDER BY ${safeSortBy} ${searchParams.sortOrder === "asc" ? "ASC" : "DESC"}
        LIMIT $9 OFFSET $10
      `,
    values: [
      params.size_id,
      params.layout_id,
      params.size_id,
      searchParams.minAscents,
      searchParams.minGrade,
      searchParams.maxGrade,
      searchParams.minRating,
      searchParams.gradeAccuracy,
      searchParams.pageSize,
      searchParams.page * PAGE_LIMIT,
      params.angle,
    ],
  });

  return {
    boulderproblems: query.rows,
    totalCount: query.rows.length > 0 ? query.rows[0].total_count : 0,
  };
};

function getImageUrlHoldsMapObjectEntries(
  set_ids: SetIdList,
  board_name: string,
  layout_id: number,
  size_id: number,
): Promise<[ImageFileName, HoldTuple[]]>[] {
  return set_ids.map(async (set_id): Promise<[ImageFileName, HoldTuple[]]> => {
    const [{ rows: imageRows }, { rows: holds }] = await Promise.all([
      sql.query<ImageFileNameRow>(
        `
        SELECT image_filename
        FROM ${getTableName(board_name, "product_sizes_layouts_sets")} product_sizes_layouts_sets
        WHERE layout_id = $1
        AND product_size_id = $2
        AND set_id = $3
      `,
        [layout_id, size_id, set_id],
      ),
      sql.query<HoldsRow>(
        `
          SELECT 
            placements.id AS placement_id, 
            mirrored_placements.id AS mirrored_placement_id, 
            holes.x, holes.y
          FROM ${getTableName(board_name, "holes")} holes
          INNER JOIN ${getTableName(board_name, "placements")} placements ON placements.hole_id = holes.id
          AND placements.set_id = $1
          AND placements.layout_id = $2
          LEFT JOIN ${getTableName(
            board_name,
            "placements",
          )} mirrored_placements ON mirrored_placements.hole_id = holes.mirrored_hole_id
          AND mirrored_placements.set_id = $1
          AND mirrored_placements.layout_id = $2
        `,
        [set_id, layout_id],
      ),
    ]);

    if (imageRows.length === 0) {
      throw new Error(`Could not find set_id ${set_id} for layout_id: ${layout_id} and size_id: ${size_id}`);
    }
    const { image_filename } = imageRows[0]
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

