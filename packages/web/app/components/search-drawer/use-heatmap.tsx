import { useEffect, useState, useMemo } from 'react';
import { BoardName, SearchRequestPagination } from '@/app/lib/types';
import { HeatmapData } from '../board-renderer/types';
import { searchParamsToUrlParams } from '@/app/lib/url-utils';

interface UseHeatmapDataProps {
  boardName: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  filters: SearchRequestPagination;
  enabled?: boolean;
}

export default function useHeatmapData({
  boardName,
  layoutId,
  sizeId,
  setIds,
  angle,
  filters,
  enabled = true,
}: UseHeatmapDataProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Serialize filters to create a stable dependency - prevents re-fetching
  // when object reference changes but contents are the same
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

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
        // Server uses NextAuth session for user-specific data
        const response = await fetch(
          `/api/v1/${boardName}/${layoutId}/${sizeId}/${setIds}/${angle}/heatmap?${searchParamsToUrlParams(filters).toString()}`,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filtersKey is a serialized version of filters
  }, [boardName, layoutId, sizeId, setIds, angle, filtersKey, enabled]);

  return { data: heatmapData, loading, error };
}
