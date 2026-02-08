'use client';

import React, { useState, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MuiTypography from '@mui/material/Typography';
import { List, Form, Input, ColorPicker } from 'antd';
import MuiBadge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import { ActionTooltip } from '../action-tooltip';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { track } from '@vercel/analytics';
import type { ClimbActionProps, ClimbActionResult } from '../types';
import { usePlaylists } from '../use-playlists';
import AuthModal from '../../auth/auth-modal';
import type { Playlist } from '../playlists-batch-context';
import type { Color } from 'antd/es/color-picker';
import { themeTokens } from '@/app/theme/theme-config';
import { useSnackbar } from '../../providers/snackbar-provider';

// Validate hex color format to prevent CSS injection
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

export function PlaylistAction({
  climb,
  boardDetails,
  angle,
  viewMode,
  size = 'default',
  showLabel,
  disabled,
  className,
  onComplete,
}: ClimbActionProps): ClimbActionResult {
  // Playlists not supported for moonboard yet
  const isMoonboard = boardDetails.board_name === 'moonboard';

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form] = Form.useForm();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const {
    playlists,
    playlistsContainingClimb,
    addToPlaylist,
    removeFromPlaylist,
    createPlaylist,
    isAuthenticated,
    isLoading,
  } = usePlaylists({
    climbUuid: climb.uuid,
    angle,
  });

  const handleClick = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();

      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      setPopoverOpen((prev) => !prev);
    },
    [isAuthenticated]
  );

  const { showMessage } = useSnackbar();

  const handleTogglePlaylist = useCallback(
    async (playlistId: string, isInPlaylist: boolean) => {
      try {
        if (isInPlaylist) {
          await removeFromPlaylist(playlistId);
          showMessage('Removed from playlist', 'success');
          track('Remove from Playlist', {
            boardName: boardDetails.board_name,
            climbUuid: climb.uuid,
            playlistId,
          });
        } else {
          await addToPlaylist(playlistId);
          showMessage('Added to playlist', 'success');
          track('Add to Playlist', {
            boardName: boardDetails.board_name,
            climbUuid: climb.uuid,
            playlistId,
          });
        }
        onComplete?.();
        // Note: No need to call refreshPlaylists() - optimistic updates handle state
      } catch (error) {
        showMessage(isInPlaylist ? 'Failed to remove from playlist' : 'Failed to add to playlist', 'error');
      }
    },
    [addToPlaylist, removeFromPlaylist, boardDetails.board_name, climb.uuid, onComplete, showMessage]
  );

  const handleCreatePlaylist = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreatingPlaylist(true);

      // Extract and validate hex color from ColorPicker value
      let colorHex: string | undefined;
      if (values.color) {
        let rawColor: string | undefined;
        if (typeof values.color === 'string') {
          rawColor = values.color;
        } else if (typeof values.color === 'object' && 'toHexString' in values.color) {
          rawColor = (values.color as Color).toHexString();
        }
        // Only use color if it's a valid hex format
        if (rawColor && isValidHexColor(rawColor)) {
          colorHex = rawColor;
        }
      }

      const newPlaylist = await createPlaylist(values.name, values.description, colorHex, undefined);

      // Automatically add current climb to new playlist
      await addToPlaylist(newPlaylist.id);

      showMessage(`Created playlist "${values.name}"`, 'success');
      track('Create Playlist', {
        boardName: boardDetails.board_name,
        playlistName: values.name,
      });

      form.resetFields();
      setShowCreateForm(false);
      onComplete?.();
      // Note: No need to call refreshPlaylists() - optimistic updates handle state
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        // Form validation error - don't show message
        return;
      }
      showMessage('Failed to create playlist', 'error');
    } finally {
      setCreatingPlaylist(false);
    }
  }, [form, createPlaylist, addToPlaylist, boardDetails.board_name, onComplete]);

  const inlineContent = (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: themeTokens.spacing[3],
        backgroundColor: themeTokens.semantic.surfaceOverlay,
        overflow: 'auto',
        zIndex: themeTokens.zIndex.dropdown,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ marginBottom: themeTokens.spacing[2] }}>
        <MuiTypography variant="body2" component="span" fontWeight={600}>Add to Playlist</MuiTypography>
      </div>
      {playlists.length === 0 && !showCreateForm ? (
        <Stack spacing={1} style={{ width: '100%', textAlign: 'center', padding: themeTokens.spacing[2] }}>
          <MuiTypography variant="body2" component="span" color="text.secondary">No playlists yet</MuiTypography>
          <MuiButton
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => setShowCreateForm(true)}
            fullWidth
            size="small"
          >
            Create Your First Playlist
          </MuiButton>
        </Stack>
      ) : (
        <>
          {!showCreateForm && (
            <>
              <List
                dataSource={playlists}
                loading={isLoading}
                size="small"
                split={false}
                renderItem={(playlist: Playlist) => {
                  const isInPlaylist = playlistsContainingClimb.has(playlist.uuid);
                  const validColor = playlist.color && isValidHexColor(playlist.color) ? playlist.color : null;
                  return (
                    <List.Item
                      style={{
                        padding: `${themeTokens.spacing[1] + 2}px ${themeTokens.spacing[2]}px`,
                        cursor: 'pointer',
                        borderLeft: validColor ? `3px solid ${validColor}` : '3px solid transparent',
                        borderRadius: themeTokens.borderRadius.sm,
                        marginBottom: themeTokens.spacing[1],
                        backgroundColor: isInPlaylist ? themeTokens.semantic.selectedLight : undefined,
                      }}
                      onClick={() => handleTogglePlaylist(playlist.uuid, isInPlaylist)}
                    >
                      <Stack direction="row" spacing={1} style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Stack spacing={0}>
                          <MuiTypography variant="body2" component="span" fontWeight={600} sx={{ fontSize: 13 }}>{playlist.name}</MuiTypography>
                          <MuiTypography variant="body2" component="span" color="text.secondary" sx={{ fontSize: 11 }}>
                            {playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}
                          </MuiTypography>
                        </Stack>
                        {isInPlaylist && (
                          <CheckOutlined sx={{ color: themeTokens.colors.success, fontSize: 14 }} />
                        )}
                      </Stack>
                    </List.Item>
                  );
                }}
              />
              <MuiButton
                variant="outlined"
                startIcon={<AddOutlined />}
                onClick={() => setShowCreateForm(true)}
                fullWidth
                size="small"
                sx={{ marginTop: `${themeTokens.spacing[2]}px` }}
              >
                Create New Playlist
              </MuiButton>
            </>
          )}

          {showCreateForm && (
            <div>
              <Form form={form} layout="vertical" size="small">
                <Form.Item
                  name="name"
                  label="Playlist Name"
                  rules={[
                    { required: true, message: 'Please enter a playlist name' },
                    { max: 100, message: 'Name too long' },
                  ]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="e.g., Hard Crimps" autoFocus />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description (optional)"
                  rules={[{ max: 500, message: 'Description too long' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input.TextArea
                    placeholder="Optional description..."
                    rows={2}
                    maxLength={500}
                  />
                </Form.Item>
                <Form.Item name="color" label="Color (optional)" style={{ marginBottom: 8 }}>
                  <ColorPicker format="hex" showText size="small" />
                </Form.Item>
              </Form>
              <Stack direction="row" spacing={1} style={{ width: '100%', justifyContent: 'flex-end' }}>
                <MuiButton
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setShowCreateForm(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  variant="contained"
                  size="small"
                  onClick={handleCreatePlaylist}
                  disabled={creatingPlaylist}
                  startIcon={creatingPlaylist ? <CircularProgress size={16} /> : undefined}
                >
                  Create
                </MuiButton>
              </Stack>
            </div>
          )}
        </>
      )}
    </div>
  );

  const label = 'Add to Playlist';
  const shouldShowLabel = showLabel ?? (viewMode === 'button' || viewMode === 'dropdown');
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const inPlaylistCount = playlistsContainingClimb.size;
  const icon = popoverOpen ? (
    <CloseOutlined sx={{ fontSize: iconSize }} />
  ) : inPlaylistCount > 0 ? (
    <MuiBadge badgeContent={inPlaylistCount} sx={{ '& .MuiBadge-badge': { top: 2, right: -2 } }}>
      <LocalOfferOutlined sx={{ fontSize: iconSize }} />
    </MuiBadge>
  ) : (
    <LocalOfferOutlined sx={{ fontSize: iconSize }} />
  );

  const authModalElement = (
    <AuthModal
      open={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      onSuccess={() => setShowAuthModal(false)}
      title="Sign in to create playlists"
      description="Sign in to organize your climbs into custom playlists."
    />
  );

  // Icon mode - for Card actions (renders inline content below when expanded)
  const iconElement = (
    <>
      <ActionTooltip title={label}>
        <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
          {icon}
        </span>
      </ActionTooltip>
      {authModalElement}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <MuiButton
        variant="outlined"
        startIcon={icon}
        onClick={handleClick}
        size={size === 'large' ? 'large' : 'small'}
        disabled={disabled}
        className={className}
      >
        {shouldShowLabel && label}
      </MuiButton>
      {authModalElement}
    </>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'playlist',
    label: inPlaylistCount > 0 ? `${label} (${inPlaylistCount})` : label,
    icon: <LocalOfferOutlined />,
    onClick: () => handleClick(),
  };

  // Inline expandable content for card mode
  const expandedContent = popoverOpen ? inlineContent : null;

  // List mode - full-width row for drawer menus
  const listElement = (
    <>
      <MuiButton
        variant="text"
        startIcon={icon}
        fullWidth
        onClick={handleClick}
        disabled={disabled}
        sx={{
          height: 48,
          justifyContent: 'flex-start',
          paddingLeft: `${themeTokens.spacing[4]}px`,
          fontSize: themeTokens.typography.fontSize.base,
        }}
      >
        {inPlaylistCount > 0 ? `${label} (${inPlaylistCount})` : label}
      </MuiButton>
      {authModalElement}
    </>
  );

  let element: React.ReactNode;
  switch (viewMode) {
    case 'icon':
      element = iconElement;
      break;
    case 'button':
    case 'compact':
      element = buttonElement;
      break;
    case 'list':
      element = listElement;
      break;
    case 'dropdown':
      element = authModalElement; // Need to render modals even in dropdown mode
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    expandedContent,
    menuItem,
    key: 'playlist',
    available: !isMoonboard,
  };
}

export default PlaylistAction;
