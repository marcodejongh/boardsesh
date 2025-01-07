import React from 'react';
import { HoldRenderData, LitUpHoldsMap } from './types';

interface BoardLitupHoldsProps {
  holdsData: HoldRenderData[];
  litUpHoldsMap: LitUpHoldsMap;
  mirrored: boolean;
  thumbnail?: boolean;
  onHoldClick?: (holdId: number) => void;
}

const BoardLitupHolds: React.FC<BoardLitupHoldsProps> = ({
  holdsData,
  litUpHoldsMap,
  mirrored,
  thumbnail,
  onHoldClick
}) => {
  if (!holdsData) return null;

  return (
    <>
      {holdsData.map((hold) => {
        const isLitUp = litUpHoldsMap[hold.id]?.state && litUpHoldsMap[hold.id].state !== 'OFF';
        const color = isLitUp ? litUpHoldsMap[hold.id].color : 'transparent';
        
        let renderHold = hold;
        if (mirrored && hold.mirroredHoldId) {
          const mirroredHold = holdsData.find(({ id }) => id === hold.mirroredHoldId);
          if (!mirroredHold) {
            throw new Error("Couldn't find mirrored hold");
          }
          renderHold = mirroredHold;
        }

        return (
          <circle
            key={renderHold.id}
            id={`hold-${renderHold.id}`}
            data-mirror-id={renderHold.mirroredHoldId || undefined}
            cx={renderHold.cx}
            cy={renderHold.cy}
            r={renderHold.r}
            stroke={color}
            strokeWidth={thumbnail ? 8 : 6}
            fillOpacity={thumbnail ? 1 : 0}
            fill={thumbnail ? color : undefined}
            style={{ cursor: onHoldClick ? 'pointer' : 'default' }}
            onClick={onHoldClick ? () => onHoldClick(renderHold.id) : undefined}
          />
        );
      })}
    </>
  );
};

export default BoardLitupHolds;