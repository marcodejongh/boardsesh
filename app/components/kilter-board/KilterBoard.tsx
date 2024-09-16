import React, { useEffect, useState, useMemo } from "react";
import { HoldTuple } from "../rest-api/types";
import { KilterBoardProps } from "./types";

const getImageUrl = (imageUrl) => `/images/${imageUrl}`;

type HoldsArray = Array<{ id: number; mirroredHoldId: number | null; cx: number; cy: number; r: number; state: string }>
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
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
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

    const litUpHoldsMap = {};

    if (litUpHolds) {
      litUpHolds.split("p").forEach((holdData) => {
        if (holdData) {
          const [holdId, stateCode] = holdData.split("r");
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
      const newHoldsData = [];

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

  const handleCircleClick = (id) => {
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

  const getNextHoldState = (currentState) => {
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
            stroke={holdColours[hold.state]}
            strokeWidth={6}
            fillOpacity={0}
            onClick={editEnabled ? () => handleCircleClick(hold.id) : null}
          />
        ))}
    </svg>
  );
};

export default KilterBoard;
