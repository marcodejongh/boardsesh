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
      .replace(/^(kilter|tension)\s+board\s+/i, '') // Remove board name prefix
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

  // Parse slug - may be "10x12" or "10x12-full-ride"
  const dimensionMatch = slug.match(/^(\d+x\d+)(?:-(.+))?$/i);

  if (dimensionMatch) {
    const dimensions = dimensionMatch[1].toLowerCase();
    const descSuffix = dimensionMatch[2]; // e.g., "full-ride" or undefined

    const size = rows.find((s) => {
      const sizeMatch = s.name.match(/(\d+)\s*x\s*(\d+)/i);
      if (!sizeMatch) return false;

      const sizeDimensions = `${sizeMatch[1]}x${sizeMatch[2]}`.toLowerCase();
      if (sizeDimensions !== dimensions) return false;

      // If slug has description suffix, match against description
      if (descSuffix && s.description) {
        const descSlug = s.description
          .toLowerCase()
          .replace(/led\s*kit/gi, '') // Remove "LED Kit" suffix
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        return descSlug === descSuffix;
      }

      // No suffix - default to "Full Ride" variant for backward compat
      // or first size if no description contains "full ride"
      if (!descSuffix) {
        const descLower = (s.description || '').toLowerCase();
        return descLower.includes('full ride') || !s.description;
      }

      return false;
    });

    if (size) return size;

    // If no "Full Ride" found with backward compat, try to match first size with dimensions
    if (!descSuffix) {
      const fallbackSize = rows.find((s) => {
        const sizeMatch = s.name.match(/(\d+)\s*x\s*(\d+)/i);
        if (!sizeMatch) return false;
        const sizeDimensions = `${sizeMatch[1]}x${sizeMatch[2]}`.toLowerCase();
        return sizeDimensions === dimensions;
      });
      if (fallbackSize) return fallbackSize;
    }
  }

  // Fallback to general slug matching
  const size = rows.find((s) => {
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
