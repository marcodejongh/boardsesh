import React, { useMemo, useState } from 'react';
import { getImageUrl } from './util';
import { BoardDetails } from '@/app/lib/types';
import { HoldHeatmapData } from '@/app/lib/db/queries/holds-heatmap';
import { LitUpHoldsMap } from './types';
import { scaleLinear } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';

const LEGEND_HEIGHT = 80;
const BLUR_RADIUS = 8;
const HEAT_RADIUS_MULTIPLIER = 2;

// Changed colors to go from blue to green
const LOW_COLOR = '#4444ff';    // Blue for low values
const HIGH_COLOR = '#44ff44';   // Green for high values

interface BoardHeatmapProps {
  boardDetails: BoardDetails;
  heatmapData: HoldHeatmapData[];
  litUpHoldsMap: LitUpHoldsMap;
  onHoldClick?: (holdId: number) => void;
  colorMode?: 'total' | 'starting' | 'hand' | 'foot' | 'finish' | 'difficulty';
}

const BoardHeatmap: React.FC<BoardHeatmapProps> = ({
  boardDetails,
  heatmapData,
  litUpHoldsMap,
  onHoldClick,
  colorMode = 'total'
}) => {
  const [threshold, setThreshold] = useState(1);
  const { boardWidth, boardHeight, holdsData } = boardDetails;

  const heatmapMap = useMemo(() => new Map(heatmapData.map(data => [data.holdId, data])), [heatmapData]);

  const getValue = (data: HoldHeatmapData | undefined) => {
    if (!data) return 0;
    switch (colorMode) {
      case 'starting': return data.startingUses;
      case 'hand': return data.handUses;
      case 'foot': return data.footUses;
      case 'finish': return data.finishUses;
      case 'difficulty': return data.averageDifficulty;
      default: return data.totalUses;
    }
  };

  // Create scales for better distribution of colors
  const { colorScale, opacityScale } = useMemo(() => {
    const values = heatmapData
      .filter(data => !litUpHoldsMap[data.holdId])
      .map(data => getValue(data))
      .filter(val => val >= threshold)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        colorScale: () => '#eee',
        opacityScale: () => 0.1
      };
    }

    const p90Index = Math.floor(values.length * 0.90);
    const maxValue = values[p90Index] || values[values.length - 1];
    const minValue = values[0];

    const getColorScale = () => {
      return (value: number) => {
        const cappedValue = Math.min(value, maxValue);
        const normalized = (cappedValue - minValue) / (maxValue - minValue);
        // Direct interpolation from blue to green
        return interpolateRgb(LOW_COLOR, HIGH_COLOR)(normalized);
      };
    };

    const getOpacityScale = () => {
      return scaleLinear()
        .domain([minValue, maxValue])
        .range([0.1, 0.3]) // Reduced opacity range
        .clamp(true);
    };

    return {
      colorScale: getColorScale(),
      opacityScale: getOpacityScale()
    };
  }, [heatmapData, colorMode, threshold, litUpHoldsMap]);

  const ColorLegend = () => {
    const gradientId = "heatmap-gradient";
    const legendWidth = 200;
    const legendHeight = 20;
    const x = (boardWidth - legendWidth) / 2;
    const y = boardHeight + 20;

    return (
      <g transform={`translate(${x}, ${y})`}>
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="0%" stopColor={LOW_COLOR} />
            <stop offset="100%" stopColor={HIGH_COLOR} />
          </linearGradient>
        </defs>
        <rect
          width={legendWidth}
          height={legendHeight}
          fill={`url(#${gradientId})`}
          rx={4}
        />
        <text x="0" y="-5" fontSize="12" textAnchor="start">Low Usage</text>
        <text x={legendWidth} y="-5" fontSize="12" textAnchor="end">High Usage</text>
      </g>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter holds by minimum usage:
        </label>
        <select
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value={1}>Show All</option>
          <option value={2}>At Least 2 Uses</option>
          <option value={5}>At Least 5 Uses</option>
          <option value={10}>At Least 10 Uses</option>
        </select>
      </div>
      
      <svg
        viewBox={`0 0 ${boardWidth} ${boardHeight + LEGEND_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto max-h-[55vh]"
      >
        <defs>
          <filter id="blur">
            <feGaussianBlur stdDeviation={BLUR_RADIUS} />
          </filter>
        </defs>
        
        <g>
          {/* Board background images */}
          {Object.keys(boardDetails.images_to_holds).map((imageUrl) => (
            <image
              key={imageUrl}
              href={getImageUrl(imageUrl, boardDetails.board_name)}
              width="100%"
              height={boardHeight}
            />
          ))}

          {/* Heat overlay with blur effect */}
          <g style={{ mixBlendMode: 'multiply' }}>
            {/* Blurred background layer */}
            <g filter="url(#blur)">
              {holdsData.map((hold) => {
                const data = heatmapMap.get(hold.id);
                const value = getValue(data);
                
                if (value < threshold) return null;
                
                return (
                  <circle
                    key={`heat-blur-${hold.id}`}
                    cx={hold.cx}
                    cy={hold.cy}
                    r={hold.r * HEAT_RADIUS_MULTIPLIER}
                    fill={colorScale(value)}
                    opacity={opacityScale(value) * 0.7}
                  />
                );
              })}
            </g>
            <filter id="blurMe">
              <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
            </filter>

            {/* Sharp circles with numbers */}
            {holdsData.map((hold) => {
              const data = heatmapMap.get(hold.id);
              const value = getValue(data);
              
              if (value < threshold) return null;
              
              return (
                <g key={`heat-sharp-${hold.id}`}>
                  <circle
                    cx={hold.cx}
                    cy={hold.cy}
                    r={hold.r * 1.4}
                    
                    fill={colorScale(value)}
                    opacity={opacityScale(value)}
                    filter="url(#blurMe)"
                  />
                  <text
                    x={hold.cx}
                    y={hold.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(8, hold.r * 0.6)}
                    fontWeight="bold"
                    fill={'#000'}
                    style={{ userSelect: 'none' }}
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Interaction layer */}
          {holdsData.map((hold) => (
            <circle
              key={`click-${hold.id}`}
              cx={hold.cx}
              cy={hold.cy}
              r={hold.r}
              fill="transparent"
              className="cursor-pointer"
              onClick={onHoldClick ? () => onHoldClick(hold.id) : undefined}
            />
          ))}

          {/* Selected holds overlay */}
          {holdsData.map((hold) => {
            const litUpHold = litUpHoldsMap[hold.id];
            if (!litUpHold) return null;
            return (
              <circle
                key={`selected-${hold.id}`}
                cx={hold.cx}
                cy={hold.cy}
                r={hold.r}
                stroke={litUpHold.color}
                strokeWidth="4"
                fill="none"
                className="transition-colors duration-200"
              />
            );
          })}

          <ColorLegend />
        </g>
      </svg>
    </div>
  );
};

export default BoardHeatmap;