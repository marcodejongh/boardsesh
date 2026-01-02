/**
 * Hardcoded product sizes data for climb filtering
 * These values are static (board configurations don't change) so we hardcode them
 * to eliminate database queries.
 */

import type { BoardName } from './table-select';

export interface SizeEdges {
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
}

export interface ProductSizeData extends SizeEdges {
  id: number;
  name: string;
  description: string;
  productId: number;
}

export const PRODUCT_SIZES: Record<BoardName, Record<number, ProductSizeData>> = {
  kilter: {
    7: { id: 7, name: '12 x 14', description: 'Commerical', edgeLeft: 0, edgeRight: 144, edgeBottom: 0, edgeTop: 180, productId: 1 },
    8: { id: 8, name: '8 x 12', description: 'Home', edgeLeft: 24, edgeRight: 120, edgeBottom: 0, edgeTop: 156, productId: 1 },
    10: { id: 10, name: '12 x 12 with kickboard', description: 'Square', edgeLeft: 0, edgeRight: 144, edgeBottom: 0, edgeTop: 156, productId: 1 },
    11: { id: 11, name: 'Full Wall', description: '', edgeLeft: 0, edgeRight: 210, edgeBottom: 0, edgeTop: 116, productId: 2 },
    12: { id: 12, name: '5 Holds', description: '4 bolt-ons + 1 screw-on', edgeLeft: -8, edgeRight: 8, edgeBottom: 0, edgeTop: 16, productId: 3 },
    13: { id: 13, name: '10 x 10', description: '', edgeLeft: -60, edgeRight: 60, edgeBottom: -12, edgeTop: 120, productId: 4 },
    14: { id: 14, name: '7 x 10', description: 'Small', edgeLeft: 28, edgeRight: 116, edgeBottom: 36, edgeTop: 156, productId: 1 },
    15: { id: 15, name: 'Spire', description: '', edgeLeft: 0, edgeRight: 128, edgeBottom: -16, edgeTop: 280, productId: 5 },
    16: { id: 16, name: 'Full', description: '', edgeLeft: 0, edgeRight: 198, edgeBottom: 0, edgeTop: 300, productId: 6 },
    17: { id: 17, name: '7x10', description: 'Full Ride LED Kit', edgeLeft: -44, edgeRight: 44, edgeBottom: 24, edgeTop: 144, productId: 7 },
    18: { id: 18, name: '7x10', description: 'Mainline LED Kit', edgeLeft: -44, edgeRight: 44, edgeBottom: 24, edgeTop: 144, productId: 7 },
    19: { id: 19, name: '7x10', description: 'Auxiliary LED Kit', edgeLeft: -44, edgeRight: 44, edgeBottom: 24, edgeTop: 144, productId: 7 },
    20: { id: 20, name: '10 x 12', description: '', edgeLeft: -60, edgeRight: 60, edgeBottom: -12, edgeTop: 144, productId: 4 },
    21: { id: 21, name: '10x10', description: 'Full Ride LED Kit', edgeLeft: -56, edgeRight: 56, edgeBottom: 24, edgeTop: 144, productId: 7 },
    22: { id: 22, name: '10x10', description: 'Mainline LED Kit', edgeLeft: -56, edgeRight: 56, edgeBottom: 24, edgeTop: 144, productId: 7 },
    23: { id: 23, name: '8x12', description: 'Full Ride LED Kit', edgeLeft: -44, edgeRight: 44, edgeBottom: -12, edgeTop: 144, productId: 7 },
    24: { id: 24, name: '8x12', description: 'Mainline LED Kit', edgeLeft: -44, edgeRight: 44, edgeBottom: -12, edgeTop: 144, productId: 7 },
    25: { id: 25, name: '10x12', description: 'Full Ride LED Kit', edgeLeft: -56, edgeRight: 56, edgeBottom: -12, edgeTop: 144, productId: 7 },
    26: { id: 26, name: '10x12', description: 'Mainline LED Kit', edgeLeft: -56, edgeRight: 56, edgeBottom: -12, edgeTop: 144, productId: 7 },
    27: { id: 27, name: '12 x 12 without kickboard', description: 'Square', edgeLeft: 0, edgeRight: 144, edgeBottom: 12, edgeTop: 156, productId: 1 },
    28: { id: 28, name: '16 x 12', description: 'Super Wide', edgeLeft: -24, edgeRight: 168, edgeBottom: 0, edgeTop: 156, productId: 1 },
    29: { id: 29, name: '10x10', description: 'Auxiliary LED Kit', edgeLeft: -56, edgeRight: 56, edgeBottom: 24, edgeTop: 144, productId: 7 },
  },
  tension: {
    1: { id: 1, name: 'Full Wall', description: 'Rows: KB1, KB2, 1-18 Columns: A-K', edgeLeft: 0, edgeRight: 96, edgeBottom: 0, edgeTop: 156, productId: 4 },
    2: { id: 2, name: 'Half Kickboard', description: 'Rows: KB2, 1-18 Columns: A-K', edgeLeft: 0, edgeRight: 96, edgeBottom: 4, edgeTop: 156, productId: 4 },
    3: { id: 3, name: 'No Kickboard', description: 'Rows: 1-18 Columns: A-K', edgeLeft: 0, edgeRight: 96, edgeBottom: 8, edgeTop: 156, productId: 4 },
    4: { id: 4, name: 'Short', description: 'Rows: 1-15 Columns: A-K', edgeLeft: 0, edgeRight: 96, edgeBottom: 8, edgeTop: 132, productId: 4 },
    5: { id: 5, name: 'Short & Narrow', description: 'Rows: 1-15 Columns: B.5-I.5', edgeLeft: 16, edgeRight: 80, edgeBottom: 8, edgeTop: 132, productId: 4 },
    6: { id: 6, name: '12 high x 12 wide', description: '', edgeLeft: -68, edgeRight: 68, edgeBottom: 0, edgeTop: 144, productId: 5 },
    7: { id: 7, name: '10 high x 12 wide', description: '', edgeLeft: -68, edgeRight: 68, edgeBottom: 0, edgeTop: 120, productId: 5 },
    8: { id: 8, name: '12 high x 8 wide', description: '', edgeLeft: -44, edgeRight: 44, edgeBottom: 0, edgeTop: 144, productId: 5 },
    9: { id: 9, name: '10 high x 8 wide', description: '', edgeLeft: -44, edgeRight: 44, edgeBottom: 0, edgeTop: 120, productId: 5 },
  },
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
