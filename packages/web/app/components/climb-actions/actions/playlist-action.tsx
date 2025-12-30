'use client';

import React, { useState, useCallback } from 'react';
import { Button, Popover, List, Input, Form, Space, Typography, Badge, ColorPicker, message } from 'antd';
import { ActionTooltip } from '../action-tooltip';
import { TagOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { track } from '@vercel/analytics';
import type { ClimbActionProps, ClimbActionResult } from '../types';
import { usePlaylists } from '../use-playlists';
import AuthModal from '../../auth/auth-modal';
import type { Playlist } from '../playlists-batch-context';
import type { Color } from 'antd/es/color-picker';
import { themeTokens } from '@/app/theme/theme-config';

const { Text } = Typography;

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

      setPopoverOpen(true);
      onComplete?.();
    },
    [isAuthenticated, onComplete]
  );

  const handleTogglePlaylist = useCallback(
    async (playlistId: string, isInPlaylist: boolean) => {
      try {
        if (isInPlaylist) {
          await removeFromPlaylist(playlistId);
          message.success('Removed from playlist');
          track('Remove from Playlist', {
            boardName: boardDetails.board_name,
            climbUuid: climb.uuid,
            playlistId,
          });
        } else {
          await addToPlaylist(playlistId);
          message.success('Added to playlist');
          track('Add to Playlist', {
            boardName: boardDetails.board_name,
            climbUuid: climb.uuid,
            playlistId,
          });
        }
        // Note: No need to call refreshPlaylists() - optimistic updates handle state
      } catch (error) {
        message.error(isInPlaylist ? 'Failed to remove from playlist' : 'Failed to add to playlist');
      }
    },
    [addToPlaylist, removeFromPlaylist, boardDetails.board_name, climb.uuid]
  );

  const handleCreatePlaylist = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreatingPlaylist(true);

      // Extract hex color from ColorPicker value
      let colorHex: string | undefined;
      if (values.color) {
        if (typeof values.color === 'string') {
          colorHex = values.color;
        } else if (typeof values.color === 'object' && 'toHexString' in values.color) {
          colorHex = (values.color as Color).toHexString();
        }
      }

      const newPlaylist = await createPlaylist(values.name, values.description, colorHex, undefined);

      // Automatically add current climb to new playlist
      await addToPlaylist(newPlaylist.id);

      message.success(`Created playlist "${values.name}"`);
      track('Create Playlist', {
        boardName: boardDetails.board_name,
        playlistName: values.name,
      });

      form.resetFields();
      setShowCreateForm(false);
      // Note: No need to call refreshPlaylists() - optimistic updates handle state
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        // Form validation error - don't show message
        return;
      }
      message.error('Failed to create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  }, [form, createPlaylist, addToPlaylist, boardDetails.board_name]);

  const popoverContent = (
    <div style={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
      {playlists.length === 0 && !showCreateForm ? (
        <Space direction="vertical" style={{ width: '100%', textAlign: 'center', padding: 16 }}>
          <Text type="secondary">No playlists yet</Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateForm(true)}
            block
          >
            Create Your First Playlist
          </Button>
        </Space>
      ) : (
        <>
          {!showCreateForm && (
            <>
              <List
                dataSource={playlists}
                loading={isLoading}
                renderItem={(playlist: Playlist) => {
                  const isInPlaylist = playlistsContainingClimb.has(playlist.id);
                  return (
                    <List.Item
                      style={{
                        padding: '8px 16px',
                        cursor: 'pointer',
                        borderLeft: playlist.color ? `4px solid ${playlist.color}` : undefined,
                      }}
                      onClick={() => handleTogglePlaylist(playlist.id, isInPlaylist)}
                    >
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{playlist.name}</Text>
                          {playlist.description && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {playlist.description}
                            </Text>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}
                          </Text>
                        </Space>
                        {isInPlaylist && (
                          <CheckOutlined style={{ color: themeTokens.colors.success, fontSize: 16 }} />
                        )}
                      </Space>
                    </List.Item>
                  );
                }}
              />
              <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setShowCreateForm(true)}
                  block
                >
                  Create New Playlist
                </Button>
              </div>
            </>
          )}

          {showCreateForm && (
            <div style={{ padding: 16 }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  name="name"
                  label="Playlist Name"
                  rules={[
                    { required: true, message: 'Please enter a playlist name' },
                    { max: 100, message: 'Name too long' },
                  ]}
                >
                  <Input placeholder="e.g., Hard Crimps" autoFocus />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description (optional)"
                  rules={[{ max: 500, message: 'Description too long' }]}
                >
                  <Input.TextArea
                    placeholder="Optional description..."
                    rows={2}
                    maxLength={500}
                  />
                </Form.Item>
                <Form.Item name="color" label="Color (optional)">
                  <ColorPicker format="hex" showText />
                </Form.Item>
              </Form>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" onClick={handleCreatePlaylist} loading={creatingPlaylist}>
                  Create
                </Button>
              </Space>
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
  const icon =
    inPlaylistCount > 0 ? (
      <Badge count={inPlaylistCount} size="small" offset={[-2, 2]}>
        <TagOutlined style={{ fontSize: iconSize }} />
      </Badge>
    ) : (
      <TagOutlined style={{ fontSize: iconSize }} />
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

  // Icon mode - for Card actions
  const iconElement = (
    <>
      <Popover
        content={popoverContent}
        title="Add to Playlist"
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomLeft"
      >
        <ActionTooltip title={label}>
          <span onClick={handleClick} style={{ cursor: 'pointer' }} className={className}>
            {icon}
          </span>
        </ActionTooltip>
      </Popover>
      {authModalElement}
    </>
  );

  // Button mode
  const buttonElement = (
    <>
      <Popover
        content={popoverContent}
        title="Add to Playlist"
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomLeft"
      >
        <Button
          icon={icon}
          onClick={handleClick}
          size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'middle'}
          disabled={disabled}
          className={className}
        >
          {shouldShowLabel && label}
        </Button>
      </Popover>
      {authModalElement}
    </>
  );

  // Menu item for dropdown
  const menuItem = {
    key: 'playlist',
    label: inPlaylistCount > 0 ? `${label} (${inPlaylistCount})` : label,
    icon: <TagOutlined />,
    onClick: () => handleClick(),
  };

  let element: React.ReactNode;
  switch (viewMode) {
    case 'icon':
      element = iconElement;
      break;
    case 'button':
    case 'compact':
      element = buttonElement;
      break;
    case 'dropdown':
      element = authModalElement; // Need to render modals even in dropdown mode
      break;
    default:
      element = iconElement;
  }

  return {
    element,
    menuItem,
    key: 'playlist',
    available: true,
  };
}

export default PlaylistAction;
