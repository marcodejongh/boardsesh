'use client';

import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
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
import GymSelector from '@/app/components/gym-entity/gym-selector';

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
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const router = useRouter();
  const [selectedGymUuid, setSelectedGymUuid] = useState<string | null>(null);

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
              gymUuid: selectedGymUuid || undefined,
            },
          },
        );

        const board = data.createBoard;
        let message = `Board "${board.name}" created!`;
        if (board.gymName && !selectedGymUuid) {
          message += ` A gym "${board.gymName}" was auto-created.`;
        }
        showMessage(message, 'success');

        if (onSuccess) {
          onSuccess(board);
        } else {
          router.push(constructBoardSlugListUrl(board.slug, defaultAngle));
        }
      } catch (error) {
        console.error('Failed to create board:', error);
        showMessage('Failed to create board. It may already exist for this configuration.', 'error');
      }
    },
    [token, boardType, layoutId, sizeId, setIds, defaultAngle, selectedGymUuid, showMessage, router, onSuccess],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      {isAuthenticated && (
        <Box sx={{ px: 0 }}>
          <GymSelector
            selectedGymUuid={selectedGymUuid}
            onSelect={setSelectedGymUuid}
          />
        </Box>
      )}
    </Box>
  );
}
