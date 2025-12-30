/**
 * Board configuration data module.
 * This module contains all static board configuration data that was previously
 * bundled with the web package. Moving it to the backend reduces client bundle size.
 */

// Re-export types
export type {
  BoardName,
  Angle,
  SetIdList,
  ImageFileName,
  HoldTuple,
  HoldRenderData,
  ImagesToHolds,
  BoardDetails,
  ProductSizeData,
  LayoutData,
  SetData,
  SizeEdges,
} from './types.js';

// Re-export board data constants
export {
  SUPPORTED_BOARDS,
  BOARD_IMAGE_DIMENSIONS,
  ANGLES,
  TENSION_KILTER_GRADES,
} from './board-data.js';

// Re-export product sizes data and functions
export {
  PRODUCT_SIZES,
  LAYOUTS,
  SETS,
  IMAGE_FILENAMES,
  HOLE_PLACEMENTS,
  DEFAULT_SIZE_FOR_LAYOUT,
  getSizeEdges,
  getProductSize,
  getLayout,
  getAllLayouts,
  getSizesForLayoutId,
  getSizesForProduct,
  getSetsForLayoutAndSize,
  getDefaultSizeForLayout,
  getImageFilename,
  getHolePlacements,
  getBoardDetails,
  getBoardSelectorOptions,
} from './product-sizes-data.js';

// Re-export LED placements data and functions
export {
  LED_PLACEMENTS,
  getLedPlacements,
} from './led-placements-data.js';
