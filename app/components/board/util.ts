import { BoardName } from "@/app/lib/types";
import { KILTER_BOARD_IMAGE_DIMENSIONS, TENSION_BOARD_IMAGE_DIMENSIONS } from "./board-data";
import { LitUpHoldsMap, holdStateMapping } from "./types";


export const getImageUrl = (imageUrl: string, board: BoardName) => `https://api.${board}boardapp${board === 'tension' ? '2' : ''}.com/img/${imageUrl}`;
export const convertLitUpHoldsStringToMap = (litUpHolds: string, board: BoardName): LitUpHoldsMap => Object.fromEntries(
  litUpHolds.split("p").filter(hold => hold)
    .map(holdData => holdData.split("r").map(str => Number(str)))
    .map(([holdId, stateCode]) => {
      const { name, color } = holdStateMapping[board][stateCode];
      return [holdId, { state: name, color }];
    })
);
export const getBoardImageDimensions = (board: BoardName, firstImage: string) => board === 'kilter' ?
  KILTER_BOARD_IMAGE_DIMENSIONS[firstImage] : TENSION_BOARD_IMAGE_DIMENSIONS[firstImage];
