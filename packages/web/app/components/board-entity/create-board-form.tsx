'use client';

import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { useEntityMutation } from '@/app/hooks/use-entity-mutation';
import {
  CREATE_BOARD,
  type CreateBoardMutationVariables,
  type CreateBoardMutationResponse,
} from '@/app/lib/graphql/operations';
import { useRouter } from 'next/navigation';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import type { UserBoard } from '@boardsesh/shared-schema';
import type { BoardName } from '@/app/lib/types';
import { ANGLES } from '@/app/lib/board-data';
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
  const { isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const router = useRouter();
  const [selectedGymUuid, setSelectedGymUuid] = useState<string | null>(null);

  const availableAngles = ANGLES[boardType as BoardName] ?? [];

  const { execute } = useEntityMutation<CreateBoardMutationResponse, CreateBoardMutationVariables>(
    CREATE_BOARD,
    {
      errorMessage: 'Failed to create board. It may already exist for this configuration.',
      authRequiredMessage: 'You must be signed in to create a board',
    },
  );

  const handleSubmit = useCallback(
    async (values: { name: string; description: string; locationName: string; isPublic: boolean; isOwned: boolean; angle?: number; isAngleAdjustable?: boolean }) => {
      if (!values.name) {
        showMessage('Board name is required', 'error');
        return;
      }

      const data = await execute({
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
          angle: values.angle,
          isAngleAdjustable: values.isAngleAdjustable,
        },
      });

      if (data) {
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
      }
    },
    [execute, boardType, layoutId, sizeId, setIds, defaultAngle, selectedGymUuid, showMessage, router, onSuccess],
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
        availableAngles={availableAngles}
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
