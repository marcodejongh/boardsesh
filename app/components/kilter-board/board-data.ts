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

export const BOARD_IMAGE_DIMENSIONS: ImageDimensions = {
  "15_5_24.png": { width: 1080, height: 2498 },
  "36-1.png": { width: 1080, height: 1350 },
  "38-1.png": { width: 1080, height: 1350 },
  "39-1.png": { width: 1080, height: 1755 },
  "41-1.png": { width: 1080, height: 1755 },
  "45-1.png": { width: 1080, height: 1170 },
  "46-1.png": { width: 1080, height: 1170 },
  "47.png": { width: 1200, height: 663 },
  "48.png": { width: 1080, height: 1080 },
  "49.png": { width: 1080, height: 1188 },
  "50-1.png": { width: 1080, height: 1473 },
  "51-1.png": { width: 1080, height: 1473 },
  "53.png": { width: 1080, height: 1636 },
  "54.png": { width: 1080, height: 1636 },
  "55-v2.png": { width: 1080, height: 1473 },
  "56-v3.png": { width: 1080, height: 1473 },
  "59.png": { width: 1080, height: 1404 },
  "60-v3.png": { width: 1080, height: 1157 },
  "61-v3.png": { width: 1080, height: 1157 },
  "63-v3.png": { width: 1080, height: 1915 },
  "64-v3.png": { width: 1080, height: 1915 },
  "65-v2.png": { width: 1080, height: 1915 },
  "66-v2.png": { width: 1080, height: 1915 },
  "70-v2.png": { width: 1080, height: 1504 },
  "71-v3.png": { width: 1080, height: 1504 },
  "72.png": { width: 1080, height: 1504 },
  "73.png": { width: 1080, height: 1504 },
  "77-1.png": { width: 1080, height: 1080 },
  "78-1.png": { width: 1080, height: 1080 },
  "original-16x12-bolt-ons-v2.png": { width: 1477, height: 1200 },
  "original-16x12-screw-ons-v2.png": { width: 1477, height: 1200 },
};
