'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MuiTypography from '@mui/material/Typography';
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isOwned, setIsOwned] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const router = useRouter();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!token) {
        showMessage('You must be signed in to create a board', 'error');
        return;
      }

      if (!name.trim()) {
        showMessage('Board name is required', 'error');
        return;
      }

      setIsSubmitting(true);

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
              name: name.trim(),
              description: description.trim() || undefined,
              locationName: locationName.trim() || undefined,
              isPublic,
              isOwned,
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
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, name, description, locationName, isPublic, isOwned, boardType, layoutId, sizeId, setIds, defaultAngle, showMessage, router, onSuccess],
  );

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <MuiTypography variant="h6">Create Board</MuiTypography>

      <TextField
        label="Board Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        size="small"
        placeholder="e.g., Home Board, Gym Name"
        inputProps={{ maxLength: 100 }}
      />

      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        size="small"
        multiline
        minRows={2}
        maxRows={4}
        placeholder="Optional description"
      />

      <TextField
        label="Location"
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
        fullWidth
        size="small"
        placeholder="e.g., City, Gym Name"
      />

      <FormControlLabel
        control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
        label="Public board"
      />

      <FormControlLabel
        control={<Switch checked={isOwned} onChange={(e) => setIsOwned(e.target.checked)} />}
        label="I own this board"
      />

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
        {onCancel && (
          <MuiButton variant="text" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </MuiButton>
        )}
        <MuiButton
          type="submit"
          variant="contained"
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Create Board'}
        </MuiButton>
      </Box>
    </Box>
  );
}
