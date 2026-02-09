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
  ElectricBoltOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@mui/icons-material';
import { BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST,
  DELETE_PLAYLIST,
  UPDATE_PLAYLIST_LAST_ACCESSED,
  GetPlaylistQueryResponse,
  GetPlaylistQueryVariables,
  Playlist,
  UpdatePlaylistLastAccessedMutationVariables,
  UpdatePlaylistLastAccessedMutationResponse,
  DeletePlaylistMutationVariables,
  DeletePlaylistMutationResponse,
} from '@/app/lib/graphql/operations/playlists';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { getBoardDetailsForPlaylist, getDefaultAngleForBoard } from '@/app/lib/board-config-for-playlist';
import { themeTokens } from '@/app/theme/theme-config';
import { useRouter } from 'next/navigation';
import BackButton from '@/app/components/back-button';
import { PlaylistGeneratorDrawer } from '@/app/components/playlist-generator';
import PlaylistEditDrawer from '@/app/components/library/playlist-edit-drawer';
import PlaylistClimbsList from './playlist-climbs-list';
import CommentSection from '@/app/components/social/comment-section';
import styles from '@/app/components/library/playlist-view.module.css';

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

type PlaylistDetailContentProps = {
  playlistUuid: string;
};

export default function PlaylistDetailContent({
  playlistUuid,
}: PlaylistDetailContentProps) {
  const router = useRouter();
  const { showMessage } = useSnackbar();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const lastAccessedUpdatedRef = useRef(false);
  const { token, isLoading: tokenLoading } = useWsAuthToken();

  // Derived board details from playlist
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [angle, setAngle] = useState<number>(40);

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

      // Derive board details
      const details = getBoardDetailsForPlaylist(
        response.playlist.boardType,
        response.playlist.layoutId,
      );
      setBoardDetails(details);
      setAngle(getDefaultAngleForBoard(response.playlist.boardType));
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

  // Update lastAccessedAt when playlist loads (fire-and-forget, only for owners)
  useEffect(() => {
    if (playlist && token && playlist.userRole === 'owner' && !lastAccessedUpdatedRef.current) {
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

  const handleEditSuccess = useCallback((updatedPlaylist: Playlist) => {
    setPlaylist(updatedPlaylist);
  }, []);

  const handlePlaylistUpdated = useCallback(() => {
    setListRefreshKey((prev) => prev + 1);
    fetchPlaylist();
  }, [fetchPlaylist]);

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
      router.push('/my-library');
    } catch (err) {
      console.error('Error deleting playlist:', err);
      showMessage('Failed to delete playlist', 'error');
    }
  }, [token, playlist, playlistUuid, router, showMessage]);

  const isOwner = playlist?.userRole === 'owner';

  const getPlaylistColor = () => {
    if (playlist?.color && isValidHexColor(playlist.color)) {
      return playlist.color;
    }
    return PLAYLIST_COLORS[0];
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
        <BackButton fallbackUrl="/my-library" />
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
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => setMenuAnchor(e.currentTarget)}
            aria-label="Playlist actions"
          >
            <MoreVertOutlined />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
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
        {boardDetails && (
          <PlaylistClimbsList
            key={listRefreshKey}
            playlistUuid={playlistUuid}
            boardDetails={boardDetails}
            angle={angle}
          />
        )}

        {!boardDetails && (
          <div className={styles.errorContainer}>
            <Typography variant="body2" color="text.secondary">
              Unable to load climb previews for this board configuration.
            </Typography>
          </div>
        )}

        {/* Discussion */}
        {playlist.isPublic && (
          <div className={styles.discussionSection}>
            <CommentSection
              entityType="playlist_climb"
              entityId={`${playlistUuid}:_all`}
              title="Discussion"
            />
          </div>
        )}
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
      {boardDetails && (
        <PlaylistGeneratorDrawer
          open={generatorOpen}
          onClose={() => setGeneratorOpen(false)}
          playlistUuid={playlistUuid}
          boardDetails={boardDetails}
          angle={angle}
          onSuccess={handlePlaylistUpdated}
        />
      )}
    </>
  );
}
