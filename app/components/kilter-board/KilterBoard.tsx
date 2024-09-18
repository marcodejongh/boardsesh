import React, { useEffect, useState, useMemo } from "react";
import { HoldTuple } from "@/lib/types";
import { KilterBoardProps } from "./types";

const getImageUrl = (imageUrl: string) => `/images/${imageUrl}`;

const holdStates = {
  OFF: "OFF",
  STARTING: "STARTING",
  HAND: "HAND",
  FOOT: "FOOT",
  FINISH: "FINISH",
} as const;

const holdColours = {
  OFF: undefined,
  STARTING: "#00DD00",
  HAND: "#00FFFF",
  FOOT: "#FFA500",
  FINISH: "#FF00FF",
} as const;

function isValidHoldState(state: string): state is HoldState {
  return state in holdColours;
}

type HoldsArray = Array<{ id: number; mirroredHoldId: number | null; cx: number; cy: number; r: number; state: string }>
type HoldState = keyof typeof holdColours;

const KilterBoard = ({
  editEnabled = false,
  litUpHolds = "",
  boardDetails,
  onCircleClick,
  onBoardClick
}: KilterBoardProps) => {
  if (!boardDetails) {
    return;
  }
  const { images_to_holds: imagesToHolds, edge_bottom: edgeBottom, edge_left: edgeLeft, edge_right: edgeRight, edge_top: edgeTop } = boardDetails;
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const [holdsData, setHoldsData] = useState<HoldsArray>([]);


  const parsedLitUpHolds = useMemo(() => {
    const holdStateMapping: Record<number, string> = {
      //TODO: Use rest api
      //kilterhw
      42: holdStates.STARTING,
      43: holdStates.HAND,
      44: holdStates.FINISH,
      45: holdStates.FOOT,
      //kilter og
      12: holdStates.STARTING,
      13: holdStates.HAND,
      14: holdStates.FINISH,
      15: holdStates.FOOT,
    };

    const litUpHoldsMap: Record<number, string> = {};

    if (litUpHolds) {
      litUpHolds.split("p").forEach((holdData) => {
        if (holdData) {
          const [holdId, stateCode] = holdData.split("r").map(str => Number(str));
          litUpHoldsMap[holdId] = holdStateMapping[stateCode];
        }
      });
    }

    return litUpHoldsMap;
  }, [litUpHolds]);

  useEffect(() => {
    const loadImages = async () => {
      const dimensions: Record<string, { width: number; height: number }> = {};

      for (const imageUrl of Object.keys(imagesToHolds)) {
        const image = new Image();
        await new Promise<void>((resolve) => {
          image.onload = () => {
            dimensions[imageUrl] = { width: image.width, height: image.height };
            resolve(); // This is now correct, since Promise<void> expects no arguments
          };
          image.src = getImageUrl(imageUrl);
        });
      }

      setImageDimensions(dimensions);
    };

    loadImages();
  }, [imagesToHolds]);

  useEffect(() => {
    if (Object.keys(imageDimensions).length > 0) {
      const newHoldsData: {
            id: number,
            mirroredHoldId: number | null,
            cx: number,
            cy: number,
            r: number,
            state: string,
          }[] = [];

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
            state: parsedLitUpHolds[holdId] || holdStates.OFF,
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

  const getNextHoldState = (currentState: string) => {
    switch (currentState) {
      case holdStates.OFF:
        return holdStates.STARTING;
      case holdStates.STARTING:
        return holdStates.HAND;
      case holdStates.HAND:
        return holdStates.FOOT;
      case holdStates.FOOT:
        return holdStates.FINISH;
      default:
        return holdStates.OFF;
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
        <image key={imageUrl} href={getImageUrl(imageUrl)} width="100%" height="100%" />
      ))}
      {holdsData
        .filter((hold) => editEnabled || hold.state !== holdStates.OFF)
        .map((hold) => (
          <circle
            key={hold.id}
            id={`hold-${hold.id}`}
            data-mirror-id={hold.mirroredHoldId || undefined}
            cx={hold.cx}
            cy={hold.cy}
            r={hold.r}
            stroke={isValidHoldState(hold.state) ? holdColours[hold.state] : undefined}
            strokeWidth={6}
            fillOpacity={0}
            onClick={editEnabled ? () => handleCircleClick(hold.id) : undefined}
          />
        ))}
    </svg>
  );
};

export default KilterBoard;
