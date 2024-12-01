import React from 'react';
import { HoldRenderData } from './types';
import { Climb } from '@/app/lib/types';

interface BoardLitupHoldsProps {
  holdsData: HoldRenderData[];
  climb: Climb;
  thumbnail?: boolean;
}

const BoardLitupHolds: React.FC<BoardLitupHoldsProps> = ({
  holdsData,
  climb: { litUpHoldsMap, mirrored },
  thumbnail,
}) => {
  if (!holdsData) return null;

  return (
    <>
      {holdsData
        .filter(({ id }) => litUpHoldsMap[id]?.state && litUpHoldsMap[id].state !== 'OFF') // Apply the lit-up state
        .map((hold) => {
          const color = litUpHoldsMap[hold.id].color;
          if (mirrored) {
            const mirroredHold = holdsData.find(({ id }) => id === hold.mirroredHoldId);
            if (!mirroredHold) {
              throw new Error("Couldn't find mirrored hold");
            }
            hold = mirroredHold;
          }

          return (
            <circle
              key={hold.id}
              id={`hold-${hold.id}`}
              data-mirror-id={hold.mirroredHoldId || undefined}
              cx={hold.cx}
              cy={hold.cy}
              r={hold.r}
              stroke={color}
              strokeWidth={thumbnail ? 8 : 6}
              fillOpacity={thumbnail ? 1 : 0}
              fill={thumbnail ? color : undefined}
            />
<<<<<<< HEAD
          );
        })}
=======
        )})}
>>>>>>> 0e3e621 (Add Tension board mirror button fixes #16)
    </>
  );
};

export default BoardLitupHolds;
