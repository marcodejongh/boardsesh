/**
 * Board configuration types for the backend data module.
 *
 * Shared types are imported from @boardsesh/shared-schema.
 * Backend-specific types (using snake_case for internal processing) are defined here.
 */

// Re-export shared types used by backend data processing
export type {
  BoardName,
  HoldTuple,
  HoldRenderData,
  ImageFileName,
  ImagesToHolds,
} from '@boardsesh/shared-schema';

// Backend-specific type aliases
export type Angle = number;
export type SetIdList = number[];

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
