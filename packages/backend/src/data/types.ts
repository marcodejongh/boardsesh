/**
 * Board configuration types for the backend data module.
 * These types mirror the web package types but are self-contained for the backend.
 */

export type BoardName = 'kilter' | 'tension';
export type Angle = number;
export type SetIdList = number[];
export type ImageFileName = string;

// HoldTuple: [placementId, mirroredPlacementId | null, x, y]
export type HoldTuple = [number, number | null, number, number];

export interface HoldRenderData {
  id: number;
  mirroredHoldId: number | null;
  cx: number;
  cy: number;
  r: number;
}

export type ImagesToHolds = Record<ImageFileName, HoldTuple[]>;

export interface BoardDetails {
  images_to_holds: ImagesToHolds;
  holdsData: HoldRenderData[];
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
  boardHeight: number;
  boardWidth: number;
  board_name: BoardName;
  layout_id: number;
  size_id: number;
  set_ids: SetIdList;
  supportsMirroring?: boolean;
  layout_name?: string;
  size_name?: string;
  size_description?: string;
  set_names?: string[];
}

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
