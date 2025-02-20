import { useEffect, useState } from 'react';
import { BoardName } from '@/app/lib/types';
import { searchParamsToUrlParams } from '@/app/lib/url-utils';

interface UseHeatmapDataProps {
  boardName: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  filters: Record<string, any>;
}

export default function useHeatmapData({ 
  boardName, 
  layoutId, 
  sizeId, 
  setIds,
  angle, 
  filters 
}: UseHeatmapDataProps) {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
              
        // Use the same URL structure as your search endpoint
        const response = await fetch(
          `/api/v1/${boardName}/${layoutId}/${sizeId}/${setIds}/${angle}/heatmap?${searchParamsToUrlParams(filters).toString()}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch heatmap data');
        }
        
        const data = await response.json();
        setHeatmapData(data.holdStats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Error fetching heatmap data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [boardName, layoutId, sizeId, setIds, angle, filters]);

  return { data: heatmapData, loading, error };
}