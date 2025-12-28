/**
 * Script to generate hardcoded board data from the database.
 *
 * Usage:
 *   cd packages/web
 *   docker-compose -f db/docker-compose.yml up -d
 *   npx tsx scripts/generate-size-edges.ts
 *
 * This generates app/lib/__generated__/product-sizes-data.ts
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const OUTPUT_PATH = join(__dirname, '../app/lib/__generated__/product-sizes-data.ts');

interface ProductSize {
  id: number;
  name: string;
  description: string;
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
  productId: number;
}

interface Layout {
  id: number;
  name: string;
  productId: number;
}

interface SetMapping {
  setId: number;
  setName: string;
  layoutId: number;
  sizeId: number;
}

function querySizes(table: string): ProductSize[] {
  // Use REPLACE to remove newlines from description, and use a unique record separator
  const result = execSync(
    `docker exec db-postgres-1 psql -U postgres -d main -t -A -F '|' -R '~~~' -c "SELECT id, REPLACE(name, E'\\n', ' '), COALESCE(REPLACE(description, E'\\n', ' '), ''), edge_left, edge_right, edge_bottom, edge_top, product_id FROM ${table} ORDER BY id;"`,
    { encoding: 'utf-8' }
  );

  return result
    .trim()
    .split('~~~')
    .filter(line => line.length > 0 && !line.startsWith('\n'))
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const [id, name, description, edge_left, edge_right, edge_bottom, edge_top, product_id] = line.split('|');
      return {
        id: parseInt(id),
        name: name.trim(),
        description: description.trim(),
        edgeLeft: parseInt(edge_left),
        edgeRight: parseInt(edge_right),
        edgeBottom: parseInt(edge_bottom),
        edgeTop: parseInt(edge_top),
        productId: parseInt(product_id),
      };
    });
}

function queryLayouts(table: string): Layout[] {
  const result = execSync(
    `docker exec db-postgres-1 psql -U postgres -d main -t -A -F '|' -R '~~~' -c "SELECT id, REPLACE(name, E'\\n', ' '), product_id FROM ${table} WHERE is_listed = true AND password IS NULL ORDER BY id;"`,
    { encoding: 'utf-8' }
  );

  return result
    .trim()
    .split('~~~')
    .filter(line => line.length > 0 && !line.startsWith('\n'))
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const [id, name, product_id] = line.split('|');
      return {
        id: parseInt(id),
        name: name.trim(),
        productId: parseInt(product_id),
      };
    });
}

function querySets(boardName: string): SetMapping[] {
  const setsTable = `${boardName}_sets`;
  const pslsTable = `${boardName}_product_sizes_layouts_sets`;

  const result = execSync(
    `docker exec db-postgres-1 psql -U postgres -d main -t -A -F '|' -R '~~~' -c "SELECT sets.id, REPLACE(sets.name, E'\\n', ' '), psls.layout_id, psls.product_size_id FROM ${setsTable} sets INNER JOIN ${pslsTable} psls ON sets.id = psls.set_id ORDER BY psls.layout_id, psls.product_size_id, sets.id;"`,
    { encoding: 'utf-8' }
  );

  return result
    .trim()
    .split('~~~')
    .filter(line => line.length > 0 && !line.startsWith('\n'))
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const [id, name, layout_id, size_id] = line.split('|');
      return {
        setId: parseInt(id),
        setName: name.trim(),
        layoutId: parseInt(layout_id),
        sizeId: parseInt(size_id),
      };
    });
}

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'");
}

function generateSizesTypeScript(boardName: string, sizes: ProductSize[]): string {
  const entries = sizes.map(s =>
    `    ${s.id}: { id: ${s.id}, name: '${escapeString(s.name)}', description: '${escapeString(s.description)}', edgeLeft: ${s.edgeLeft}, edgeRight: ${s.edgeRight}, edgeBottom: ${s.edgeBottom}, edgeTop: ${s.edgeTop}, productId: ${s.productId} },`
  ).join('\n');

  return `  ${boardName}: {\n${entries}\n  }`;
}

function generateLayoutsTypeScript(boardName: string, layouts: Layout[]): string {
  const entries = layouts.map(l =>
    `    ${l.id}: { id: ${l.id}, name: '${escapeString(l.name)}', productId: ${l.productId} },`
  ).join('\n');

  return `  ${boardName}: {\n${entries}\n  }`;
}

function generateSetsTypeScript(boardName: string, sets: SetMapping[]): string {
  // Group sets by layout_id-size_id key
  const grouped: Record<string, { id: number; name: string }[]> = {};
  for (const set of sets) {
    const key = `${set.layoutId}-${set.sizeId}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({ id: set.setId, name: set.setName });
  }

  const entries = Object.entries(grouped)
    .map(([key, setList]) => {
      const setsArray = setList.map(s => `{ id: ${s.id}, name: '${escapeString(s.name)}' }`).join(', ');
      return `    '${key}': [${setsArray}],`;
    })
    .join('\n');

  return `  ${boardName}: {\n${entries}\n  }`;
}

async function main() {
  console.log('Querying kilter_product_sizes...');
  const kilterSizes = querySizes('kilter_product_sizes');

  console.log('Querying tension_product_sizes...');
  const tensionSizes = querySizes('tension_product_sizes');

  console.log('Querying kilter_layouts...');
  const kilterLayouts = queryLayouts('kilter_layouts');

  console.log('Querying tension_layouts...');
  const tensionLayouts = queryLayouts('tension_layouts');

  console.log('Querying kilter_sets...');
  const kilterSets = querySets('kilter');

  console.log('Querying tension_sets...');
  const tensionSets = querySets('tension');

  const output = `/**
 * ⚠️ DO NOT EDIT THIS FILE MANUALLY ⚠️
 *
 * This file is auto-generated by running:
 *   npx tsx scripts/generate-size-edges.ts
 *
 * Hardcoded product sizes, layouts, and sets data for each board type.
 * These values are static (board configurations don't change) so we hardcode them
 * to eliminate database queries.
 *
 * Generated at: ${new Date().toISOString()}
 */

import { BoardName } from '@/app/lib/types';

export interface ProductSizeData {
  id: number;
  name: string;
  description: string;
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
  productId: number;
}

export interface LayoutData {
  id: number;
  name: string;
  productId: number;
}

export interface SetData {
  id: number;
  name: string;
}

export interface SizeEdges {
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
}

export const PRODUCT_SIZES: Record<BoardName, Record<number, ProductSizeData>> = {
${generateSizesTypeScript('kilter', kilterSizes)},
${generateSizesTypeScript('tension', tensionSizes)},
};

export const LAYOUTS: Record<BoardName, Record<number, LayoutData>> = {
${generateLayoutsTypeScript('kilter', kilterLayouts)},
${generateLayoutsTypeScript('tension', tensionLayouts)},
};

// Sets indexed by "layoutId-sizeId" key
export const SETS: Record<BoardName, Record<string, SetData[]>> = {
${generateSetsTypeScript('kilter', kilterSets)},
${generateSetsTypeScript('tension', tensionSets)},
};

/**
 * Get size edges for a given board and size ID.
 * Returns null if the size ID is not found.
 */
export const getSizeEdges = (boardName: BoardName, sizeId: number): SizeEdges | null => {
  const size = PRODUCT_SIZES[boardName]?.[sizeId];
  if (!size) return null;
  return {
    edgeLeft: size.edgeLeft,
    edgeRight: size.edgeRight,
    edgeBottom: size.edgeBottom,
    edgeTop: size.edgeTop,
  };
};

/**
 * Get full product size data for a given board and size ID.
 * Returns null if the size ID is not found.
 */
export const getProductSize = (boardName: BoardName, sizeId: number): ProductSizeData | null => {
  return PRODUCT_SIZES[boardName]?.[sizeId] ?? null;
};

/**
 * Get layout data for a given board and layout ID.
 * Returns null if the layout ID is not found.
 */
export const getLayout = (boardName: BoardName, layoutId: number): LayoutData | null => {
  return LAYOUTS[boardName]?.[layoutId] ?? null;
};

/**
 * Get all layouts for a given board.
 */
export const getAllLayouts = (boardName: BoardName): LayoutData[] => {
  const layouts = LAYOUTS[boardName];
  if (!layouts) return [];
  return Object.values(layouts);
};

/**
 * Get all sizes for a given board and layout ID.
 * Uses the layout's product_id to find matching sizes.
 */
export const getSizesForLayoutId = (boardName: BoardName, layoutId: number): ProductSizeData[] => {
  const layout = LAYOUTS[boardName]?.[layoutId];
  if (!layout) return [];
  const sizes = PRODUCT_SIZES[boardName];
  if (!sizes) return [];
  return Object.values(sizes).filter(size => size.productId === layout.productId);
};

/**
 * Get all sizes for a given board and product ID.
 * Used by the board selector to list available sizes.
 */
export const getSizesForProduct = (boardName: BoardName, productId: number): ProductSizeData[] => {
  const sizes = PRODUCT_SIZES[boardName];
  if (!sizes) return [];
  return Object.values(sizes).filter(size => size.productId === productId);
};

/**
 * Get all sets for a given board, layout, and size.
 */
export const getSetsForLayoutAndSize = (boardName: BoardName, layoutId: number, sizeId: number): SetData[] => {
  const key = \`\${layoutId}-\${sizeId}\`;
  return SETS[boardName]?.[key] ?? [];
};

/**
 * Default size IDs for each layout.
 * Used by the setup wizard to pre-select a sensible default.
 */
export const DEFAULT_SIZE_FOR_LAYOUT: Record<BoardName, Record<number, number>> = {
  kilter: {
    1: 10,  // Kilter Board Original -> 12 x 12 with kickboard
    8: 17,  // Kilter Board Homewall -> 7x10 Full Ride LED Kit
  },
  tension: {
    9: 1,   // Original Layout -> Full Wall (first size is fine)
    10: 8,  // Tension Board 2 Mirror -> 12 high x 8 wide
    11: 8,  // Tension Board 2 Spray -> 12 high x 8 wide
  },
};

/**
 * Get the default size ID for a given board and layout.
 * Falls back to the first available size if no default is defined.
 */
export const getDefaultSizeForLayout = (boardName: BoardName, layoutId: number): number | null => {
  const defaultSizeId = DEFAULT_SIZE_FOR_LAYOUT[boardName]?.[layoutId];
  if (defaultSizeId !== undefined) {
    return defaultSizeId;
  }
  // Fall back to first available size
  const sizes = getSizesForLayoutId(boardName, layoutId);
  return sizes.length > 0 ? sizes[0].id : null;
};

/**
 * Get all board selector options (layouts, sizes, sets) from hardcoded data.
 * This replaces the database query in getAllBoardSelectorOptions.
 */
export const getBoardSelectorOptions = () => {
  const boardNames: BoardName[] = ['kilter', 'tension'];

  const layouts: Record<BoardName, { id: number; name: string }[]> = {} as Record<BoardName, { id: number; name: string }[]>;
  const sizes: Record<string, { id: number; name: string; description: string }[]> = {};
  const sets: Record<string, { id: number; name: string }[]> = {};

  for (const boardName of boardNames) {
    // Get layouts
    layouts[boardName] = getAllLayouts(boardName).map(l => ({ id: l.id, name: l.name }));

    // Get sizes for each layout
    for (const layout of layouts[boardName]) {
      const layoutSizes = getSizesForLayoutId(boardName, layout.id);
      const sizeKey = \`\${boardName}-\${layout.id}\`;
      sizes[sizeKey] = layoutSizes.map(s => ({ id: s.id, name: s.name, description: s.description }));

      // Get sets for each size
      for (const size of layoutSizes) {
        const setKey = \`\${boardName}-\${layout.id}-\${size.id}\`;
        sets[setKey] = getSetsForLayoutAndSize(boardName, layout.id, size.id);
      }
    }
  }

  return { layouts, sizes, sets };
};
`;

  console.log(`Writing to ${OUTPUT_PATH}...`);
  writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log('Done!');
}

main().catch(console.error);
