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

const fullride = [26, 27];
const mainline = [26];
const aux = [27];

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

