import { Board, GetBoardDetailsResponse, ImagesToHolds } from "@/lib/types";

export type KilterBoardProps = {
  editEnabled: boolean;
  boardDetails: GetBoardDetailsResponse;
  onCircleClick?: () => void;
  onBoardClick?: () => void;
  litUpHolds: string;
  board: Board;
};
