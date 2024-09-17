import { GetBoardDetailsResponse, ImagesToHolds } from "@/lib/types";

export type KilterBoardProps = KilterBoardLoaderProps & {
  editEnabled: boolean;
  boardDetails: GetBoardDetailsResponse;
  onCircleClick: () => void;
  onBoardClick: () => void;
  litUpHolds: string;
};
