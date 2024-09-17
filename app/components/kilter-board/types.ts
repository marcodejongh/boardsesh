import { GetBoardDetailsResponse, ImagesToHolds } from "@/lib/types";

export type KilterBoardLoaderProps = {
  board: string;
  layout: number;
  size: number;
  litUpHolds: string;
};

export type KilterBoardProps = KilterBoardLoaderProps & {
  editEnabled: boolean;
  boardDetails: GetBoardDetailsResponse;
  onCircleClick: () => void;
  onBoardClick: () => void;
};
