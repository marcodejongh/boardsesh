'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsAuthToken } from './use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_TICKS,
  type GetTicksQueryVariables,
  type GetTicksQueryResponse,
} from '@/app/lib/graphql/operations';
import type { BoardName, ClimbUuid } from '@/app/lib/types';

// Tick status type matching the database enum
export type TickStatus = 'flash' | 'send' | 'attempt';

// Logbook entry that works for both local ticks and legacy Aurora entries
export interface LogbookEntry {
  uuid: string;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  user_id: number;
  attempt_id: number;
  tries: number;
  quality: number | null;
  difficulty: number | null;
  is_benchmark: boolean;
  is_listed: boolean;
  comment: string;
  climbed_at: string;
  created_at: string;
  updated_at: string;
  wall_uuid: string | null;
  is_ascent: boolean;
  status?: TickStatus;
  aurora_synced?: boolean;
}

function transformTicks(ticks: GetTicksQueryResponse['ticks']): LogbookEntry[] {
  return ticks.map((tick) => ({
    uuid: tick.uuid,
    climb_uuid: tick.climbUuid,
    angle: tick.angle,
    is_mirror: tick.isMirror,
    user_id: 0,
    attempt_id: 0,
    tries: tick.attemptCount,
    quality: tick.quality,
    difficulty: tick.difficulty,
    is_benchmark: tick.isBenchmark,
    is_listed: true,
    comment: tick.comment,
    climbed_at: tick.climbedAt,
    created_at: tick.createdAt,
    updated_at: tick.updatedAt,
    wall_uuid: null,
    is_ascent: tick.status === 'flash' || tick.status === 'send',
    status: tick.status,
    aurora_synced: tick.auroraId !== null,
  }));
}

export function logbookQueryKey(boardName: BoardName, climbUuids: ClimbUuid[]) {
  return ['logbook', boardName, [...climbUuids].sort().join(',')] as const;
}

/**
 * Hook to fetch logbook entries (ticks) for specific climbs.
 * Uses TanStack Query for caching and deduplication.
 */
export function useLogbook(boardName: BoardName, climbUuids: ClimbUuid[]) {
  const { token } = useWsAuthToken();
  const { status: sessionStatus } = useSession();

  const query = useQuery({
    queryKey: logbookQueryKey(boardName, climbUuids),
    queryFn: async (): Promise<LogbookEntry[]> => {
      const client = createGraphQLHttpClient(token!);
      const variables: GetTicksQueryVariables = {
        input: {
          boardType: boardName,
          climbUuids: climbUuids.length > 0 ? climbUuids : undefined,
        },
      };
      const response = await client.request<GetTicksQueryResponse>(GET_TICKS, variables);
      return transformTicks(response.ticks);
    },
    enabled: sessionStatus === 'authenticated' && !!token && climbUuids.length > 0,
    staleTime: 30 * 1000,
  });

  return {
    logbook: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Returns a function to invalidate logbook queries for a given board.
 */
export function useInvalidateLogbook(boardName: BoardName) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['logbook', boardName] });
}
