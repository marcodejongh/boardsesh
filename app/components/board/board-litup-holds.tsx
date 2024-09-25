import React, { useMemo } from "react";
import { HoldRenderData, LitUpHolds, LitUpHoldsMap } from "./types";
import { BoardName } from "@/app/lib/types";
import { convertLitUpHoldsStringToMap } from "./util";

interface BoardLitupHoldsProps {
  holdsData: HoldRenderData[];
  litUpHoldsMap: LitUpHoldsMap;
}

const BoardLitupHolds: React.FC<BoardLitupHoldsProps> = ({ holdsData, litUpHoldsMap }) => {
  if(!holdsData) return null
  return (
    <>
      {holdsData
        .filter(({ id }) => litUpHoldsMap[id]?.state && litUpHoldsMap[id].state !== 'OFF') // Apply the lit-up state
        .map((hold) => (
          <circle
            key={hold.id}
            id={`hold-${hold.id}`}
            data-mirror-id={hold.mirroredHoldId || undefined}
            cx={hold.cx}
            cy={hold.cy}
            r={hold.r}
            stroke={litUpHoldsMap[hold.id].color}
            strokeWidth={6}
            fillOpacity={0}
          />
        ))}
    </>
  );
};

export default BoardLitupHolds;
