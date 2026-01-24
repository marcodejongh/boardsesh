'use client';

import React from 'react';
import {
  MOONBOARD_GRID,
  MOONBOARD_SIZE,
  getGridPosition,
  MOONBOARD_HOLD_STATES,
} from '@/app/lib/moonboard-config';
import { MoonBoardRendererProps } from './types';

const MoonBoardRenderer: React.FC<MoonBoardRendererProps> = ({
  layoutFolder,
  holdSetImages,
  litUpHoldsMap = {},
  mirrored = false,
  thumbnail = false,
  onHoldClick,
}) => {
  const { width, height } = MOONBOARD_SIZE;

  // Calculate hold circle radius based on grid cell size
  const cellWidth = width / MOONBOARD_GRID.numColumns;
  const cellHeight = height / MOONBOARD_GRID.numRows;
  const holdRadius = Math.min(cellWidth, cellHeight) * 0.35;

  // Generate all grid positions (198 holds: 11 cols x 18 rows)
  const gridHolds = React.useMemo(() => {
    const holds = [];
    for (let row = 1; row <= MOONBOARD_GRID.numRows; row++) {
      for (let colIdx = 0; colIdx < MOONBOARD_GRID.numColumns; colIdx++) {
        const holdId = (row - 1) * MOONBOARD_GRID.numColumns + colIdx + 1;
        const pos = getGridPosition(holdId);

        holds.push({
          id: holdId,
          cx: pos.x * width,
          cy: pos.y * height,
        });
      }
    }
    return holds;
  }, [width, height]);

  const getHoldColor = (holdId: number): string => {
    const hold = litUpHoldsMap[holdId];
    if (!hold) return 'transparent';

    // Use displayColor from the hold if available, otherwise map state to Moonboard colors
    if (hold.displayColor) return hold.displayColor;

    switch (hold.state) {
      case 'STARTING':
        return MOONBOARD_HOLD_STATES.start.displayColor;
      case 'HAND':
        return MOONBOARD_HOLD_STATES.hand.displayColor;
      case 'FINISH':
        return MOONBOARD_HOLD_STATES.finish.displayColor;
      default:
        return 'transparent';
    }
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        maxHeight: thumbnail ? '10vh' : '55vh',
        transform: mirrored ? 'scaleX(-1)' : undefined,
      }}
    >
      {/* Render MoonBoard background first */}
      <image
        href="/images/moonboard/moonboard-bg.png"
        width="100%"
        height="100%"
      />

      {/* Render hold set images as overlay layers */}
      {holdSetImages.map((imageFile) => (
        <image
          key={imageFile}
          href={`/images/moonboard/${layoutFolder}/${imageFile}`}
          width="100%"
          height="100%"
        />
      ))}

      {/* Render clickable grid holds */}
      {gridHolds.map((hold) => {
        const color = getHoldColor(hold.id);
        const isLitUp = color !== 'transparent';

        return (
          <circle
            key={hold.id}
            id={`hold-${hold.id}`}
            cx={hold.cx}
            cy={hold.cy}
            r={holdRadius}
            stroke={color}
            strokeWidth={thumbnail ? 8 : 6}
            fillOpacity={thumbnail && isLitUp ? 1 : 0}
            fill={thumbnail && isLitUp ? color : 'transparent'}
            style={{ cursor: onHoldClick ? 'pointer' : 'default' }}
            onClick={onHoldClick ? () => onHoldClick(hold.id) : undefined}
          />
        );
      })}
    </svg>
  );
};

export default MoonBoardRenderer;
