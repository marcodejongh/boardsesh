import { Board, GetBoardDetailsResponse, ImagesToHolds } from "@/lib/types";

export type KilterBoardProps = {
  boardDetails: GetBoardDetailsResponse;
  litUpHolds: string;
  board: Board;
};
