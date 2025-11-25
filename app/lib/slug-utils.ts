import { sql } from '@/app/lib/db/db';
import { BoardName, LayoutId, Size } from '@/app/lib/types';

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
  const slugParts = slug.split('_'); // Split by underscore now
  const matchingSets = rows.filter((s) => {
    const lowercaseName = s.name.toLowerCase().trim();

    // Handle homewall-specific set names (supports both "Auxiliary/Mainline" and "Aux/Main" variants)
    const hasAux = lowercaseName.includes('auxiliary') || lowercaseName.includes('aux');
    const hasMain = lowercaseName.includes('mainline') || lowercaseName.includes('main');
    const hasKickboard = lowercaseName.includes('kickboard');

    // Match aux-kicker: sets with aux/auxiliary AND kickboard
    if (hasAux && hasKickboard && slugParts.includes('aux-kicker')) {
      return true;
    }
    // Match main-kicker: sets with main/mainline AND kickboard
    if (hasMain && hasKickboard && slugParts.includes('main-kicker')) {
      return true;
    }
    // Match aux: sets with aux/auxiliary but NOT kickboard
    if (hasAux && !hasKickboard && slugParts.includes('aux')) {
      return true;
    }
    // Match main: sets with main/mainline but NOT kickboard
    if (hasMain && !hasKickboard && slugParts.includes('main')) {
      return true;
    }

    // Handle original kilter/tension set names
    const setSlug = lowercaseName
      .replace(/\s+ons?$/i, '') // Remove "on" or "ons" suffix
      .replace(/^(bolt|screw).*/, '$1') // Extract just "bolt" or "screw"
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
    return slugParts.includes(setSlug);
  });

  return matchingSets;
};
