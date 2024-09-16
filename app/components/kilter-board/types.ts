import { ImagesToHolds } from "@/lib/types";

export type KilterBoardLoaderProps = {
  board: string;
  layout: number;
  size: number;
  litUpHolds: string;
};

export type KilterBoardProps = KilterBoardLoaderProps & {
  editEnabled: boolean;
  imagesToHolds: ImagesToHolds;
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
  onCircleClick: () => void;
  onBoardClick: () => void;
};
