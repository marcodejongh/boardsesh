'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, Typography, Button, message } from 'antd';
import {
  TagOutlined,
  CalendarOutlined,
  NumberOutlined,
  GlobalOutlined,
  LockOutlined,
  FrownOutlined,
} from '@ant-design/icons';
import { track } from '@vercel/analytics';
import { BoardDetails, Climb } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST,
  GET_PLAYLIST_CLIMBS,
  GetPlaylistQueryResponse,
  GetPlaylistQueryVariables,
  GetPlaylistClimbsQueryResponse,
  GetPlaylistClimbsQueryVariables,
  PlaylistClimbsResult,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useQueueContext } from '@/app/components/graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';
import PlaylistViewActions from './playlist-view-actions';
import PlaylistEditDrawer from './playlist-edit-drawer';
import PlaylistClimbsList from './playlist-climbs-list';
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
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const addingToQueueRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { token, isLoading: tokenLoading } = useWsAuthToken();
  const { addToQueue } = useQueueContext();

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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleEditSuccess = useCallback((updatedPlaylist: Playlist) => {
    setPlaylist(updatedPlaylist);
  }, []);

  const handlePlaylistUpdated = useCallback(() => {
    // Refresh the climbs list
    setListRefreshKey((prev) => prev + 1);
    // Refetch playlist to update count
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handleAddAllToQueue = useCallback(async () => {
    // Use ref to prevent race conditions from rapid clicks
    if (!token || addingToQueueRef.current) return;

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    addingToQueueRef.current = true;
    setIsAddingToQueue(true);

    try {
      // Fetch all climbs from the playlist (paginate through all pages)
      type PlaylistClimb = PlaylistClimbsResult['climbs'][number];
      const allClimbs: Array<PlaylistClimb & { angle: number }> = [];
      let page = 0;
      let hasMore = true;
      const pageSize = 100; // Larger page size for efficiency

      while (hasMore) {
        // Check if aborted before each fetch
        if (abortController.signal.aborted) {
          return;
        }

        const response = await executeGraphQL<
          GetPlaylistClimbsQueryResponse,
          GetPlaylistClimbsQueryVariables
        >(
          GET_PLAYLIST_CLIMBS,
          {
            input: {
              playlistId: playlistUuid,
              boardName: boardDetails.board_name,
              layoutId: boardDetails.layout_id,
              sizeId: boardDetails.size_id,
              setIds: boardDetails.set_ids.join(','),
              angle,
              page,
              pageSize,
            },
          },
          token,
        );

        // Check if aborted after fetch completes
        if (abortController.signal.aborted) {
          return;
        }

        const climbs = response.playlistClimbs.climbs;

        // Filter out cross-layout climbs and update angle to route angle
        for (const climb of climbs) {
          const isCrossLayout = climb.layoutId != null && climb.layoutId !== boardDetails.layout_id;
          if (!isCrossLayout) {
            allClimbs.push({ ...climb, angle });
          }
        }
        hasMore = response.playlistClimbs.hasMore;
        page++;
      }

      if (allClimbs.length === 0) {
        message.info('No climbs to add from this playlist');
        return;
      }

      // Add all climbs to queue (cast to Climb - the queue only uses fields we have)
      for (const climb of allClimbs) {
        addToQueue(climb as Climb);
      }

      track('Playlist Add All To Queue', {
        playlistUuid,
        climbCount: allClimbs.length,
      });

      message.success(`Added ${allClimbs.length} ${allClimbs.length === 1 ? 'climb' : 'climbs'} to queue`);
    } catch (err) {
      // Don't show error if aborted
      if (abortController.signal.aborted) {
        return;
      }
      console.error('Error adding climbs to queue:', err);
      message.error('Failed to add climbs to queue');
    } finally {
      addingToQueueRef.current = false;
      setIsAddingToQueue(false);
    }
  }, [token, playlistUuid, boardDetails, angle, addToQueue]);

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
          playlistUuid={playlistUuid}
          onEditClick={() => setEditDrawerOpen(true)}
          onPlaylistUpdated={handlePlaylistUpdated}
          onAddAllToQueue={handleAddAllToQueue}
          isAddingToQueue={isAddingToQueue}
          climbCount={playlist.climbCount}
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

        {/* Climbs List */}
        <PlaylistClimbsList
          key={listRefreshKey}
          playlistUuid={playlistUuid}
          boardDetails={boardDetails}
          angle={angle}
        />
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
