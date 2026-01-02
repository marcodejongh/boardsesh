'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Typography, Button, List, Empty, Segmented } from 'antd';
import {
  TagOutlined,
  RightOutlined,
  GlobalOutlined,
  LockOutlined,
  FrownOutlined,
  LoginOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_ALL_USER_PLAYLISTS,
  GetAllUserPlaylistsQueryResponse,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { themeTokens } from '@/app/theme/theme-config';
import AuthModal from '@/app/components/auth/auth-modal';
import styles from './playlists.module.css';

const { Title, Text } = Typography;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

// Board display names
const BOARD_DISPLAY_NAMES: Record<string, string> = {
  kilter: 'Kilter',
  tension: 'Tension',
};

type PlaylistsListContentProps = {
  currentUserId?: string;
};

export default function PlaylistsListContent({
  currentUserId,
}: PlaylistsListContentProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('all');
  const { token, isLoading: tokenLoading } = useWsAuthToken();

  const isAuthenticated = sessionStatus === 'authenticated';

  const fetchPlaylists = useCallback(async () => {
    if (tokenLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await executeGraphQL<GetAllUserPlaylistsQueryResponse>(
        GET_ALL_USER_PLAYLISTS,
        {},
        token,
      );

      setPlaylists(response.allUserPlaylists);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, [token, tokenLoading, isAuthenticated]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const getPlaylistColor = (playlist: Playlist) => {
    if (playlist.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return themeTokens.colors.primary;
  };

  // Get unique board types from playlists
  const boardTypes = [...new Set(playlists.map(p => p.boardType))];

  // Filter playlists by selected board
  const filteredPlaylists = selectedBoard === 'all'
    ? playlists
    : playlists.filter(p => p.boardType === selectedBoard);

  // Group playlists by board type for display
  const groupedPlaylists = filteredPlaylists.reduce((acc, playlist) => {
    const boardType = playlist.boardType;
    if (!acc[boardType]) {
      acc[boardType] = [];
    }
    acc[boardType].push(playlist);
    return acc;
  }, {} as Record<string, Playlist[]>);

  // Not authenticated
  if (!isAuthenticated && sessionStatus !== 'loading') {
    return (
      <>
        <div className={styles.actionsSection}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>
        <div className={styles.emptyContainer}>
          <TagOutlined className={styles.emptyIcon} />
          <Title level={4} className={styles.emptyTitle}>Sign in to view playlists</Title>
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
        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Sign in to Boardsesh"
          description="Sign in to create and manage your climb playlists."
        />
      </>
    );
  }

  if (loading || tokenLoading || sessionStatus === 'loading') {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className={styles.actionsSection}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          >
            Back
          </Button>
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

  // Build board filter options
  const boardOptions = [
    { label: 'All', value: 'all' },
    ...boardTypes.map(boardType => ({
      label: BOARD_DISPLAY_NAMES[boardType] || boardType,
      value: boardType,
    })),
  ];

  return (
    <>
      {/* Actions Section */}
      <div className={styles.actionsSection}>
        <div className={styles.actionsContainer}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>My Playlists</Title>
        </div>
        {boardTypes.length > 1 && (
          <Segmented
            options={boardOptions}
            value={selectedBoard}
            onChange={(value) => setSelectedBoard(value as string)}
            style={{ marginTop: 12 }}
          />
        )}
      </div>

      {/* Content */}
      <div className={styles.contentWrapper}>
        {filteredPlaylists.length === 0 ? (
          <div className={styles.emptyContainer}>
            <TagOutlined className={styles.emptyIcon} />
            <Title level={4} className={styles.emptyTitle}>No playlists yet</Title>
            <Text type="secondary" className={styles.emptyText}>
              Create your first playlist by adding climbs from the climb list.
            </Text>
          </div>
        ) : selectedBoard === 'all' && boardTypes.length > 1 ? (
          // Show grouped by board when "All" is selected and multiple boards exist
          Object.entries(groupedPlaylists).map(([boardType, boardPlaylists]) => (
            <div key={boardType} className={styles.listSection}>
              <div className={styles.boardHeader}>
                <Text strong>{BOARD_DISPLAY_NAMES[boardType] || boardType}</Text>
              </div>
              <List
                dataSource={boardPlaylists}
                renderItem={(playlist) => (
                  <Link href={`/playlists/${playlist.uuid}`} className={styles.playlistLink}>
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
          ))
        ) : (
          // Show flat list for single board or when a specific board is selected
          <div className={styles.listSection}>
            <List
              dataSource={filteredPlaylists}
              renderItem={(playlist) => (
                <Link href={`/playlists/${playlist.uuid}`} className={styles.playlistLink}>
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
        )}
      </div>
    </>
  );
}
