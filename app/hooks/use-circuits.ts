import useSWR from 'swr';
import { BoardName } from '@/app/lib/types';
import { Circuit } from '@/app/lib/db/queries/circuits/get-circuits';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCircuits(boardName: BoardName | null, enabled: boolean = true) {
  const { data, error, isLoading } = useSWR(
    enabled && boardName ? `/api/internal/${boardName}/circuits` : null,
    fetcher
  );

  return {
    circuits: (data?.circuits || []) as Circuit[],
    isLoading,
    error,
  };
}