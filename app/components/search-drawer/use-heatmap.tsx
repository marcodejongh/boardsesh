import { useEffect, useState } from 'react';
import { BoardName, SearchRequestPagination } from '@/app/lib/types';
import { HeatmapData } from '../board-renderer/types';
import { searchParamsToUrlParams } from '@/app/lib/url-utils';
import { useBoardProvider } from '../board-provider/board-provider-context';

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
  const { token, user_id } = useBoardProvider();

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

        const response = await fetch(
          `/api/v1/${boardName}/${layoutId}/${sizeId}/${setIds}/${angle}/heatmap?${searchParamsToUrlParams(filters).toString()}`,
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
  }, [boardName, layoutId, sizeId, setIds, angle, filters, token, user_id, enabled]);

  return { data: heatmapData, loading, error };
}
