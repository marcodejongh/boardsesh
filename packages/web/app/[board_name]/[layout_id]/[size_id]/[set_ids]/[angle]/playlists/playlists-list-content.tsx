'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Typography, Button, List, Tabs } from 'antd';
import {
  TagOutlined,
  PlusOutlined,
  RightOutlined,
  GlobalOutlined,
  LockOutlined,
  FrownOutlined,
  LoginOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useUser } from '@stackframe/stack';
import { BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_USER_PLAYLISTS,
  GetUserPlaylistsQueryResponse,
  GetUserPlaylistsInput,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { constructClimbListWithSlugs, generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import BackButton from '@/app/components/back-button';
import AuthModal from '@/app/components/auth/auth-modal';
import DiscoverPlaylistsContent from './discover-playlists-content';
import styles from './playlists.module.css';

const { Title, Text } = Typography;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

type PlaylistsListContentProps = {
  boardDetails: BoardDetails;
  angle: number;
};

export default function PlaylistsListContent({
  boardDetails,
  angle,
}: PlaylistsListContentProps) {
  const user = useUser();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { token, isLoading: tokenLoading } = useWsAuthToken();

  const isAuthenticated = !!user;

  const fetchPlaylists = useCallback(async () => {
    if (tokenLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await executeGraphQL<GetUserPlaylistsQueryResponse, { input: GetUserPlaylistsInput }>(
        GET_USER_PLAYLISTS,
        {
          input: {
            boardType: boardDetails.board_name,
            layoutId: boardDetails.layout_id,
          },
        },
        token,
      );

      setPlaylists(response.userPlaylists);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, [boardDetails.board_name, boardDetails.layout_id, token, tokenLoading, isAuthenticated]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  };

  const getPlaylistUrl = (playlistUuid: string) => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    if (layout_name && size_name && set_names) {
      const layoutSlug = generateLayoutSlug(layout_name);
      const sizeSlug = generateSizeSlug(size_name, size_description);
      const setSlug = generateSetSlug(set_names);
      return `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/playlist/${playlistUuid}`;
    }

    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/playlist/${playlistUuid}`;
  };

  const getPlaylistColor = (playlist: Playlist) => {
    if (playlist.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return themeTokens.colors.primary;
  };

  if (error) {
    return (
      <>
        <div className={styles.actionsSection}>
          <BackButton fallbackUrl={getBackToListUrl()} />
        </div>
        <div className={styles.errorContainer}>
          <FrownOutlined className={styles.errorIcon} />
          <div className={styles.errorTitle}>Unable to Load Playlists</div>
          <div className={styles.errorMessage}>
            There was an error loading your playlists. Please try again.
          </div>
          <Button onClick={fetchPlaylists}>Try Again</Button>
        </div>
      </>
    );
  }

  // Render the "Your playlists" content
  const renderYourPlaylists = () => {
    // Not authenticated
    if (!isAuthenticated && sessionStatus !== 'loading') {
      return (
        <div className={styles.emptyContainer}>
          <TagOutlined className={styles.emptyIcon} />
          <Title level={4} className={styles.emptyTitle}>Sign in to view your playlists</Title>
          <Text type="secondary" className={styles.emptyText}>
            Create and manage your own climb playlists by signing in.
          </Text>
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => setShowAuthModal(true)}
            style={{ marginTop: themeTokens.spacing[4] }}
          >
            Sign In
          </Button>
        </div>
      );
    }

    if (loading || tokenLoading || sessionStatus === 'loading') {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      );
    }

    if (playlists.length === 0) {
      return (
        <div className={styles.emptyContainer}>
          <TagOutlined className={styles.emptyIcon} />
          <Title level={4} className={styles.emptyTitle}>No playlists yet</Title>
          <Text type="secondary" className={styles.emptyText}>
            Create your first playlist by adding climbs from the climb list.
          </Text>
          <Link href={getBackToListUrl()}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ marginTop: themeTokens.spacing[4] }}
            >
              Browse Climbs
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className={styles.listSection}>
        <List
          dataSource={playlists}
          renderItem={(playlist) => (
            <Link href={getPlaylistUrl(playlist.uuid)} className={styles.playlistLink}>
              <List.Item className={styles.playlistItem}>
                <div className={styles.playlistItemContent}>
                  <div
                    className={styles.playlistColor}
                    style={{ backgroundColor: getPlaylistColor(playlist) }}
                  >
                    <TagOutlined className={styles.playlistColorIcon} />
                  </div>
                  <div className={styles.playlistInfo}>
                    <div className={styles.playlistName}>{playlist.name}</div>
                    <div className={styles.playlistMeta}>
                      <span>{playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}</span>
                      <span className={styles.metaDot}>·</span>
                      {playlist.isPublic ? (
                        <span className={styles.visibilityText}>
                          <GlobalOutlined /> Public
                        </span>
                      ) : (
                        <span className={styles.visibilityText}>
                          <LockOutlined /> Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <RightOutlined className={styles.playlistArrow} />
              </List.Item>
            </Link>
          )}
        />
      </div>
    );
  };

  const tabItems = [
    {
      key: 'your',
      label: (
        <span>
          <TagOutlined />
          Your playlists
        </span>
      ),
      children: (
        <div className={styles.contentWrapper}>
          {renderYourPlaylists()}
        </div>
      ),
    },
    {
      key: 'discover',
      label: (
        <span>
          <CompassOutlined />
          Discover
        </span>
      ),
      children: (
        <DiscoverPlaylistsContent
          boardDetails={boardDetails}
          angle={angle}
        />
      ),
    },
  ];

  return (
    <>
      {/* Actions Section */}
      <div className={styles.actionsSection}>
        <div className={styles.actionsContainer}>
          <BackButton fallbackUrl={getBackToListUrl()} />
          <Title level={4} style={{ margin: 0 }}>Playlists</Title>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <Tabs
          defaultActiveKey="your"
          items={tabItems}
          className={styles.playlistTabs}
        />
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Sign in to create and manage your climb playlists."
      />
    </>
  );
}
