import React, { useState, useMemo } from "react";
import { HoldTuple } from "@/lib/types";
import { KilterBoardProps } from "./types";
import { BOARD_IMAGE_DIMENSIONS } from "./board-data"; // Import the dimensions

const getImageUrl = (imageUrl: string) => `/images/${imageUrl}`;

type HoldsArray = Array<{ id: number; mirroredHoldId: number | null; cx: number; cy: number; r: number; state: string }>;

const KilterBoard = ({
  editEnabled = false,
  litUpHolds = "",
  imagesToHolds,
  edgeLeft = 24,
  edgeRight = 120,
  edgeBottom = 0,
  edgeTop = 156,
  onCircleClick = undefined,
  onBoardClick = undefined
}: KilterBoardProps) => {
  const [holdsData, setHoldsData] = useState<HoldsArray>([]);

  const holdStates = {
    OFF: "OFF",
    STARTING: "STARTING",
    HAND: "HAND",
    FOOT: "FOOT",
    FINISH: "FINISH",
  };

  const holdColours = {
    OFF: null,
    STARTING: "#00DD00",
    HAND: "#00FFFF",
    FOOT: "#FFA500",
    FINISH: "#FF00FF",
  };

  const parsedLitUpHolds = useMemo(() => {
    const holdStateMapping = {
      //TODO: Use rest api
      42: holdStates.STARTING,
      43: holdStates.HAND,
      44: holdStates.FINISH,
      45: holdStates.FOOT,
      12: holdStates.STARTING,
      13: holdStates.HAND,
      14: holdStates.FINISH,
      15: holdStates.FOOT,
    };

    const litUpHoldsMap: Record<number, string> = {};

    if (litUpHolds) {
      litUpHolds.split("p").forEach((holdData) => {
        if (holdData) {
          const [holdId, stateCode] = holdData.split("r");
          litUpHoldsMap[Number(holdId)] = holdStateMapping[stateCode];
        }
      });
    }

    return litUpHoldsMap;
  }, [litUpHolds]);

  const calculateHoldsData = () => {
    const newHoldsData: HoldsArray = [];

    for (const [imageUrl, holds] of Object.entries<HoldTuple[]>(imagesToHolds)) {
      const { width, height } = BOARD_IMAGE_DIMENSIONS[imageUrl];
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
  };

  // Call this function on mount or when imagesToHolds or other dependent values change
  useMemo(calculateHoldsData, [imagesToHolds, edgeLeft, edgeRight, edgeBottom, edgeTop, parsedLitUpHolds]);

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

const firstImageDimensions = Object.values(BOARD_IMAGE_DIMENSIONS)[0];

const viewBoxWidth = firstImageDimensions?.width || 0;
const viewBoxHeight = firstImageDimensions?.height || 0;

return (
  <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <svg
      onClick={onBoardClick}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", maxWidth: "100%", maxHeight: "100%" }}
    >
      {Object.keys(imagesToHolds).map((imageUrl) => {
        const { width, height } = BOARD_IMAGE_DIMENSIONS[imageUrl];
        return (
          <image
            key={imageUrl}
            href={getImageUrl(imageUrl)}
            width={width}
            height={height}
          />
        );
      })}
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
            stroke={holdColours[hold.state]}
            strokeWidth={6}
            fillOpacity={0}
            onClick={editEnabled ? () => handleCircleClick(hold.id) : null}
          />
        ))}
    </svg>
  </div>
);


};

export default KilterBoard;
