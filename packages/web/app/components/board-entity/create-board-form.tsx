'use client';

import React, { useCallback } from 'react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  CREATE_BOARD,
  type CreateBoardMutationVariables,
  type CreateBoardMutationResponse,
} from '@/app/lib/graphql/operations';
import { useRouter } from 'next/navigation';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import type { UserBoard } from '@boardsesh/shared-schema';
import BoardForm from './board-form';

interface CreateBoardFormProps {
  boardType: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  defaultAngle: number;
  onSuccess?: (board: UserBoard) => void;
  onCancel?: () => void;
}

export default function CreateBoardForm({
  boardType,
  layoutId,
  sizeId,
  setIds,
  defaultAngle,
  onSuccess,
  onCancel,
}: CreateBoardFormProps) {
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const router = useRouter();

  const handleSubmit = useCallback(
    async (values: { name: string; description: string; locationName: string; isPublic: boolean; isOwned: boolean }) => {
      if (!token) {
        showMessage('You must be signed in to create a board', 'error');
        return;
      }

      if (!values.name) {
        showMessage('Board name is required', 'error');
        return;
      }

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<CreateBoardMutationResponse, CreateBoardMutationVariables>(
          CREATE_BOARD,
          {
            input: {
              boardType,
              layoutId,
              sizeId,
              setIds,
              name: values.name,
              description: values.description || undefined,
              locationName: values.locationName || undefined,
              isPublic: values.isPublic,
              isOwned: values.isOwned,
            },
          },
        );

        showMessage(`Board "${data.createBoard.name}" created!`, 'success');

        if (onSuccess) {
          onSuccess(data.createBoard);
        } else {
          router.push(constructBoardSlugListUrl(data.createBoard.slug, defaultAngle));
        }
      } catch (error) {
        console.error('Failed to create board:', error);
        showMessage('Failed to create board. It may already exist for this configuration.', 'error');
      }
    },
    [token, boardType, layoutId, sizeId, setIds, defaultAngle, showMessage, router, onSuccess],
  );

  return (
    <BoardForm
      title="Create Board"
      submitLabel="Create Board"
      initialValues={{
        name: '',
        description: '',
        locationName: '',
        isPublic: true,
        isOwned: true,
      }}
      namePlaceholder="e.g., Home Board, Gym Name"
      locationPlaceholder="e.g., City, Gym Name"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
