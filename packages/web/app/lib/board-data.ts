import { Angle, BoardName } from './types';

type ImageDimensions = {
  [imageName: string]: {
    width: number;
    height: number;
  };
};

export type SetIdList = number[];

export const SUPPORTED_BOARDS = ['kilter', 'tension'];

export const BOARD_IMAGE_DIMENSIONS: Record<BoardName, ImageDimensions> = {
  kilter: {
    'product_sizes_layouts_sets/15_5_24.png': { width: 1080, height: 2498 },
    'product_sizes_layouts_sets/36-1.png': { width: 1080, height: 1350 },
    'product_sizes_layouts_sets/38-1.png': { width: 1080, height: 1350 },
    'product_sizes_layouts_sets/39-1.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/41-1.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/45-1.png': { width: 1080, height: 1170 },
    'product_sizes_layouts_sets/46-1.png': { width: 1080, height: 1170 },
    'product_sizes_layouts_sets/47.png': { width: 1200, height: 663 },
    'product_sizes_layouts_sets/48.png': { width: 1080, height: 1080 },
    'product_sizes_layouts_sets/49.png': { width: 1080, height: 1188 },
    'product_sizes_layouts_sets/50-1.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/51-1.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/53.png': { width: 1080, height: 1636 },
    'product_sizes_layouts_sets/54.png': { width: 1080, height: 1636 },
    'product_sizes_layouts_sets/55-v2.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/56-v3.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/59.png': { width: 1080, height: 1404 },
    'product_sizes_layouts_sets/60-v3.png': { width: 1080, height: 1157 },
    'product_sizes_layouts_sets/61-v3.png': { width: 1080, height: 1157 },
    'product_sizes_layouts_sets/63-v3.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/64-v3.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/65-v2.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/66-v2.png': { width: 1080, height: 1915 },
    'product_sizes_layouts_sets/70-v2.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/71-v3.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/72.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/73.png': { width: 1080, height: 1504 },
    'product_sizes_layouts_sets/77-1.png': { width: 1080, height: 1080 },
    'product_sizes_layouts_sets/78-1.png': { width: 1080, height: 1080 },
    'product_sizes_layouts_sets/original-16x12-bolt-ons-v2.png': { width: 1477, height: 1200 },
    'product_sizes_layouts_sets/original-16x12-screw-ons-v2.png': { width: 1477, height: 1200 },
  },
  tension: {
    'product_sizes_layouts_sets/1.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/10.png': { width: 1080, height: 1665 },
    'product_sizes_layouts_sets/11.png': { width: 1080, height: 1665 },
    'product_sizes_layouts_sets/12.png': { width: 1080, height: 1665 },
    'product_sizes_layouts_sets/12x10-tb2-plastic.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/12x10-tb2-wood.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/12x12-tb2-plastic.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/12x12-tb2-wood.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/13.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/14.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/15.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/16.png': { width: 1080, height: 1395 },
    'product_sizes_layouts_sets/17.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/18.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/19.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/2.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/20.png': { width: 1080, height: 2093 },
    'product_sizes_layouts_sets/21-2.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/22-2.png': { width: 1080, height: 1144 },
    'product_sizes_layouts_sets/23.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/24-2.png': { width: 1080, height: 953 },
    'product_sizes_layouts_sets/25.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/26.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/27.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/28.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/3.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/4.png': { width: 1080, height: 1755 },
    'product_sizes_layouts_sets/5.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/6.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/7.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/8.png': { width: 1080, height: 1710 },
    'product_sizes_layouts_sets/8x10-tb2-plastic.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/8x10-tb2-wood.png': { width: 1080, height: 1473 },
    'product_sizes_layouts_sets/8x12-tb2-plastic.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/8x12-tb2-wood.png': { width: 1080, height: 1767 },
    'product_sizes_layouts_sets/9.png': { width: 1080, height: 1665 },
  },
};

export const ANGLES: Record<BoardName, Angle[]> = {
  kilter: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  tension: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
};

export const TENSION_KILTER_GRADES = [
  { difficulty_id: 10, difficulty_name: '4a/V0' },
  { difficulty_id: 11, difficulty_name: '4b/V0' },
  { difficulty_id: 12, difficulty_name: '4c/V0' },
  { difficulty_id: 13, difficulty_name: '5a/V1' },
  { difficulty_id: 14, difficulty_name: '5b/V1' },
  { difficulty_id: 15, difficulty_name: '5c/V2' },
  { difficulty_id: 16, difficulty_name: '6a/V3' },
  { difficulty_id: 17, difficulty_name: '6a+/V3' },
  { difficulty_id: 18, difficulty_name: '6b/V4' },
  { difficulty_id: 19, difficulty_name: '6b+/V4' },
  { difficulty_id: 20, difficulty_name: '6c/V5' },
  { difficulty_id: 21, difficulty_name: '6c+/V5' },
  { difficulty_id: 22, difficulty_name: '7a/V6' },
  { difficulty_id: 23, difficulty_name: '7a+/V7' },
  { difficulty_id: 24, difficulty_name: '7b/V8' },
  { difficulty_id: 25, difficulty_name: '7b+/V8' },
  { difficulty_id: 26, difficulty_name: '7c/V9' },
  { difficulty_id: 27, difficulty_name: '7c+/V10' },
  { difficulty_id: 28, difficulty_name: '8a/V11' },
  { difficulty_id: 29, difficulty_name: '8a+/V12' },
  { difficulty_id: 30, difficulty_name: '8b/V13' },
  { difficulty_id: 31, difficulty_name: '8b+/V14' },
  { difficulty_id: 32, difficulty_name: '8c/V15' },
  { difficulty_id: 33, difficulty_name: '8c+/V16' },
];
