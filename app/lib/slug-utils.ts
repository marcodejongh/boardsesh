import { sql } from '@/app/lib/db/db';
import { BoardName, LayoutId, Size } from '@/app/lib/types';
import { matchSetNameToSlugParts } from './slug-matching';

// Re-export for backwards compatibility
export { matchSetNameToSlugParts } from './slug-matching';

export type LayoutRow = {
  id: number;
  name: string;
};

export type SizeRow = {
  id: number;
  name: string;
  description: string;
};

export type SetRow = {
  id: number;
  name: string;
};

const getTableName = (board_name: string, table_name: string) => {
  switch (board_name) {
    case 'tension':
    case 'kilter':
      return `${board_name}_${table_name}`;
    default:
      return `${table_name}`;
  }
};

// Reverse lookup functions for slug to ID conversion
export const getLayoutBySlug = async (board_name: BoardName, slug: string): Promise<LayoutRow | null> => {
  const rows = (await sql`
    SELECT id, name
    FROM ${sql.unsafe(getTableName(board_name, 'layouts'))} layouts
    WHERE is_listed = true
    AND password IS NULL
  `) as LayoutRow[];

  const layout = rows.find((l) => {
    const baseSlug = l.name
      .toLowerCase()
      .trim()
      .replace(/^(kilter|tension|decoy)\s+board\s+/i, '') // Remove board name prefix
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    let layoutSlug = baseSlug;

    // Handle Tension board specific cases
    if (baseSlug === 'original-layout') {
      layoutSlug = 'original';
    }

    // Replace numbers with words for better readability
    if (baseSlug.startsWith('2-')) {
      layoutSlug = baseSlug.replace('2-', 'two-');
    }

    return layoutSlug === slug;
  });

  return layout || null;
};

export const getSizeBySlug = async (
  board_name: BoardName,
  layout_id: LayoutId,
  slug: string,
): Promise<SizeRow | null> => {
  const rows = (await sql`
    SELECT product_sizes.id, product_sizes.name, product_sizes.description
    FROM ${sql.unsafe(getTableName(board_name, 'product_sizes'))} product_sizes
    INNER JOIN ${sql.unsafe(getTableName(board_name, 'layouts'))} layouts ON product_sizes.product_id = layouts.product_id
    WHERE layouts.id = ${layout_id}
  `) as SizeRow[];

  const size = rows.find((s) => {
    // Try to match size dimensions first (e.g., "12x12" matches "12 x 12 Commercial")
    const sizeMatch = s.name.match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      const expectedSlug = `${sizeMatch[1]}x${sizeMatch[2]}`;
      if (expectedSlug === slug) return true;
    }

    // Fallback to general slug matching
    const sizeSlug = s.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return sizeSlug === slug;
  });

  return size || null;
};

/**
 * Parses a combined set slug and returns matching sets from the database.
 *
 * @param board_name - The board type (kilter, tension, etc.)
 * @param layout_id - The layout ID
 * @param size_id - The size ID
 * @param slug - The combined slug (e.g., 'main-kicker_main_aux-kicker_aux')
 * @returns Array of matching sets
 */
export const getSetsBySlug = async (
  board_name: BoardName,
  layout_id: LayoutId,
  size_id: Size,
  slug: string,
): Promise<SetRow[]> => {
  const rows = (await sql`
    SELECT sets.id, sets.name
      FROM ${sql.unsafe(getTableName(board_name, 'sets'))} sets
      INNER JOIN ${sql.unsafe(getTableName(board_name, 'product_sizes_layouts_sets'))} psls
      ON sets.id = psls.set_id
      WHERE psls.product_size_id = ${size_id}
      AND psls.layout_id = ${layout_id}
  `) as SetRow[];

  // Parse the slug to get individual set names
  const slugParts = slug.split('_');
  const matchingSets = rows.filter((s) => matchSetNameToSlugParts(s.name, slugParts));

  return matchingSets;
};
