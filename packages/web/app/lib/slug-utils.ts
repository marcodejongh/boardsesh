import { dbz } from '@/app/lib/db/db';
import { BoardName, LayoutId, Size } from '@/app/lib/types';
import { matchSetNameToSlugParts } from './slug-matching';
import { UNIFIED_TABLES } from '@/app/lib/db/queries/util/table-select';
import { eq, and, isNull } from 'drizzle-orm';

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

// Reverse lookup functions for slug to ID conversion
export const getLayoutBySlug = async (board_name: BoardName, slug: string): Promise<LayoutRow | null> => {
  const { layouts } = UNIFIED_TABLES;

  const rows = await dbz
    .select({ id: layouts.id, name: layouts.name })
    .from(layouts)
    .where(and(eq(layouts.boardType, board_name), eq(layouts.isListed, true), isNull(layouts.password)));

  const layout = rows.find((l) => {
    if (!l.name) return false;
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

  if (!layout || !layout.name) return null;
  return { id: layout.id, name: layout.name };
};

export const getSizeBySlug = async (
  board_name: BoardName,
  layout_id: LayoutId,
  slug: string,
): Promise<SizeRow | null> => {
  const { productSizes, layouts } = UNIFIED_TABLES;

  const rows = await dbz
    .select({
      id: productSizes.id,
      name: productSizes.name,
      description: productSizes.description,
    })
    .from(productSizes)
    .innerJoin(
      layouts,
      and(
        eq(productSizes.boardType, layouts.boardType),
        eq(productSizes.productId, layouts.productId),
      ),
    )
    .where(and(eq(layouts.boardType, board_name), eq(layouts.id, layout_id)));

  // Parse slug - may be "10x12" or "10x12-full-ride"
  const dimensionMatch = slug.match(/^(\d+x\d+)(?:-(.+))?$/i);

  if (dimensionMatch) {
    const dimensions = dimensionMatch[1].toLowerCase();
    const descSuffix = dimensionMatch[2]; // e.g., "full-ride" or undefined

    const size = rows.find((s) => {
      if (!s.name) return false;
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

    if (size && size.name) {
      return { id: size.id, name: size.name, description: size.description || '' };
    }

    // If no "Full Ride" found with backward compat, try to match first size with dimensions
    if (!descSuffix) {
      const fallbackSize = rows.find((s) => {
        if (!s.name) return false;
        const sizeMatch = s.name.match(/(\d+)\s*x\s*(\d+)/i);
        if (!sizeMatch) return false;
        const sizeDimensions = `${sizeMatch[1]}x${sizeMatch[2]}`.toLowerCase();
        return sizeDimensions === dimensions;
      });
      if (fallbackSize && fallbackSize.name) {
        return { id: fallbackSize.id, name: fallbackSize.name, description: fallbackSize.description || '' };
      }
    }
  }

  // Fallback to general slug matching
  const size = rows.find((s) => {
    if (!s.name) return false;
    const sizeSlug = s.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return sizeSlug === slug;
  });

  if (!size || !size.name) return null;
  return { id: size.id, name: size.name, description: size.description || '' };
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
  const { sets, productSizesLayoutsSets } = UNIFIED_TABLES;

  const rows = await dbz
    .select({ id: sets.id, name: sets.name })
    .from(sets)
    .innerJoin(
      productSizesLayoutsSets,
      and(
        eq(sets.boardType, productSizesLayoutsSets.boardType),
        eq(sets.id, productSizesLayoutsSets.setId),
      ),
    )
    .where(
      and(
        eq(productSizesLayoutsSets.boardType, board_name),
        eq(productSizesLayoutsSets.productSizeId, size_id),
        eq(productSizesLayoutsSets.layoutId, layout_id),
      ),
    );

  // Parse the slug to get individual set names
  const slugParts = slug.split('_');
  const matchingSets = rows
    .filter((s): s is typeof s & { name: string } => s.name !== null && matchSetNameToSlugParts(s.name, slugParts))
    .map((s) => ({ id: s.id, name: s.name }));

  return matchingSets;
};
