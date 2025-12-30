import { eq, asc, sql } from 'drizzle-orm';
import type { Grade, Angle } from '@boardsesh/shared-schema';
import { db } from '../../../db/client.js';
import * as dbSchema from '@boardsesh/db/schema';
import { validateInput } from '../shared/helpers.js';
import { BoardNameSchema } from '../../../validation/schemas.js';
import {
  getAllLayouts,
  getSizesForLayoutId,
  getSetsForLayoutAndSize,
  getBoardDetails,
  getBoardSelectorOptions,
  type BoardName,
} from '../../../data/index.js';
import { getLedPlacements } from '../../../data/led-placements-data.js';

export const boardQueries = {
  /**
   * Get difficulty grades for a specific board type
   */
  grades: async (_: unknown, { boardName }: { boardName: string }): Promise<Grade[]> => {
    validateInput(BoardNameSchema, boardName, 'boardName');

    // Select the appropriate table based on board name
    const gradesTable = boardName === 'kilter'
      ? dbSchema.kilterDifficultyGrades
      : dbSchema.tensionDifficultyGrades;

    const grades = await db
      .select({
        difficultyId: gradesTable.difficulty,
        name: gradesTable.boulderName,
      })
      .from(gradesTable)
      .where(eq(gradesTable.isListed, true))
      .orderBy(asc(gradesTable.difficulty));

    return grades.map(g => ({
      difficultyId: g.difficultyId,
      name: g.name || '',
    }));
  },

  /**
   * Get available angles for a specific board layout
   */
  angles: async (_: unknown, { boardName, layoutId }: { boardName: string; layoutId: number }): Promise<Angle[]> => {
    validateInput(BoardNameSchema, boardName, 'boardName');

    // Use raw SQL since products_angles tables may have been restructured
    // This query joins layouts to products to get available angles for a layout
    const tableName = boardName === 'kilter' ? 'kilter_products_angles' : 'tension_products_angles';
    const layoutTableName = boardName === 'kilter' ? 'kilter_layouts' : 'tension_layouts';

    const result = await db.execute<{ angle: number }>(sql`
      SELECT DISTINCT pa.angle
      FROM ${sql.identifier(tableName)} pa
      JOIN ${sql.identifier(layoutTableName)} l
        ON l.product_id = pa.product_id
      WHERE l.id = ${layoutId}
      ORDER BY pa.angle ASC
    `);

    // Handle both possible return types from execute
    const rows = Array.isArray(result) ? result : (result as { rows: { angle: number }[] }).rows;
    return rows.map(r => ({ angle: r.angle }));
  },

  /**
   * Get all layouts for a board type
   */
  layouts: (_: unknown, { boardName }: { boardName: string }) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    return getAllLayouts(boardName as BoardName);
  },

  /**
   * Get all sizes for a layout
   */
  sizesForLayout: (_: unknown, { boardName, layoutId }: { boardName: string; layoutId: number }) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    return getSizesForLayoutId(boardName as BoardName, layoutId);
  },

  /**
   * Get all sets for a layout and size combination
   */
  setsForLayoutAndSize: (_: unknown, { boardName, layoutId, sizeId }: { boardName: string; layoutId: number; sizeId: number }) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    return getSetsForLayoutAndSize(boardName as BoardName, layoutId, sizeId);
  },

  /**
   * Get complete board details for rendering
   */
  boardDetails: (_: unknown, { boardName, layoutId, sizeId, setIds }: { boardName: string; layoutId: number; sizeId: number; setIds: number[] }) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    try {
      const details = getBoardDetails({
        board_name: boardName as BoardName,
        layout_id: layoutId,
        size_id: sizeId,
        set_ids: setIds,
      });

      return {
        boardName: details.board_name,
        layoutId: details.layout_id,
        sizeId: details.size_id,
        setIds: details.set_ids,
        edgeLeft: details.edge_left,
        edgeRight: details.edge_right,
        edgeBottom: details.edge_bottom,
        edgeTop: details.edge_top,
        boardWidth: details.boardWidth,
        boardHeight: details.boardHeight,
        supportsMirroring: details.supportsMirroring ?? false,
        layoutName: details.layout_name,
        sizeName: details.size_name,
        sizeDescription: details.size_description,
        setNames: details.set_names ?? [],
        imagesToHolds: details.images_to_holds,
        holdsData: details.holdsData,
      };
    } catch {
      return null;
    }
  },

  /**
   * Get LED placements for Bluetooth board control
   */
  ledPlacements: (_: unknown, { boardName, layoutId, sizeId }: { boardName: string; layoutId: number; sizeId: number }) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    const placements = getLedPlacements(boardName as BoardName, layoutId, sizeId);
    return { placements };
  },

  /**
   * Get all board selector options for the setup wizard
   */
  boardSelectorOptions: () => {
    return getBoardSelectorOptions();
  },
};
