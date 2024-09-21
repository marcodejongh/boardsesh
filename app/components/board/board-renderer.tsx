import React, { useMemo } from "react";
import { HoldTuple } from "@/lib/types";
import { BoardProps as BoardRendererPropsProps, HoldRenderData } from "./types";
import { getBoardImageDimensions, convertLitUpHoldsStringToMap, getImageUrl } from "./util";

const BoardRenderer = ({
  litUpHolds = "",
  boardDetails,
  board
}: BoardRendererPropsProps) => {
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

export default BoardRenderer;
