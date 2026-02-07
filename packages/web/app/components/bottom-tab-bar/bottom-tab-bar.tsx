'use client';

import React, { useState, useCallback } from 'react';
import { Button, Flex, Form, Input, ColorPicker, message } from 'antd';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { UnorderedListOutlined, PlusOutlined, TagOutlined, EditOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import type { Color } from 'antd/es/color-picker';
import { BoardDetails } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import { usePlaylistsContext } from '../climb-actions/playlists-batch-context';
import AuthModal from '../auth/auth-modal';
import styles from './bottom-tab-bar.module.css';

type Tab = 'climbs' | 'library' | 'create';

interface BottomTabBarProps {
  boardDetails: BoardDetails;
  angle: number;
}

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

function BottomTabBar({ boardDetails, angle }: BottomTabBarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [form] = Form.useForm();
  const pathname = usePathname();
  const router = useRouter();

  const { createPlaylist, isAuthenticated } = usePlaylistsContext();

  const isListPage = pathname.endsWith('/list');
  const isPlaylistsPage = pathname.endsWith('/playlists');

  // Hide playlists for moonboard (not yet supported)
  const isMoonboard = boardDetails.board_name === 'moonboard';

  const getActiveTab = (): Tab => {
    if (isCreateOpen || isCreatePlaylistOpen) return 'create';
    if (isPlaylistsPage) return 'library';
    if (isListPage) return 'climbs';
    return 'climbs';
  };

  const activeTab = getActiveTab();

  const listUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }
    return null;
  })();

  const createClimbUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/create`;
    }
    return null;
  })();

  const playlistsUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/playlists`;
    }
    return null;
  })();

  const getPlaylistUrl = useCallback((playlistUuid: string) => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/playlist/${playlistUuid}`;
    }
    return null;
  }, [boardDetails, angle]);

  const handleLibraryTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    track('Bottom Tab Bar', { tab: 'library' });
  };

  const handleCreateTab = () => {
    setIsCreateOpen(true);
    track('Bottom Tab Bar', { tab: 'create' });
  };

  const handleClimbsTab = () => {
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(false);
    track('Bottom Tab Bar', { tab: 'climbs' });
  };

  const handleOpenCreatePlaylist = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setIsCreateOpen(false);
    setIsCreatePlaylistOpen(true);
  };

  const handleCreatePlaylist = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setIsCreatingPlaylist(true);

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

      message.success(`Created playlist "${values.name}"`);
      track('Create Playlist', {
        boardName: boardDetails.board_name,
        playlistName: values.name,
        source: 'bottom-tab-bar',
      });

      form.resetFields();
      setIsCreatePlaylistOpen(false);

      // Navigate to the new playlist
      const newPlaylistUrl = getPlaylistUrl(newPlaylist.uuid);
      if (newPlaylistUrl) {
        router.push(newPlaylistUrl);
      }
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) {
        // Form validation error - don't show message
        return;
      }
      message.error('Failed to create playlist');
    } finally {
      setIsCreatingPlaylist(false);
    }
  }, [form, createPlaylist, boardDetails.board_name, router, getPlaylistUrl]);

  const getTabColor = (tab: Tab) =>
    activeTab === tab ? themeTokens.colors.primary : themeTokens.neutral[400];

  return (
    <>
      <div className={styles.tabBar}>
        {/* Climbs tab */}
        {listUrl ? (
          <Link href={listUrl} className={styles.tabItem} onClick={handleClimbsTab} style={{ color: getTabColor('climbs'), textDecoration: 'none' }} aria-label="Climbs" role="tab" aria-selected={activeTab === 'climbs'}>
            <UnorderedListOutlined style={{ fontSize: 20 }} />
            <span className={styles.tabLabel}>Climb</span>
          </Link>
        ) : (
          <button className={styles.tabItem} onClick={handleClimbsTab} style={{ color: getTabColor('climbs') }} aria-label="Climbs" role="tab" aria-selected={activeTab === 'climbs'}>
            <UnorderedListOutlined style={{ fontSize: 20 }} />
            <span className={styles.tabLabel}>Climb</span>
          </button>
        )}

        {/* Your Library tab */}
        {playlistsUrl ? (
          <Link
            href={playlistsUrl}
            className={styles.tabItem}
            onClick={handleLibraryTab}
            style={{ color: getTabColor('library'), textDecoration: 'none' }}
            aria-label="Your library"
            role="tab"
            aria-selected={activeTab === 'library'}
          >
            <TagOutlined style={{ fontSize: 20 }} />
            <span className={styles.tabLabel}>Your Library</span>
          </Link>
        ) : (
          <button
            className={styles.tabItem}
            style={{ color: getTabColor('library') }}
            aria-label="Your library"
            role="tab"
            aria-selected={activeTab === 'library'}
            disabled
          >
            <TagOutlined style={{ fontSize: 20 }} />
            <span className={styles.tabLabel}>Your Library</span>
          </button>
        )}

        {/* Create tab */}
        <button
          className={styles.tabItem}
          onClick={handleCreateTab}
          style={{ color: getTabColor('create') }}
          aria-label="Create"
          role="tab"
          aria-selected={activeTab === 'create'}
        >
          <PlusOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Create</span>
        </button>
      </div>

      {/* Create Menu Drawer */}
      <SwipeableDrawer
        title="Create"
        placement="bottom"
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        swipeRegion="body"
        styles={{
          wrapper: { height: 'auto' },
          body: { padding: `${themeTokens.spacing[2]}px 0` },
        }}
      >
        <Flex vertical>
          {createClimbUrl && (
            <Link
              href={createClimbUrl}
              onClick={() => setIsCreateOpen(false)}
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="text"
                icon={<EditOutlined />}
                block
                style={{
                  height: 48,
                  justifyContent: 'flex-start',
                  paddingLeft: themeTokens.spacing[4],
                  fontSize: themeTokens.typography.fontSize.base,
                  color: 'inherit',
                }}
              >
                Climb
              </Button>
            </Link>
          )}
          {!isMoonboard && (
            <Button
              type="text"
              icon={<TagOutlined />}
              block
              onClick={handleOpenCreatePlaylist}
              style={{
                height: 48,
                justifyContent: 'flex-start',
                paddingLeft: themeTokens.spacing[4],
                fontSize: themeTokens.typography.fontSize.base,
              }}
            >
              Playlist
            </Button>
          )}
        </Flex>
      </SwipeableDrawer>

      {/* Create Playlist Drawer */}
      <SwipeableDrawer
        title="Create Playlist"
        placement="bottom"
        open={isCreatePlaylistOpen}
        onClose={() => {
          setIsCreatePlaylistOpen(false);
          form.resetFields();
        }}
        styles={{
          wrapper: { height: 'auto' },
          body: { padding: themeTokens.spacing[4] },
        }}
        extra={
          <Button
            type="primary"
            onClick={handleCreatePlaylist}
            loading={isCreatingPlaylist}
          >
            Create
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
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
      </SwipeableDrawer>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          setIsCreatePlaylistOpen(true);
        }}
        title="Sign in to create playlists"
        description="Sign in to create and manage your climb playlists."
      />
    </>
  );
}

export default BottomTabBar;
