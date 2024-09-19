/**
 * This file should be auto-generated at some point.
 * New boards will only be introduced very sporadically, so
 * by generating them into a JS file, the UI can feel snappier
 * as no fetching the backend has to be done when changing options.
 *
 */

// ?board=kilter&layout=8&size=17&set=26&set=27
export const defaultLayouts = [
  [1, "Kilter Board Original"],
  [8, "Kilter Board Homewall"],
];

export const fullride = [26, 27];
export const mainline = [26];
export const aux = [27];

export const boltsAndScrews = [1, 20];
export const bolts = [1];

type BoardLayoutEntry = [number, string, string, number[]];
type BoardLayouts = {
  [key: number]: BoardLayoutEntry[];
};

export const boardLayouts: BoardLayouts = {
  8: [
    [17, "7x10", "Full Ride LED Kit", [26, 27]],
    [18, "7x10", "Mainline LED Kit", [26]],
    [19, "7x10", "Auxiliary LED Kit", [27]],
    [21, "10x10", "Full Ride LED Kit", [26, 27]],
    [22, "10x10", "Mainline LED Kit", [26]],
    [26, "10x12", "Mainline LED Kit", [26]],
    [25, "10x12", "Full Ride LED Kit", [26, 27]],
    [24, "8x12", "Mainline LED Kit", [26]],
    [23, "8x12", "Full Ride LED Kit", [26, 27]],
    [29, "10x10", "Auxiliary LED Kit", [27]],
  ],
  1: [
    [8, "8 x 12", "Home", [1, 20]],
    [14, "7 x 10", "Small", [1, 20]],
    [7, "12 x 14", "Commercial", [1, 20]],
    [10, "12 x 12 with kickboard", "Square", [1, 20]],
    [27, "12 x 12 without kickboard", "Square", [1, 20]],
    [28, "16 x 12", "Super Wide", [1, 20]],
  ],
};

// const bla2 = [
//   [1, "Bolt Ons"],
//   [20, "Screw Ons"],
// ];

// const bla = [
//   [26, "Mainline"],
//   [27, "Auxiliary"],
// ];
export type SetIds = number[];
export const getSetIds = (layout: number, size: number): SetIds =>
  (boardLayouts[layout]?.find(([sizeId]) => sizeId == size) || [])[3] || [];

type ImageDimensions = {
  [imageName: string]: {
    width: number;
    height: number;
  };
};

export const KILTER_BOARD_IMAGE_DIMENSIONS: ImageDimensions = {
  "product_sizes_layouts_sets/15_5_24.png": { width: 1080, height: 2498 },
  "product_sizes_layouts_sets/36-1.png": { width: 1080, height: 1350 },
  "product_sizes_layouts_sets/38-1.png": { width: 1080, height: 1350 },
  "product_sizes_layouts_sets/39-1.png": { width: 1080, height: 1755 },
  "product_sizes_layouts_sets/41-1.png": { width: 1080, height: 1755 },
  "product_sizes_layouts_sets/45-1.png": { width: 1080, height: 1170 },
  "product_sizes_layouts_sets/46-1.png": { width: 1080, height: 1170 },
  "product_sizes_layouts_sets/47.png": { width: 1200, height: 663 },
  "product_sizes_layouts_sets/48.png": { width: 1080, height: 1080 },
  "product_sizes_layouts_sets/49.png": { width: 1080, height: 1188 },
  "product_sizes_layouts_sets/50-1.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/51-1.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/53.png": { width: 1080, height: 1636 },
  "product_sizes_layouts_sets/54.png": { width: 1080, height: 1636 },
  "product_sizes_layouts_sets/55-v2.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/56-v3.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/59.png": { width: 1080, height: 1404 },
  "product_sizes_layouts_sets/60-v3.png": { width: 1080, height: 1157 },
  "product_sizes_layouts_sets/61-v3.png": { width: 1080, height: 1157 },
  "product_sizes_layouts_sets/63-v3.png": { width: 1080, height: 1915 },
  "product_sizes_layouts_sets/64-v3.png": { width: 1080, height: 1915 },
  "product_sizes_layouts_sets/65-v2.png": { width: 1080, height: 1915 },
  "product_sizes_layouts_sets/66-v2.png": { width: 1080, height: 1915 },
  "product_sizes_layouts_sets/70-v2.png": { width: 1080, height: 1504 },
  "product_sizes_layouts_sets/71-v3.png": { width: 1080, height: 1504 },
  "product_sizes_layouts_sets/72.png": { width: 1080, height: 1504 },
  "product_sizes_layouts_sets/73.png": { width: 1080, height: 1504 },
  "product_sizes_layouts_sets/77-1.png": { width: 1080, height: 1080 },
  "product_sizes_layouts_sets/78-1.png": { width: 1080, height: 1080 },
  "product_sizes_layouts_sets/original-16x12-bolt-ons-v2.png": { width: 1477, height: 1200 },
  "product_sizes_layouts_sets/original-16x12-screw-ons-v2.png": { width: 1477, height: 1200 },
};

export const TENSION_BOARD_IMAGE_DIMENSIONS: ImageDimensions = {
  "product_sizes_layouts_sets/1.png": { width: 1080, height: 1755 },
  "product_sizes_layouts_sets/10.png": { width: 1080, height: 1665 },
  "product_sizes_layouts_sets/11.png": { width: 1080, height: 1665 },
  "product_sizes_layouts_sets/12.png": { width: 1080, height: 1665 },
  "product_sizes_layouts_sets/12x10-tb2-plastic.png": { width: 1080, height: 953 },
  "product_sizes_layouts_sets/12x10-tb2-wood.png": { width: 1080, height: 953 },
  "product_sizes_layouts_sets/12x12-tb2-plastic.png": { width: 1080, height: 1144 },
  "product_sizes_layouts_sets/12x12-tb2-wood.png": { width: 1080, height: 1144 },
  "product_sizes_layouts_sets/13.png": { width: 1080, height: 1395 },
  "product_sizes_layouts_sets/14.png": { width: 1080, height: 1395 },
  "product_sizes_layouts_sets/15.png": { width: 1080, height: 1395 },
  "product_sizes_layouts_sets/16.png": { width: 1080, height: 1395 },
  "product_sizes_layouts_sets/17.png": { width: 1080, height: 2093 },
  "product_sizes_layouts_sets/18.png": { width: 1080, height: 2093 },
  "product_sizes_layouts_sets/19.png": { width: 1080, height: 2093 },
  "product_sizes_layouts_sets/2.png": { width: 1080, height: 1755 },
  "product_sizes_layouts_sets/20.png": { width: 1080, height: 2093 },
  "product_sizes_layouts_sets/21-2.png": { width: 1080, height: 1144 },
  "product_sizes_layouts_sets/22-2.png": { width: 1080, height: 1144 },
  "product_sizes_layouts_sets/23.png": { width: 1080, height: 953 },
  "product_sizes_layouts_sets/24-2.png": { width: 1080, height: 953 },
  "product_sizes_layouts_sets/25.png": { width: 1080, height: 1767 },
  "product_sizes_layouts_sets/26.png": { width: 1080, height: 1767 },
  "product_sizes_layouts_sets/27.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/28.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/3.png": { width: 1080, height: 1755 },
  "product_sizes_layouts_sets/4.png": { width: 1080, height: 1755 },
  "product_sizes_layouts_sets/5.png": { width: 1080, height: 1710 },
  "product_sizes_layouts_sets/6.png": { width: 1080, height: 1710 },
  "product_sizes_layouts_sets/7.png": { width: 1080, height: 1710 },
  "product_sizes_layouts_sets/8.png": { width: 1080, height: 1710 },
  "product_sizes_layouts_sets/8x10-tb2-plastic.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/8x10-tb2-wood.png": { width: 1080, height: 1473 },
  "product_sizes_layouts_sets/8x12-tb2-plastic.png": { width: 1080, height: 1767 },
  "product_sizes_layouts_sets/8x12-tb2-wood.png": { width: 1080, height: 1767 },
  "product_sizes_layouts_sets/9.png": { width: 1080, height: 1665 },
};

