import { sql } from '@/app/lib/db/db';
import { BoardName, LayoutId, Size } from '@/app/lib/types';

export type LayoutRow = {
  id: number;
  name: string;
  slug: string;
};

export type SizeRow = {
  id: number;
  name: string;
  description: string;
  slug: string;
};

export type SetRow = {
  id: number;
  name: string;
  slug: string;
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
    SELECT id, name, slug
    FROM ${sql.unsafe(getTableName(board_name, 'layouts'))} layouts
    WHERE is_listed = true
    AND password IS NULL
    AND slug = ${slug}
  `) as LayoutRow[];

  return rows[0] || null;
};

export const getSizeBySlug = async (
  board_name: BoardName,
  layout_id: LayoutId,
  slug: string,
): Promise<SizeRow | null> => {
  const rows = (await sql`
    SELECT product_sizes.id, product_sizes.name, product_sizes.description, product_sizes.slug
    FROM ${sql.unsafe(getTableName(board_name, 'product_sizes'))} product_sizes
    INNER JOIN ${sql.unsafe(getTableName(board_name, 'layouts'))} layouts ON product_sizes.product_id = layouts.product_id
    WHERE layouts.id = ${layout_id}
    AND product_sizes.slug = ${slug}
  `) as SizeRow[];

  return rows[0] || null;
};

export const getSetsBySlug = async (
  board_name: BoardName,
  layout_id: LayoutId,
  size_id: Size,
  slug: string,
): Promise<SetRow[]> => {
  // Parse the slug to get individual set slugs
  const slugParts = slug.split('_'); // Split by underscore
  
  const rows = (await sql`
    SELECT sets.id, sets.name, sets.slug
      FROM ${sql.unsafe(getTableName(board_name, 'sets'))} sets
      INNER JOIN ${sql.unsafe(getTableName(board_name, 'product_sizes_layouts_sets'))} psls 
      ON sets.id = psls.set_id
      WHERE psls.product_size_id = ${size_id}
      AND psls.layout_id = ${layout_id}
      AND sets.slug = ANY(${slugParts})
  `) as SetRow[];

  return rows;
};
