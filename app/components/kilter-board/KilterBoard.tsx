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
  color: Color;
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
  editEnabled = false,
  litUpHolds = "",
  boardDetails,
  onCircleClick,
  onBoardClick,
  board
}: KilterBoardProps) => {
  if (!boardDetails) {
    return;
  }
  const { images_to_holds: imagesToHolds, edge_bottom: edgeBottom, edge_left: edgeLeft, edge_right: edgeRight, edge_top: edgeTop } = boardDetails;
  
  const {width: boardWidth, height: boardHeight} = getBoardImageDimensions(board, Object.keys(imagesToHolds)[0]);

  const holdsData: HoldRenderData[] = useMemo(() => {
    if (!litUpHolds) {
      return;
    }

    const litUpHoldsMap = convertLitUpHoldsStringToMap(litUpHolds, board);
    const newHoldsData: HoldRenderData[] = [];

    for (const [imageUrl, holds] of Object.entries<HoldTuple[]>(imagesToHolds)) {

        const xSpacing = boardWidth / (edgeRight - edgeLeft);
        const ySpacing = boardHeight / (edgeTop - edgeBottom);

        holds.forEach(([holdId, mirroredHoldId, x, y]) => {
          if (x <= edgeLeft || x >= edgeRight || y <= edgeBottom || y >= edgeTop) {
            return;
          }

          const xPixel = (x - edgeLeft) * xSpacing;
          const yPixel = boardHeight - (y - edgeBottom) * ySpacing;

          newHoldsData.push({
            id: holdId,
            mirroredHoldId,
            cx: xPixel,
            cy: yPixel,
            r: xSpacing * 4,
            ...litUpHoldsMap[holdId],
          });
        });
      }
      return newHoldsData;
  }, [litUpHolds, board]) || [];
  
  

  return (
    <svg
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {Object.keys(imagesToHolds).map((imageUrl) => (
        <image
          key={imageUrl}
          href={getImageUrl(imageUrl, board)}
          width="100%"
          height="100%"
        />
      ))}
      {holdsData
        .filter((hold) => hold.state !== 'OFF')
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
