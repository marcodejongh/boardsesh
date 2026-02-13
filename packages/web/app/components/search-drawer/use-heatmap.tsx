import { useEffect, useState, useMemo } from 'react';
import { BoardName, SearchRequestPagination } from '@/app/lib/types';
import { HeatmapData } from '../board-renderer/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import { GET_HOLD_HEATMAP, type GetHoldHeatmapQueryResponse, type GetHoldHeatmapQueryVariables } from '@/app/lib/graphql/operations';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';

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
  const { token: authToken } = useWsAuthToken();

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
        // Build holdsFilter as Record<string, string> for GraphQL
        const holdsFilter: Record<string, string> | undefined = filters.holdsFilter
          ? Object.fromEntries(
              Object.entries(filters.holdsFilter)
                .filter(([, v]) => v && typeof v === 'object' && 'state' in v)
                .map(([k, v]) => [k, (v as { state: string }).state])
            )
          : undefined;

        const variables: GetHoldHeatmapQueryVariables = {
          input: {
            boardName,
            layoutId,
            sizeId,
            setIds,
            angle,
            gradeAccuracy: filters.gradeAccuracy !== undefined ? String(filters.gradeAccuracy) : null,
            minGrade: filters.minGrade ?? null,
            maxGrade: filters.maxGrade ?? null,
            minAscents: filters.minAscents ?? null,
            minRating: filters.minRating ?? null,
            sortBy: filters.sortBy ?? null,
            sortOrder: filters.sortOrder ?? null,
            name: filters.name || null,
            settername: filters.settername && filters.settername.length > 0 ? filters.settername : null,
            onlyClassics: filters.onlyClassics || null,
            onlyTallClimbs: filters.onlyTallClimbs || null,
            holdsFilter: holdsFilter && Object.keys(holdsFilter).length > 0 ? holdsFilter : null,
            hideAttempted: filters.hideAttempted || null,
            hideCompleted: filters.hideCompleted || null,
            showOnlyAttempted: filters.showOnlyAttempted || null,
            showOnlyCompleted: filters.showOnlyCompleted || null,
          },
        };

        const data = await executeGraphQL<GetHoldHeatmapQueryResponse>(
          GET_HOLD_HEATMAP,
          variables,
          authToken ?? undefined,
        );

        if (cancelled) return;

        setHeatmapData(data.holdHeatmap.map((stat) => ({
          ...stat,
          userAscents: stat.userAscents ?? undefined,
          userAttempts: stat.userAttempts ?? undefined,
        })));
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
  }, [boardName, layoutId, sizeId, setIds, angle, filtersKey, enabled, authToken]);

  return { data: heatmapData, loading, error };
}
