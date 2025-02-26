import React, { useEffect, useMemo, useState } from 'react';
import { getImageUrl } from './util';
import { BoardDetails } from '@/app/lib/types';
import { HoldHeatmapData } from '@/app/lib/db/queries/holds-heatmap';
import { LitUpHoldsMap } from './types';
import { scaleLinear } from 'd3-scale';
import useHeatmapData from '../search-drawer/use-heatmap';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';

const LEGEND_HEIGHT = 80;
const BLUR_RADIUS = 10; // Increased blur radius
const HEAT_RADIUS_MULTIPLIER = 2; // Increased radius multiplier

// Updated color constants with more yellow/orange for middle values
const HEATMAP_COLORS = [
  '#4caf50', // Light green
  '#8bc34a', // Lime green
  '#cddc39', // Lime
  '#ffeb3b', // Yellow
  '#ffc107', // Amber
  '#ff9800', // Orange
  '#ff7043', // Deep Orange
  '#ff5722', // Darker Orange
  '#f44336', // Light Red
  '#d32f2f'  // Deep Red
];

// Helper function to get value at percentile
const getPercentileValue = (values: number[], percentile: number) => {
  const index = Math.floor(values.length * (percentile / 100));
  return values[index];
};

interface BoardHeatmapProps {
  boardDetails: BoardDetails;
  litUpHoldsMap?: LitUpHoldsMap;
  onHoldClick?: (holdId: number) => void;
  colorMode?: 'total' | 'starting' | 'hand' | 'foot' | 'finish' | 'difficulty';
}

const BoardHeatmap: React.FC<BoardHeatmapProps> = ({
  boardDetails,
  litUpHoldsMap,
  onHoldClick,
  colorMode = 'total'
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { uiSearchParams } = useUISearchParams();
  
  useEffect(() => {
      const path = pathname.split('/');
      const angle = Number(path[path.length - 2]);
      if (typeof angle === 'number') {
        setAngle(angle);
      }
    }, [pathname, searchParams])
    const [angle, setAngle] = React.useState(40);
    
  const { data: heatmapData = [] } = useHeatmapData({
    boardName: boardDetails.board_name,
    layoutId: boardDetails.layout_id,
    sizeId: boardDetails.size_id, // Add this line
    setIds: boardDetails.set_ids.join(','),
    angle,
    filters: uiSearchParams
  });

  const [threshold, setThreshold] = useState(1);
  const { boardWidth, boardHeight, holdsData } = boardDetails;

  const heatmapMap = useMemo(() => 
    new Map(heatmapData?.map(data => [data.holdId, data]) || []), 
    [heatmapData]
  );

  const getValue = (data: HoldHeatmapData | undefined): number => {
    if (!data) return 0;
    switch (colorMode) {
      case 'starting': return data.startingUses;
      case 'hand': return data.handUses;
      case 'foot': return data.footUses;
      case 'finish': return data.finishUses;
      case 'difficulty': return data.averageDifficulty || 0;
      default: return data.totalUses;
    }
  };

  // Create scales for better distribution of colors
  const { colorScale, opacityScale } = useMemo(() => {
    const values = heatmapData
      .filter(data => !(litUpHoldsMap?.[data.holdId]))
      .map(data => getValue(data))
      .filter((val) => val && val >= threshold)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        colorScale: () => 'transparent',
        opacityScale: () => 0
      };
    }

    // Create breakpoints at different percentiles for more even distribution
    const percentileValues = {
      min: values[0],
      p20: getPercentileValue(values, 20),
      p40: getPercentileValue(values, 40),
      p60: getPercentileValue(values, 60),
      p80: getPercentileValue(values, 80),
      p95: getPercentileValue(values, 95),
      max: values[values.length - 1]
    };

    const getColorScale = () => {
      return (value: number) => {
        if (!value || value === 0) return 'transparent';
        
        // Map the value to color index based on which percentile bucket it falls into
        let normalizedIndex;
        if (value <= percentileValues.p20) {
          normalizedIndex = (value - percentileValues.min) / (percentileValues.p20 - percentileValues.min);
        } else if (value <= percentileValues.p40) {
          normalizedIndex = 2 + (value - percentileValues.p20) / (percentileValues.p40 - percentileValues.p20);
        } else if (value <= percentileValues.p60) {
          normalizedIndex = 4 + (value - percentileValues.p40) / (percentileValues.p60 - percentileValues.p40);
        } else if (value <= percentileValues.p80) {
          normalizedIndex = 6 + (value - percentileValues.p60) / (percentileValues.p80 - percentileValues.p60);
        } else {
          normalizedIndex = 8 + (value - percentileValues.p80) / (percentileValues.p95 - percentileValues.p80);
        }

        const index = Math.floor(normalizedIndex);
        return HEATMAP_COLORS[Math.max(0, Math.min(index, HEATMAP_COLORS.length - 1))];
      };
    };

    const getOpacityScale = () => {
      return (value: number) => {
        if (!value || value === 0) return 0;
        // Use percentile values for opacity scaling
        return Math.max(0.2, Math.min(0.8,
          scaleLinear()
            .domain([percentileValues.min, percentileValues.p95])
            .range([0.2, 0.8])
            .clamp(true)(value)
        ));
      };
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
            {HEATMAP_COLORS.map((color, index) => (
              <stop 
                key={color} 
                offset={`${(index / (HEATMAP_COLORS.length - 1)) * 100}%`} 
                stopColor={color} 
              />
            ))}
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
                
                if (value === 0 || value < threshold) return null;
                
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
                    r={hold.r}
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
            const litUpHold = litUpHoldsMap?.[hold.id];
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