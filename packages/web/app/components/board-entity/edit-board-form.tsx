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
  UPDATE_BOARD,
  type UpdateBoardMutationVariables,
  type UpdateBoardMutationResponse,
} from '@/app/lib/graphql/operations';
import type { UserBoard } from '@boardsesh/shared-schema';

interface EditBoardFormProps {
  board: UserBoard;
  onSuccess?: (board: UserBoard) => void;
  onCancel?: () => void;
}

export default function EditBoardForm({ board, onSuccess, onCancel }: EditBoardFormProps) {
  const [name, setName] = useState(board.name);
  const [slug, setSlug] = useState(board.slug);
  const [description, setDescription] = useState(board.description ?? '');
  const [locationName, setLocationName] = useState(board.locationName ?? '');
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [isOwned, setIsOwned] = useState(board.isOwned);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!token) {
        showMessage('You must be signed in', 'error');
        return;
      }

      if (!name.trim()) {
        showMessage('Board name is required', 'error');
        return;
      }

      setIsSubmitting(true);

      try {
        const client = createGraphQLHttpClient(token);
        const data = await client.request<UpdateBoardMutationResponse, UpdateBoardMutationVariables>(
          UPDATE_BOARD,
          {
            input: {
              boardUuid: board.uuid,
              name: name.trim(),
              slug: slug.trim() || undefined,
              description: description.trim() || undefined,
              locationName: locationName.trim() || undefined,
              isPublic,
              isOwned,
            },
          },
        );

        showMessage('Board updated!', 'success');
        onSuccess?.(data.updateBoard);
      } catch (error) {
        console.error('Failed to update board:', error);
        showMessage('Failed to update board', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, name, slug, description, locationName, isPublic, isOwned, board.uuid, showMessage, onSuccess],
  );

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <MuiTypography variant="h6">Edit Board</MuiTypography>

      <TextField
        label="Board Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        size="small"
        inputProps={{ maxLength: 100 }}
      />

      <TextField
        label="URL Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        fullWidth
        size="small"
        helperText={`boardsesh.com/b/${slug || '...'}`}
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
      />

      <TextField
        label="Location"
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
        fullWidth
        size="small"
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
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
        </MuiButton>
      </Box>
    </Box>
  );
}
