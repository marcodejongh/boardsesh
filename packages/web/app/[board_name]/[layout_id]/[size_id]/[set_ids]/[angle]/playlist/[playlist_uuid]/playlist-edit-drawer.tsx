'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Switch, ColorPicker } from 'antd';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import { PublicOutlined, LockOutlined } from '@mui/icons-material';
import type { Color } from 'antd/es/color-picker';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  UPDATE_PLAYLIST,
  UpdatePlaylistMutationResponse,
  UpdatePlaylistMutationVariables,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { themeTokens } from '@/app/theme/theme-config';

// Typography destructuring removed - using MUI Typography directly

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

export default function PlaylistEditDrawer({ open, playlist, onClose, onSuccess }: PlaylistEditDrawerProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  // Reset form when drawer opens with new playlist
  useEffect(() => {
    if (open && playlist) {
      form.setFieldsValue({
        name: playlist.name,
        description: playlist.description || '',
        color: playlist.color || undefined,
        isPublic: playlist.isPublic,
      });
      setIsPublic(playlist.isPublic);
    }
  }, [open, playlist, form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Extract and validate hex color
      let colorHex: string | undefined;
      if (values.color) {
        let rawColor: string | undefined;
        if (typeof values.color === 'string') {
          rawColor = values.color;
        } else if (typeof values.color === 'object' && 'toHexString' in values.color) {
          rawColor = (values.color as Color).toHexString();
        }
        if (rawColor && isValidHexColor(rawColor)) {
          colorHex = rawColor;
        }
      }

      const response = await executeGraphQL<UpdatePlaylistMutationResponse, UpdatePlaylistMutationVariables>(
        UPDATE_PLAYLIST,
        {
          input: {
            playlistId: playlist.uuid,
            name: values.name,
            description: values.description || undefined,
            color: colorHex,
            isPublic: values.isPublic,
          },
        },
        token,
      );

      showMessage('Playlist updated successfully', 'success');
      onSuccess(response.updatePlaylist);
      onClose();
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        // Form validation error
        return;
      }
      console.error('Error updating playlist:', error);
      showMessage('Failed to update playlist', 'error');
    } finally {
      setLoading(false);
    }
  }, [form, playlist.uuid, token, onSuccess, onClose]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  const handleVisibilityChange = useCallback((checked: boolean) => {
    setIsPublic(checked);
    form.setFieldValue('isPublic', checked);
  }, [form]);

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
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600, margin: '0 auto' }}
      >
        <Form.Item
          name="name"
          label="Playlist Name"
          rules={[
            { required: true, message: 'Please enter a playlist name' },
            { max: 100, message: 'Name must be 100 characters or less' },
          ]}
        >
          <Input placeholder="e.g., Hard Crimps" maxLength={100} showCount />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ max: 500, message: 'Description must be 500 characters or less' }]}
        >
          <Input.TextArea
            placeholder="Optional description for your playlist..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item name="color" label="Color">
          <ColorPicker format="hex" showText allowClear />
        </Form.Item>

        <Form.Item
          name="isPublic"
          label="Visibility"
          valuePropName="checked"
        >
          <Stack spacing={0.5}>
            <Switch
              checked={isPublic}
              onChange={handleVisibilityChange}
              checkedChildren={<PublicOutlined />}
              unCheckedChildren={<LockOutlined />}
            />
            <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 12 }}>
              {isPublic
                ? 'Public playlists can be viewed by anyone with the link'
                : 'Private playlists are only visible to you'}
            </Typography>
          </Stack>
        </Form.Item>
      </Form>
    </SwipeableDrawer>
  );
}
