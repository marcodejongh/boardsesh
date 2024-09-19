import React, { useEffect, useState, useMemo } from "react";
import { Board, HoldTuple } from "@/lib/types";
import { KilterBoardProps } from "./types";

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

const getHoldColor = (board: Board, holdState: HoldState) => holdStateMapping[board][holdState];

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
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const [holdsData, setHoldsData] = useState<HoldRenderData[]>([]);

  const parsedLitUpHolds = useMemo(() => {
    const litUpHoldsMap: Record<HoldCode, { state: HoldState, color: string }> = {};

    if (!litUpHolds) {
      return
    }

    litUpHolds.split("p").filter(hold => hold).forEach((holdData) => {
      const [holdId, stateCode] = holdData.split("r").map(str => Number(str));
      const holdState = holdStateMapping[board][stateCode];
      if (holdState) {
        litUpHoldsMap[holdId] = { state: holdState.name, color: holdState.color };
      }
    }); 

    return litUpHoldsMap;
  }, [litUpHolds, board]) || {};

  useEffect(() => {
    const loadImages = async () => {
      const dimensions: Record<string, { width: number; height: number }> = {};

      for (const imageUrl of Object.keys(imagesToHolds)) {
        const image = new Image();
        await new Promise<void>((resolve) => {
          image.onload = () => {
            dimensions[imageUrl] = { width: image.width, height: image.height };
            resolve();
          };
          image.src = getImageUrl(imageUrl, board);
        });
      }
      // TODO: If we can get rid of this, the whole component becomes SSR'able
      setImageDimensions(dimensions);
    };

    loadImages();
  }, [imagesToHolds]);

  useEffect(() => {
    if (Object.keys(imageDimensions).length > 0) {
      const newHoldsData: HoldRenderData[] = [];

      for (const [imageUrl, holds] of Object.entries<HoldTuple[]>(imagesToHolds)) {
        const { width, height } = imageDimensions[imageUrl];
        const xSpacing = width / (edgeRight - edgeLeft);
        const ySpacing = height / (edgeTop - edgeBottom);

        holds.forEach(([holdId, mirroredHoldId, x, y]) => {
          if (x <= edgeLeft || x >= edgeRight || y <= edgeBottom || y >= edgeTop) {
            return;
          }

          const xPixel = (x - edgeLeft) * xSpacing;
          const yPixel = height - (y - edgeBottom) * ySpacing;

          newHoldsData.push({
            id: holdId,
            mirroredHoldId,
            cx: xPixel,
            cy: yPixel,
            r: xSpacing * 4,
            ...parsedLitUpHolds[holdId],
          });
        });
      }

      setHoldsData(newHoldsData);
    }
  }, [imageDimensions, imagesToHolds, edgeLeft, edgeRight, edgeBottom, edgeTop, parsedLitUpHolds]);

  const handleCircleClick = (id: number) => {
    setHoldsData((prevHolds) =>
      prevHolds.map((hold) =>
        hold.id === id
          ? {
              ...hold,
              state: getNextHoldState(hold.state),
            }
          : hold,
      ),
    );
  };

  const getNextHoldState = (currentState: HoldState): HoldState => {
    switch (currentState) {
      case 'OFF':
        return 'STARTING';
      case 'STARTING':
        return 'HAND'
      case 'HAND':
        return 'FOOT'
      case 'FOOT':
        return 'FINISH';
      default:
        return 'OFF';
    }
  };

  const firstImageDimensions = Object.values(imageDimensions)[0] as { width: number; height: number } | undefined;

  const viewBoxWidth = firstImageDimensions?.width || 0;
  const viewBoxHeight = firstImageDimensions?.height || 0;
  
  return (
    <svg onClick={onBoardClick}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {Object.keys(imagesToHolds).map((imageUrl) => (
        <image key={imageUrl} href={getImageUrl(imageUrl, board)} width="100%" height="100%" />
      ))}
      {holdsData
        .filter((hold) => editEnabled || hold.state !== 'OFF')
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
            onClick={editEnabled ? () => handleCircleClick(hold.id) : undefined}
          />
        ))}
    </svg>
  );
};

export default KilterBoard;
