'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MuiSwitch from '@mui/material/Switch';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import { PublicOutlined, LockOutlined } from '@mui/icons-material';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  UPDATE_PLAYLIST,
  UpdatePlaylistMutationResponse,
  UpdatePlaylistMutationVariables,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { themeTokens } from '@/app/theme/theme-config';

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

type PlaylistEditDrawerProps = {
  open: boolean;
  playlist: Playlist;
  onClose: () => void;
  onSuccess: (updatedPlaylist: Playlist) => void;
};

const INITIAL_FORM_VALUES = { name: '', description: '', color: '', isPublic: false };

export default function PlaylistEditDrawer({ open, playlist, onClose, onSuccess }: PlaylistEditDrawerProps) {
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  // Reset form when drawer opens with new playlist
  useEffect(() => {
    if (open && playlist) {
      setFormValues({
        name: playlist.name,
        description: playlist.description || '',
        color: playlist.color || '',
        isPublic: playlist.isPublic,
      });
      setFormErrors({});
      setIsPublic(playlist.isPublic);
    }
  }, [open, playlist]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      errors.name = 'Please enter a playlist name';
    } else if (formValues.name.length > 100) {
      errors.name = 'Name must be 100 characters or less';
    }
    if (formValues.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Extract and validate hex color
      let colorHex: string | undefined;
      if (formValues.color && isValidHexColor(formValues.color)) {
        colorHex = formValues.color;
      }

      const response = await executeGraphQL<UpdatePlaylistMutationResponse, UpdatePlaylistMutationVariables>(
        UPDATE_PLAYLIST,
        {
          input: {
            playlistId: playlist.uuid,
            name: formValues.name,
            description: formValues.description || undefined,
            color: colorHex,
            isPublic: formValues.isPublic,
          },
        },
        token,
      );

      showMessage('Playlist updated successfully', 'success');
      onSuccess(response.updatePlaylist);
      onClose();
    } catch (error) {
      console.error('Error updating playlist:', error);
      showMessage('Failed to update playlist', 'error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formValues, playlist.uuid, token, onSuccess, onClose, showMessage]);

  const handleCancel = useCallback(() => {
    setFormValues(INITIAL_FORM_VALUES);
    setFormErrors({});
    onClose();
  }, [onClose]);

  const handleVisibilityChange = useCallback((checked: boolean) => {
    setIsPublic(checked);
    setFormValues((prev) => ({ ...prev, isPublic: checked }));
  }, []);

  return (
    <SwipeableDrawer
      title="Edit Playlist"
      open={open}
      onClose={handleCancel}
      placement="bottom"
      styles={{
        wrapper: { height: 'auto' },
        body: {
          paddingBottom: themeTokens.spacing[6],
        },
      }}
      extra={
        <Stack direction="row" spacing={1}>
          <MuiButton variant="outlined" onClick={handleCancel}>Cancel</MuiButton>
          <MuiButton variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </MuiButton>
        </Stack>
      }
    >
      <Box sx={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Playlist Name</Typography>
          <TextField
            placeholder="e.g., Hard Crimps"
            slotProps={{ htmlInput: { maxLength: 100 } }}
            fullWidth
            size="small"
            value={formValues.name}
            onChange={(e) => {
              setFormValues((prev) => ({ ...prev, name: e.target.value }));
              setFormErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={!!formErrors.name}
            helperText={formErrors.name}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Description</Typography>
          <TextField
            placeholder="Optional description for your playlist..."
            multiline
            rows={3}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            fullWidth
            size="small"
            value={formValues.description}
            onChange={(e) => {
              setFormValues((prev) => ({ ...prev, description: e.target.value }));
              setFormErrors((prev) => ({ ...prev, description: '' }));
            }}
            error={!!formErrors.description}
            helperText={formErrors.description}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Color</Typography>
          <TextField
            type="color"
            value={formValues.color || '#000000'}
            onChange={(e) => setFormValues((prev) => ({ ...prev, color: e.target.value }))}
            size="small"
            sx={{ width: 80 }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Visibility</Typography>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LockOutlined sx={{ fontSize: 18, color: isPublic ? 'text.disabled' : 'text.secondary' }} />
              <MuiSwitch
                checked={isPublic}
                onChange={(_, checked) => handleVisibilityChange(checked)}
              />
              <PublicOutlined sx={{ fontSize: 18, color: isPublic ? 'text.secondary' : 'text.disabled' }} />
            </Stack>
            <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 12 }}>
              {isPublic
                ? 'Public playlists can be viewed by anyone with the link'
                : 'Private playlists are only visible to you'}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
}
