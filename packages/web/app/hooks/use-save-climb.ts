'use client';

import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useWsAuthToken } from './use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import {
  SAVE_CLIMB_MUTATION,
  type SaveClimbMutationVariables,
  type SaveClimbMutationResponse,
} from '@/app/lib/graphql/operations/new-climb-feed';
import { createGraphQLClient, execute } from '@/app/components/graphql-queue/graphql-client';
import type { BoardName } from '@/app/lib/types';
import type { SaveClimbOptions } from '@/app/lib/api-wrappers/aurora/types';

export interface SaveClimbResponse {
  uuid: string;
}

/**
 * Hook to save a new climb via GraphQL mutation.
 */
export function useSaveClimb(boardName: BoardName) {
  const { token } = useWsAuthToken();
  const { data: session, status: sessionStatus } = useSession();
  const { showMessage } = useSnackbar();

  // Use ref to always access the freshest token in async mutation callbacks
  const tokenRef = useRef(token);
  tokenRef.current = token;

  return useMutation({
    mutationFn: async (options: Omit<SaveClimbOptions, 'setter_id' | 'user_id'>): Promise<SaveClimbResponse> => {
      const currentToken = tokenRef.current;
      if (sessionStatus !== 'authenticated' || !session?.user?.id || !currentToken) {
        throw new Error('Authentication required to create climbs');
      }

      // Create a fresh client per mutation to avoid stale token refs.
      // The client is disposed immediately after the request completes.
      const client = createGraphQLClient({
        url: process.env.NEXT_PUBLIC_WS_URL!,
        authToken: currentToken,
      });

      try {
        const variables: SaveClimbMutationVariables = {
          input: {
            boardType: boardName,
            layoutId: options.layout_id,
            name: options.name,
            description: options.description || '',
            isDraft: options.is_draft,
            frames: options.frames,
            framesCount: options.frames_count,
            framesPace: options.frames_pace,
            angle: options.angle,
          },
        };

        const result = await execute<SaveClimbMutationResponse, SaveClimbMutationVariables>(
          client,
          { query: SAVE_CLIMB_MUTATION, variables },
        );

        return result.saveClimb;
      } finally {
        client.dispose();
      }
    },
    onError: () => {
      showMessage('Failed to save climb', 'error');
    },
  });
}
