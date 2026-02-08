'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {
  LabelOutlined,
  PublicOutlined,
  LockOutlined,
  SentimentDissatisfiedOutlined,
  MoreVertOutlined,
  AddOutlined,
  ElectricBoltOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@mui/icons-material';
import { track } from '@vercel/analytics';
import { BoardDetails, Climb } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST,
  GET_PLAYLIST_CLIMBS,
  DELETE_PLAYLIST,
  UPDATE_PLAYLIST_LAST_ACCESSED,
  GetPlaylistQueryResponse,
  GetPlaylistQueryVariables,
  GetPlaylistClimbsQueryResponse,
  GetPlaylistClimbsQueryVariables,
  PlaylistClimbsResult,
  Playlist,
  UpdatePlaylistLastAccessedMutationVariables,
  UpdatePlaylistLastAccessedMutationResponse,
  DeletePlaylistMutationVariables,
  DeletePlaylistMutationResponse,
} from '@/app/lib/graphql/operations/playlists';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useQueueContext } from '@/app/components/graphql-queue';
import { themeTokens } from '@/app/theme/theme-config';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { useRouter } from 'next/navigation';
import BackButton from '@/app/components/back-button';
import { PlaylistGeneratorDrawer } from '@/app/components/playlist-generator';
import PlaylistEditDrawer from './playlist-edit-drawer';
import PlaylistClimbsList from './playlist-climbs-list';
import styles from './playlist-view.module.css';

// Validate hex color format
const isValidHexColor = (color: string): boolean => {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

const PLAYLIST_COLORS = [
  themeTokens.colors.primary,
  themeTokens.colors.logoGreen,
  themeTokens.colors.purple,
  themeTokens.colors.warning,
  themeTokens.colors.pink,
  themeTokens.colors.success,
  themeTokens.colors.logoRose,
  themeTokens.colors.amber,
];

type PlaylistViewContentProps = {
  playlistUuid: string;
  boardDetails: BoardDetails;
  angle: number;
};

export default function PlaylistViewContent({
  playlistUuid,
  boardDetails,
  angle,
}: PlaylistViewContentProps) {
  const router = useRouter();
  const { showMessage } = useSnackbar();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const addingToQueueRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAccessedUpdatedRef = useRef(false);
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

  // Update lastAccessedAt when playlist loads (fire-and-forget)
  useEffect(() => {
    if (playlist && token && !lastAccessedUpdatedRef.current) {
      lastAccessedUpdatedRef.current = true;
      executeGraphQL<UpdatePlaylistLastAccessedMutationResponse, UpdatePlaylistLastAccessedMutationVariables>(
        UPDATE_PLAYLIST_LAST_ACCESSED,
        { playlistId: playlistUuid },
        token,
      ).catch(() => {
        // Silently ignore - this is fire-and-forget
      });
    }
  }, [playlist, token, playlistUuid]);

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
    setListRefreshKey((prev) => prev + 1);
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handleAddAllToQueue = useCallback(async () => {
    if (!token || addingToQueueRef.current) return;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    addingToQueueRef.current = true;
    setIsAddingToQueue(true);
    setMenuAnchor(null);

    try {
      type PlaylistClimb = PlaylistClimbsResult['climbs'][number];
      const allClimbs: Array<PlaylistClimb & { angle: number }> = [];
      let page = 0;
      let hasMore = true;
      const pageSize = 100;

      while (hasMore) {
        if (abortController.signal.aborted) return;

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

        if (abortController.signal.aborted) return;

        const climbs = response.playlistClimbs.climbs;
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
        showMessage('No climbs to add from this playlist', 'info');
        return;
      }

      for (const climb of allClimbs) {
        addToQueue(climb as Climb);
      }

      track('Playlist Add All To Queue', {
        playlistUuid,
        climbCount: allClimbs.length,
      });

      showMessage(`Added ${allClimbs.length} ${allClimbs.length === 1 ? 'climb' : 'climbs'} to queue`, 'success');
    } catch (err) {
      if (abortController.signal.aborted) return;
      console.error('Error adding climbs to queue:', err);
      showMessage('Failed to add climbs to queue', 'error');
    } finally {
      addingToQueueRef.current = false;
      setIsAddingToQueue(false);
    }
  }, [token, playlistUuid, boardDetails, angle, addToQueue, showMessage]);

  const handleDelete = useCallback(async () => {
    if (!token || !playlist) return;
    setMenuAnchor(null);

    try {
      await executeGraphQL<DeletePlaylistMutationResponse, DeletePlaylistMutationVariables>(
        DELETE_PLAYLIST,
        { playlistId: playlistUuid },
        token,
      );

      showMessage('Playlist deleted', 'success');

      // Navigate back to playlists
      const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
      if (layout_name && size_name && set_names) {
        const layoutSlug = generateLayoutSlug(layout_name);
        const sizeSlug = generateSizeSlug(size_name, size_description);
        const setSlug = generateSetSlug(set_names);
        router.push(`/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/playlists`);
      } else {
        router.push(`/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/playlists`);
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      showMessage('Failed to delete playlist', 'error');
    }
  }, [token, playlist, playlistUuid, boardDetails, angle, router, showMessage]);

  const isOwner = playlist?.userRole === 'owner';

  const getPlaylistColor = () => {
    if (playlist?.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return PLAYLIST_COLORS[0];
  };

  const getBackUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      const layoutSlug = generateLayoutSlug(layout_name);
      const sizeSlug = generateSizeSlug(size_name, size_description);
      const setSlug = generateSetSlug(set_names);
      return `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/playlists`;
    }
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/playlists`;
  };

  if (loading || tokenLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className={styles.errorContainer}>
        <SentimentDissatisfiedOutlined className={styles.errorIcon} />
        <div className={styles.errorTitle}>
          {error === 'Playlist not found' ? 'Playlist Not Found' : 'Unable to Load Playlist'}
        </div>
        <div className={styles.errorMessage}>
          {error === 'Playlist not found'
            ? 'This playlist may have been deleted or you may not have permission to view it.'
            : 'There was an error loading this playlist. Please try again.'}
        </div>
        <MuiButton variant="outlined" onClick={fetchPlaylist}>Try Again</MuiButton>
      </div>
    );
  }

  return (
    <>
      {/* Back Button */}
      <div className={styles.actionsSection}>
        <BackButton fallbackUrl={getBackUrl()} />
      </div>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        {/* Hero Card */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <div
              className={styles.heroSquare}
              style={{ backgroundColor: getPlaylistColor() }}
            >
              {playlist.icon ? (
                <span className={styles.heroSquareEmoji}>{playlist.icon}</span>
              ) : (
                <LabelOutlined className={styles.heroSquareIcon} />
              )}
            </div>
            <div className={styles.heroInfo}>
              <Typography variant="h5" component="h2" className={styles.heroName}>
                {playlist.name}
              </Typography>
              <div className={styles.heroMeta}>
                <span className={styles.heroMetaItem}>
                  {playlist.climbCount} {playlist.climbCount === 1 ? 'climb' : 'climbs'}
                </span>
                <span
                  className={`${styles.visibilityBadge} ${
                    playlist.isPublic ? styles.publicBadge : styles.privateBadge
                  }`}
                >
                  {playlist.isPublic ? (
                    <><PublicOutlined sx={{ fontSize: 14 }} /> Public</>
                  ) : (
                    <><LockOutlined sx={{ fontSize: 14 }} /> Private</>
                  )}
                </span>
              </div>
              {playlist.description && (
                <Typography variant="body2" className={styles.heroDescription}>
                  {playlist.description}
                </Typography>
              )}
            </div>
          </div>

          {/* Ellipsis Menu */}
          <IconButton
            className={styles.heroMenuButton}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            aria-label="Playlist actions"
          >
            <MoreVertOutlined />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={handleAddAllToQueue}
              disabled={playlist.climbCount === 0 || isAddingToQueue}
            >
              <ListItemIcon><AddOutlined /></ListItemIcon>
              <ListItemText>{isAddingToQueue ? 'Adding...' : 'Queue All'}</ListItemText>
            </MenuItem>
            {isOwner && (
              <MenuItem onClick={() => { setMenuAnchor(null); setGeneratorOpen(true); }}>
                <ListItemIcon><ElectricBoltOutlined /></ListItemIcon>
                <ListItemText>Generate</ListItemText>
              </MenuItem>
            )}
            {isOwner && (
              <MenuItem onClick={() => { setMenuAnchor(null); setEditDrawerOpen(true); }}>
                <ListItemIcon><EditOutlined /></ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
            )}
            {isOwner && (
              <MenuItem onClick={handleDelete} sx={{ color: themeTokens.colors.error }}>
                <ListItemIcon><DeleteOutlined sx={{ color: themeTokens.colors.error }} /></ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            )}
          </Menu>
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

      {/* Generator Drawer */}
      <PlaylistGeneratorDrawer
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        playlistUuid={playlistUuid}
        boardDetails={boardDetails}
        angle={angle}
        onSuccess={handlePlaylistUpdated}
      />
    </>
  );
}
