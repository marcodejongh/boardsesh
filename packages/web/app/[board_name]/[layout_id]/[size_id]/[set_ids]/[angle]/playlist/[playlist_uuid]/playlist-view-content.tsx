'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Typography, Button } from 'antd';
import {
  TagOutlined,
  CalendarOutlined,
  NumberOutlined,
  GlobalOutlined,
  LockOutlined,
  FrownOutlined,
} from '@ant-design/icons';
import { BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST,
  GetPlaylistQueryResponse,
  GetPlaylistQueryVariables,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { themeTokens } from '@/app/theme/theme-config';
import PlaylistViewActions from './playlist-view-actions';
import PlaylistEditDrawer from './playlist-edit-drawer';
import styles from './playlist-view.module.css';

const { Title, Text } = Typography;

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

type PlaylistViewContentProps = {
  playlistUuid: string;
  boardDetails: BoardDetails;
  angle: number;
  currentUserId?: string;
};

export default function PlaylistViewContent({
  playlistUuid,
  boardDetails,
  angle,
  currentUserId,
}: PlaylistViewContentProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const { token, isLoading: tokenLoading } = useWsAuthToken();

  const fetchPlaylist = useCallback(async () => {
    if (tokenLoading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await executeGraphQL<GetPlaylistQueryResponse, GetPlaylistQueryVariables>(
        GET_PLAYLIST,
        { playlistId: playlistUuid },
        token,
      );

      if (!response.playlist) {
        setError('Playlist not found');
        return;
      }

      setPlaylist(response.playlist);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, [playlistUuid, token, tokenLoading]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handleEditSuccess = useCallback((updatedPlaylist: Playlist) => {
    setPlaylist(updatedPlaylist);
  }, []);

  // Check if current user is the owner
  const isOwner = playlist?.userRole === 'owner';

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get color for indicator
  const getPlaylistColor = () => {
    if (playlist?.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return themeTokens.colors.primary;
  };

  if (loading || tokenLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className={styles.errorContainer}>
        <FrownOutlined className={styles.errorIcon} />
        <div className={styles.errorTitle}>
          {error === 'Playlist not found' ? 'Playlist Not Found' : 'Unable to Load Playlist'}
        </div>
        <div className={styles.errorMessage}>
          {error === 'Playlist not found'
            ? 'This playlist may have been deleted or you may not have permission to view it.'
            : 'There was an error loading this playlist. Please try again.'}
        </div>
        <Button onClick={fetchPlaylist}>Try Again</Button>
      </div>
    );
  }

  return (
    <>
      {/* Actions Section */}
      <div className={styles.actionsSection}>
        <PlaylistViewActions
          boardDetails={boardDetails}
          angle={angle}
          isOwner={isOwner}
          onEditClick={() => setEditDrawerOpen(true)}
        />
      </div>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        <div className={styles.detailsSection}>
          {/* Header with color indicator and name */}
          <div className={styles.playlistHeader}>
            <div
              className={styles.colorIndicator}
              style={{ backgroundColor: getPlaylistColor() }}
            >
              <TagOutlined className={styles.colorIndicatorIcon} />
            </div>
            <div className={styles.headerContent}>
              <Title level={2} className={styles.playlistName}>
                {playlist.name}
              </Title>
              <div className={styles.playlistMeta}>
                <span className={styles.metaItem}>
                  <NumberOutlined />
                  {playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}
                </span>
                <span className={styles.metaItem}>
                  <CalendarOutlined />
                  Created {formatDate(playlist.createdAt)}
                </span>
                <span
                  className={`${styles.visibilityBadge} ${
                    playlist.isPublic ? styles.publicBadge : styles.privateBadge
                  }`}
                >
                  {playlist.isPublic ? (
                    <>
                      <GlobalOutlined /> Public
                    </>
                  ) : (
                    <>
                      <LockOutlined /> Private
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {playlist.description ? (
            <div className={styles.descriptionSection}>
              <div className={styles.descriptionLabel}>Description</div>
              <Text className={styles.descriptionText}>{playlist.description}</Text>
            </div>
          ) : isOwner ? (
            <div className={styles.descriptionSection}>
              <div className={styles.descriptionLabel}>Description</div>
              <Text className={styles.noDescription}>
                No description yet. Click Edit to add one.
              </Text>
            </div>
          ) : null}

          {/* Stats */}
          <div className={styles.statsSection}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{playlist.climbCount}</span>
              <span className={styles.statLabel}>
                {playlist.climbCount === 1 ? 'Climb' : 'Climbs'}
              </span>
            </div>
            {playlist.updatedAt !== playlist.createdAt && (
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {formatDate(playlist.updatedAt)}
                </span>
                <span className={styles.statLabel}>Last Updated</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Drawer */}
      {playlist && (
        <PlaylistEditDrawer
          open={editDrawerOpen}
          playlist={playlist}
          onClose={() => setEditDrawerOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
