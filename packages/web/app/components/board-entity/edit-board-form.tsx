'use client';

import React, { useCallback } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  UPDATE_BOARD,
  type UpdateBoardMutationVariables,
  type UpdateBoardMutationResponse,
} from '@/app/lib/graphql/operations';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { BoardName } from '@/app/lib/types';
import { ANGLES } from '@/app/lib/board-data';
import BoardForm from './board-form';

interface EditBoardFormProps {
  board: UserBoard;
  onSuccess?: (board: UserBoard) => void;
  onCancel?: () => void;
}

export default function EditBoardForm({ board, onSuccess, onCancel }: EditBoardFormProps) {
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const availableAngles = ANGLES[board.boardType as BoardName] ?? [];

  const handleSubmit = useCallback(
    async (values: { name: string; slug?: string; description: string; locationName: string; isPublic: boolean; isOwned: boolean; angle?: number; isAngleAdjustable?: boolean }) => {
      if (!token) {
        showMessage('You must be signed in', 'error');
        return;
      }

      if (!values.name) {
        showMessage('Board name is required', 'error');
        return;
      }

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<UpdateBoardMutationResponse, UpdateBoardMutationVariables>(
          UPDATE_BOARD,
          {
            input: {
              boardUuid: board.uuid,
              name: values.name,
              slug: values.slug || undefined,
              description: values.description || undefined,
              locationName: values.locationName || undefined,
              isPublic: values.isPublic,
              isOwned: values.isOwned,
              angle: values.angle,
              isAngleAdjustable: values.isAngleAdjustable,
            },
          },
        );

        showMessage('Board updated!', 'success');
        onSuccess?.(data.updateBoard);
      } catch (error) {
        console.error('Failed to update board:', error);
        showMessage('Failed to update board', 'error');
      }
    },
    [token, board.uuid, showMessage, onSuccess],
  );

  return (
    <BoardForm
      title="Edit Board"
      submitLabel="Save Changes"
      initialValues={{
        name: board.name,
        slug: board.slug,
        description: board.description ?? '',
        locationName: board.locationName ?? '',
        isPublic: board.isPublic,
        isOwned: board.isOwned,
        angle: board.angle,
        isAngleAdjustable: board.isAngleAdjustable,
      }}
      showSlugField
      availableAngles={availableAngles}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
