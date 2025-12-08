import { useEffect, useState } from 'react';
import { BoardName, SearchRequestPagination } from '@/app/lib/types';
import { HeatmapData } from '../board-renderer/types';
import { searchParamsToUrlParams } from '@/app/lib/url-utils';
import { useBoardProvider } from '../board-provider/board-provider-context';

// Filter type for holds with their states (used in create climb heatmap)
export interface HoldsWithStateFilter {
  [holdId: string]: string; // holdId -> HoldState (STARTING, HAND, FOOT, FINISH)
}

interface UseHeatmapDataProps {
  boardName: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  filters: SearchRequestPagination;
  enabled?: boolean;
  holdsWithState?: HoldsWithStateFilter; // Optional filter for create climb heatmap
}

export default function useHeatmapData({
  boardName,
  layoutId,
  sizeId,
  setIds,
  angle,
  filters,
  enabled = true,
  holdsWithState,
}: UseHeatmapDataProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { token, user_id } = useBoardProvider();

  // Serialize objects for stable comparison in useEffect
  const holdsWithStateKey = holdsWithState ? JSON.stringify(holdsWithState) : '';
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    // Don't fetch if not enabled
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchHeatmapData = async () => {
      try {
        // Prepare headers
        const headers: Record<string, string> = {};

        // Add authentication headers if available
        if (token && user_id) {
          headers['x-auth-token'] = token;
          headers['x-user-id'] = user_id.toString();
        }

        // Build URL with query params
        const urlParams = searchParamsToUrlParams(filters);

        // Add holdsWithState filter if provided and has entries
        if (holdsWithState && Object.keys(holdsWithState).length > 0) {
          urlParams.set('holdsWithState', JSON.stringify(holdsWithState));
        }

        const response = await fetch(
          `/api/v1/${boardName}/${layoutId}/${sizeId}/${setIds}/${angle}/heatmap?${urlParams.toString()}`,
          { headers },
        );

        if (cancelled) return;

        if (!response.ok) {
          throw new Error('Failed to fetch heatmap data');
        }

        const data = await response.json();

        if (cancelled) return;

        setHeatmapData(data.holdStats);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error fetching heatmap data:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHeatmapData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardName, layoutId, sizeId, setIds, angle, filtersKey, token, user_id, enabled, holdsWithStateKey]);

  return { data: heatmapData, loading, error };
}
