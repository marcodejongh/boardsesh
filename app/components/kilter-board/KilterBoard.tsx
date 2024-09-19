import React, { useMemo, useCallback } from "react";
import { Board, HoldTuple } from "@/lib/types";
import { KilterBoardProps } from "./types";
import { KILTER_BOARD_IMAGE_DIMENSIONS, TENSION_BOARD_IMAGE_DIMENSIONS } from './board-data'
type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT';
type HoldsArray = Array<{ 
  id: number; 
  mirroredHoldId: number | null; 
  cx: number; 
  cy: number; 
  r: number; 
  state: HoldState; 
}>;

const getImageUrl = (imageUrl: string, board: Board) => `
https://api.${board}boardapp${board === 'tension' ? '2' : ''}.com/img/${imageUrl}`;

type Color = string;
type HoldCode = number;

// Mapping object for board-specific hold states
const holdStateMapping: Record<Board, Record<HoldCode, { name: HoldState; color: Color }>> = {
  kilter: {
    42: { name: 'STARTING', color: '#00DD00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
    12: { name: 'STARTING', color: '#00DD00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFA500' },
  },
  tension: {
    5: { name: 'STARTING', color: '#00DD00' },
    6: { name: 'HAND', color: '#4444FF' },
    7: { name: 'FINISH', color: '#FF0000' },
    8: { name: 'FOOT', color: '#FF00FF' },
  },
};

type HoldRenderData = {
  id: number;
  mirroredHoldId: number | null;
  cx: number;
  cy: number;
  r: number;
  state: HoldState;
  color?: Color;
};

type LitUpHoldsMap = Record<HoldCode, { state: HoldState, color: string }>;

const convertLitUpHoldsStringToMap = (litUpHolds: string, board: Board): LitUpHoldsMap => 
  Object.fromEntries(
    litUpHolds.split("p").filter(hold => hold)
      .map(holdData => holdData.split("r").map(str => Number(str)))
      .map(([holdId, stateCode]) => {
        const { name, color } = holdStateMapping[board][stateCode];
        return [holdId, { state: name, color }]; 
    })
  );

const getBoardImageDimensions = (board: Board, firstImage: string) => board === 'kilter' ? 
  KILTER_BOARD_IMAGE_DIMENSIONS[firstImage] : TENSION_BOARD_IMAGE_DIMENSIONS[firstImage];


const KilterBoard = ({
  litUpHolds = "",
  boardDetails,
  board
}: KilterBoardProps) => {
  const {width: boardWidth, height: boardHeight} = getBoardImageDimensions(board, Object.keys(boardDetails.images_to_holds)[0]);

  const holdsData: HoldRenderData[] = useMemo(() => {
    const { images_to_holds: imagesToHolds, edge_bottom: edgeBottom, edge_left: edgeLeft, edge_right: edgeRight, edge_top: edgeTop } = boardDetails;

    const xSpacing = boardWidth / (edgeRight - edgeLeft);
    const ySpacing = boardHeight / (edgeTop - edgeBottom);

    const litUpHoldsMap = convertLitUpHoldsStringToMap(litUpHolds, board);
    
    return Object.values<HoldTuple[]>(imagesToHolds)
      .flatMap(holds =>
        holds
          .filter(([,, x, y]) => x > edgeLeft && x < edgeRight && y > edgeBottom && y < edgeTop)
          .map(([holdId, mirroredHoldId, x, y]) => ({
            id: holdId,
            mirroredHoldId,
            cx: (x - edgeLeft) * xSpacing,
            cy: boardHeight - (y - edgeBottom) * ySpacing,
            r: xSpacing * 4,
            ...litUpHoldsMap[holdId]
            // TODO: When reimplementing create mode, draw all circles when in edit mode
          })).filter(({state}) => state && state !== 'OFF')
      );
  }, [boardDetails, litUpHolds, board]) || [];

  return (
    <svg
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {Object.keys(boardDetails.images_to_holds).map((imageUrl) => (
        <image
          key={imageUrl}
          href={getImageUrl(imageUrl, board)}
          width="100%"
          height="100%"
        />
      ))}
      {holdsData
        .map((hold) => (
          <circle
            key={hold.id}
            id={`hold-${hold.id}`}
            data-mirror-id={hold.mirroredHoldId || undefined}
            cx={hold.cx}
            cy={hold.cy}
            r={hold.r}
            stroke={hold.color}
            strokeWidth={6}
            fillOpacity={0}
            // onClick={editEnabled ? () => handleCircleClick(hold.id) : undefined}
          />
        ))}
    </svg>
  );
};

export default KilterBoard;
