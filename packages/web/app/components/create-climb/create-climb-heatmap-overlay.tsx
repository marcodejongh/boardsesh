'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { BoardDetails, SearchRequestPagination } from '@/app/lib/types';
import { HeatmapData, LitUpHoldsMap, HoldState } from '../board-renderer/types';
import { scaleLog } from 'd3-scale';
import useHeatmapData from '../search-drawer/use-heatmap';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';

const BLUR_RADIUS = 10;
const HEAT_RADIUS_MULTIPLIER = 2;
const DEBOUNCE_DELAY_MS = 500;

// Color palette for heatmap
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
  '#d32f2f', // Deep Red
];

interface CreateClimbHeatmapOverlayProps {
  boardDetails: BoardDetails;
  angle: number;
  litUpHoldsMap: LitUpHoldsMap;
  opacity: number;
  enabled: boolean;
}

const CreateClimbHeatmapOverlay: React.FC<CreateClimbHeatmapOverlayProps> = ({
  boardDetails,
  angle,
  litUpHoldsMap,
  opacity,
  enabled,
}) => {
  const { boardWidth, boardHeight, holdsData } = boardDetails;

  // Debounce litUpHoldsMap to prevent rapid API calls when selecting multiple holds
  const [debouncedHoldsMap, setDebouncedHoldsMap] = useState(litUpHoldsMap);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHoldsMap(litUpHoldsMap);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [litUpHoldsMap]);

  // Determine which hold types are currently selected to auto-select heatmap mode
  // Uses debouncedHoldsMap to stay in sync with the API query and avoid stale data
  const selectedHoldTypes = useMemo(() => {
    const types = new Set<HoldState>();
    Object.values(debouncedHoldsMap).forEach((hold) => {
      if (hold.state !== 'OFF') {
        types.add(hold.state);
      }
    });
    return types;
  }, [debouncedHoldsMap]);

  // Create filters that include the selected holds - uses debounced value to limit API calls
  const filters: SearchRequestPagination = useMemo(() => ({
    ...DEFAULT_SEARCH_PARAMS,
    holdsFilter: debouncedHoldsMap,
  }), [debouncedHoldsMap]);

  // Fetch heatmap data with holds filter
  const { data: heatmapData = [], loading } = useHeatmapData({
    boardName: boardDetails.board_name,
    layoutId: boardDetails.layout_id,
    sizeId: boardDetails.size_id,
    setIds: boardDetails.set_ids.join(','),
    angle,
    filters,
    enabled,
  });

  const heatmapMap = useMemo(
    () => new Map(heatmapData?.map((data) => [data.holdId, data]) || []),
    [heatmapData],
  );

  // Get value based on the selected hold types - memoized to avoid stale closures
  const getValue = useMemo(() => {
    return (data: HeatmapData | undefined): number => {
      if (!data) return 0;

      // If specific hold types are selected, sum up their usage
      if (selectedHoldTypes.size > 0) {
        let total = 0;
        if (selectedHoldTypes.has('STARTING')) total += data.startingUses;
        if (selectedHoldTypes.has('HAND')) total += data.handUses;
        if (selectedHoldTypes.has('FOOT')) total += data.footUses;
        if (selectedHoldTypes.has('FINISH')) total += data.finishUses;
        return total || data.totalUses; // Fallback to total if no specific types
      }

      // Default to total uses
      return data.totalUses;
    };
  }, [selectedHoldTypes]);

  // Create color and opacity scales
  const { colorScale, opacityScale } = useMemo(() => {
    const values = heatmapData
      .filter((data) => !litUpHoldsMap?.[data.holdId])
      .map((data) => getValue(data))
      .filter((val) => val && val >= 1)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        colorScale: () => 'transparent',
        opacityScale: () => 0,
      };
    }

    const min = Math.max(1, values[0]);
    const max = values[values.length - 1];

    // Use log scale for better distribution
    const logScale = scaleLog()
      .domain([min, max])
      .range([0, HEATMAP_COLORS.length - 1])
      .clamp(true);

    return {
      colorScale: (value: number) => {
        if (!value || value < 1) return 'transparent';
        const index = Math.floor(logScale(value));
        return HEATMAP_COLORS[index];
      },
      opacityScale: (value: number) => {
        if (!value || value < 1) return 0;
        return Math.max(0.3, Math.min(0.8, logScale(value) / HEATMAP_COLORS.length));
      },
    };
  }, [heatmapData, litUpHoldsMap, getValue]);

  // Guard against missing data
  if (!holdsData || holdsData.length === 0) {
    return null;
  }

  // Use unique filter IDs to avoid conflicts with other SVGs on the page
  const backgroundBlurFilterId = 'create-climb-heatmap-bg-blur';
  const foregroundGlowFilterId = 'create-climb-heatmap-fg-glow';

  // Always render the SVG container to prevent layout shifts, but hide content when not enabled or loading
  const showContent = enabled && !loading;

  return (
    <svg
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: showContent ? opacity : 0,
        visibility: showContent ? 'visible' : 'hidden',
      }}
    >
      <defs>
        <filter id={backgroundBlurFilterId}>
          <feGaussianBlur stdDeviation={BLUR_RADIUS} />
        </filter>
        <filter id={foregroundGlowFilterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* Blurred background layer - creates diffuse glow effect */}
      <g filter={`url(#${backgroundBlurFilterId})`}>
        {holdsData.map((hold) => {
          // Skip holds that are already selected
          if (litUpHoldsMap[hold.id]) return null;

          const data = heatmapMap.get(hold.id);
          const value = getValue(data);

          if (value < 1) return null;

          return (
            <circle
              key={`heat-blur-${hold.id}`}
              cx={hold.cx}
              cy={hold.cy}
              r={hold.r * HEAT_RADIUS_MULTIPLIER}
              fill={colorScale(value)}
              opacity={opacityScale(value) * 0.5}
            />
          );
        })}
      </g>

      {/* Foreground circles with soft glow edges */}
      {holdsData.map((hold) => {
        // Skip holds that are already selected
        if (litUpHoldsMap[hold.id]) return null;

        const data = heatmapMap.get(hold.id);
        const value = getValue(data);

        if (value < 1) return null;

        return (
          <circle
            key={`heat-fg-${hold.id}`}
            cx={hold.cx}
            cy={hold.cy}
            r={hold.r}
            fill={colorScale(value)}
            opacity={opacityScale(value)}
            filter={`url(#${foregroundGlowFilterId})`}
          />
        );
      })}
    </svg>
  );
};

export default CreateClimbHeatmapOverlay;
