'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWsAuthToken } from './use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SAVE_TICK,
  type SaveTickMutationVariables,
  type SaveTickMutationResponse,
} from '@/app/lib/graphql/operations';
import type { BoardName } from '@/app/lib/types';
import type { TickStatus, LogbookEntry } from './use-logbook';

// Options for saving a tick (local storage, no Aurora required)
export interface SaveTickOptions {
  climbUuid: string;
  angle: number;
  isMirror: boolean;
  status: TickStatus;
  attemptCount: number;
  quality?: number;
  difficulty?: number;
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
  sessionId?: string;
  layoutId?: number;
  sizeId?: number;
  setIds?: string;
}

/**
 * Hook to save a tick (logbook entry) via GraphQL mutation.
 * Provides optimistic updates and automatic cache invalidation.
 */
export function useSaveTick(boardName: BoardName) {
  const { token } = useWsAuthToken();
  const { status: sessionStatus } = useSession();
  const { showMessage } = useSnackbar();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SaveTickOptions) => {
      if (sessionStatus !== 'authenticated') {
        throw new Error('Not authenticated');
      }

      const client = createGraphQLHttpClient(token);
      const variables: SaveTickMutationVariables = {
        input: {
          boardType: boardName,
          climbUuid: options.climbUuid,
          angle: options.angle,
          isMirror: options.isMirror,
          status: options.status,
          attemptCount: options.attemptCount,
          quality: options.quality,
          difficulty: options.difficulty,
          isBenchmark: options.isBenchmark,
          comment: options.comment,
          climbedAt: options.climbedAt,
          sessionId: options.sessionId,
          layoutId: options.layoutId,
          sizeId: options.sizeId,
          setIds: options.setIds,
        },
      };

      const response = await client.request<SaveTickMutationResponse>(SAVE_TICK, variables);
      return response.saveTick;
    },
    onMutate: async (options) => {
      // Cancel outgoing logbook queries
      await queryClient.cancelQueries({ queryKey: ['logbook', boardName] });

      // Create optimistic entry
      const tempUuid = `temp-${Date.now()}`;
      const optimisticEntry: LogbookEntry = {
        uuid: tempUuid,
        climb_uuid: options.climbUuid,
        angle: options.angle,
        is_mirror: options.isMirror,
        user_id: 0,
        attempt_id: 0,
        tries: options.attemptCount,
        quality: options.quality ?? null,
        difficulty: options.difficulty ?? null,
        is_benchmark: options.isBenchmark,
        is_listed: true,
        comment: options.comment,
        climbed_at: options.climbedAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        wall_uuid: null,
        is_ascent: options.status === 'flash' || options.status === 'send',
        status: options.status,
        aurora_synced: false,
      };

      // Optimistically update all matching logbook queries
      queryClient.setQueriesData<LogbookEntry[]>(
        { queryKey: ['logbook', boardName] },
        (old) => (old ? [optimisticEntry, ...old] : [optimisticEntry]),
      );

      return { tempUuid };
    },
    onSuccess: (savedTick, _options, context) => {
      // Replace temp entry with real data
      if (context?.tempUuid) {
        queryClient.setQueriesData<LogbookEntry[]>(
          { queryKey: ['logbook', boardName] },
          (old) =>
            old?.map((entry) =>
              entry.uuid === context.tempUuid
                ? { ...entry, uuid: savedTick.uuid, created_at: savedTick.createdAt, updated_at: savedTick.updatedAt }
                : entry,
            ),
        );
      }
    },
    onError: (err, _options, context) => {
      // Rollback optimistic update
      if (context?.tempUuid) {
        queryClient.setQueriesData<LogbookEntry[]>(
          { queryKey: ['logbook', boardName] },
          (old) => old?.filter((entry) => entry.uuid !== context.tempUuid),
        );
      }

      let errorMessage = 'Failed to save tick';
      if (err instanceof Error) {
        if ('response' in err && typeof err.response === 'object' && err.response !== null) {
          const response = err.response as { errors?: Array<{ message: string }> };
          if (response.errors && response.errors.length > 0) {
            errorMessage = response.errors[0].message;
          }
        } else {
          errorMessage = err.message;
        }
      }
      showMessage(errorMessage, 'error');
    },
  });
}
