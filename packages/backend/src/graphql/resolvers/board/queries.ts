import { eq, asc, sql } from 'drizzle-orm';
import type { Grade, Angle } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { validateInput } from '../shared/helpers';
import { BoardNameSchema } from '../../../validation/schemas';

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
};
