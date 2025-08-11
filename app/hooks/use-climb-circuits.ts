import useSWR from 'swr';
import { BoardName, ClimbUuid } from '@/app/lib/types';
import { Circuit } from '@/app/lib/db/queries/circuits/get-circuits';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useClimbCircuits(boardName: BoardName | null, climbUuid: ClimbUuid | null, enabled: boolean = true) {
  const { data, error, isLoading } = useSWR(
    enabled && boardName && climbUuid ? `/api/internal/${boardName}/climbs/${climbUuid}/circuits` : null,
    fetcher
  );

  return {
    circuits: (data?.circuits || []) as Circuit[],
    isLoading,
    error,
  };
}