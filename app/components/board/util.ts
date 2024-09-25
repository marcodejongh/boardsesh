import { BoardName } from "@/app/lib/types";
import { BOARD_IMAGE_DIMENSIONS } from "../../lib/board-data";
import { LitUpHoldsMap, holdStateMapping } from "./types";


const USE_SELF_HOSTED_IMAGES = true;

export const getImageUrl = (imageUrl: string, board: BoardName) => {
  if (USE_SELF_HOSTED_IMAGES) {
    return `http://localhost:3000/images/${board}/${imageUrl}`;
  }

  return `https://api.${board}boardapp${board === 'tension' ? '2' : ''}.com/img/${imageUrl}`;
};

export const convertLitUpHoldsStringToMap = (litUpHolds: string, board: BoardName): LitUpHoldsMap => Object.fromEntries(
  litUpHolds.split("p").filter(hold => hold)
    .map(holdData => holdData.split("r").map(str => Number(str)))
    .map(([holdId, stateCode]) => {
      const { name, color } = holdStateMapping[board][stateCode];
      return [holdId, { state: name, color }];
    })
);
export const getBoardImageDimensions = (board: BoardName, firstImage: string) => BOARD_IMAGE_DIMENSIONS[board][firstImage];
