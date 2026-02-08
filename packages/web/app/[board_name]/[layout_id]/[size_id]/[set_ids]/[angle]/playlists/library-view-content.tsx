'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  LabelOutlined,
  LoginOutlined,
  SentimentDissatisfiedOutlined,
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BoardDetails } from '@/app/lib/types';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_USER_PLAYLISTS,
  GetUserPlaylistsQueryResponse,
  GetUserPlaylistsInput,
  DISCOVER_PLAYLISTS,
  DiscoverPlaylistsQueryResponse,
  DiscoverPlaylistsInput,
  Playlist,
  DiscoverablePlaylist,
} from '@/app/lib/graphql/operations/playlists';
import {
  GET_USER_FAVORITES_COUNTS,
  UserFavoritesCountsQueryResponse,
  FavoritesCount,
  GET_USER_ACTIVE_BOARDS,
  UserActiveBoardsQueryResponse,
} from '@/app/lib/graphql/operations/favorites';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { constructClimbListWithSlugs, generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import { themeTokens } from '@/app/theme/theme-config';
import AuthModal from '@/app/components/auth/auth-modal';
import LibraryHeader from './library-header';
import PlaylistCardGrid from './playlist-card-grid';
import PlaylistScrollSection from './playlist-scroll-section';
import PlaylistCard from './playlist-card';
import styles from './library.module.css';

type LibraryViewContentProps = {
  boardDetails: BoardDetails;
  angle: number;
};

export default function LibraryViewContent({
  boardDetails,
  angle,
}: LibraryViewContentProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { token, isLoading: tokenLoading } = useWsAuthToken();
  const isAuthenticated = sessionStatus === 'authenticated';

  const [selectedBoard, setSelectedBoard] = useState<string>('all');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Data states
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeBoards, setActiveBoards] = useState<string[]>([]);
  const [favoritesCounts, setFavoritesCounts] = useState<FavoritesCount[]>([]);
  const [popularPlaylists, setPopularPlaylists] = useState<DiscoverablePlaylist[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<DiscoverablePlaylist[]>([]);

  // Loading states
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data (playlists, active boards, favorites counts)
  const fetchUserData = useCallback(async () => {
    if (tokenLoading || !isAuthenticated) {
      setPlaylistsLoading(false);
      return;
    }

    try {
      setPlaylistsLoading(true);
      setError(null);

      const [playlistsRes, boardsRes, favoritesRes] = await Promise.all([
        executeGraphQL<GetUserPlaylistsQueryResponse, { input: GetUserPlaylistsInput }>(
          GET_USER_PLAYLISTS,
          {
            input: {
              boardType: boardDetails.board_name,
              layoutId: boardDetails.layout_id,
            },
          },
          token,
        ),
        executeGraphQL<UserActiveBoardsQueryResponse, Record<string, never>>(
          GET_USER_ACTIVE_BOARDS,
          {},
          token,
        ),
        executeGraphQL<UserFavoritesCountsQueryResponse, Record<string, never>>(
          GET_USER_FAVORITES_COUNTS,
          {},
          token,
        ),
      ]);

      setPlaylists(playlistsRes.userPlaylists);
      setActiveBoards(boardsRes.userActiveBoards);
      setFavoritesCounts(favoritesRes.userFavoritesCounts);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load your library');
    } finally {
      setPlaylistsLoading(false);
    }
  }, [boardDetails.board_name, boardDetails.layout_id, token, tokenLoading, isAuthenticated]);

  // Fetch discover playlists (no auth needed)
  const fetchDiscoverData = useCallback(async () => {
    try {
      setDiscoverLoading(true);

      const baseInput: DiscoverPlaylistsInput = {
        boardType: boardDetails.board_name,
        layoutId: boardDetails.layout_id,
        pageSize: 10,
      };

      const [popularRes, recentRes] = await Promise.all([
        executeGraphQL<DiscoverPlaylistsQueryResponse, { input: DiscoverPlaylistsInput }>(
          DISCOVER_PLAYLISTS,
          { input: { ...baseInput, sortBy: 'popular' } },
        ),
        executeGraphQL<DiscoverPlaylistsQueryResponse, { input: DiscoverPlaylistsInput }>(
          DISCOVER_PLAYLISTS,
          { input: { ...baseInput, sortBy: 'recent' } },
        ),
      ]);

      setPopularPlaylists(popularRes.discoverPlaylists.playlists);
      setRecentPlaylists(recentRes.discoverPlaylists.playlists);
    } catch (err) {
      console.error('Error fetching discover playlists:', err);
    } finally {
      setDiscoverLoading(false);
    }
  }, [boardDetails.board_name, boardDetails.layout_id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchDiscoverData();
  }, [fetchDiscoverData]);

  // URL helpers
  const getPlaylistUrl = useCallback((playlistUuid: string) => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      const layoutSlug = generateLayoutSlug(layout_name);
      const sizeSlug = generateSizeSlug(size_name, size_description);
      const setSlug = generateSetSlug(set_names);
      return `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/playlist/${playlistUuid}`;
    }
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/playlist/${playlistUuid}`;
  }, [boardDetails, angle]);

  const getBackToListUrl = useCallback(() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  }, [boardDetails, angle]);

  const getFavoritesUrl = useCallback(() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names) {
      const layoutSlug = generateLayoutSlug(layout_name);
      const sizeSlug = generateSizeSlug(size_name, size_description);
      const setSlug = generateSetSlug(set_names);
      return `/${board_name}/${layoutSlug}/${sizeSlug}/${setSlug}/${angle}/liked`;
    }
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/liked`;
  }, [boardDetails, angle]);

  // Get total favorites count (optionally filtered by board)
  const getTotalFavoritesCount = useCallback(() => {
    if (selectedBoard === 'all') {
      return favoritesCounts.reduce((sum, fc) => sum + fc.count, 0);
    }
    return favoritesCounts.find((fc) => fc.boardName === selectedBoard)?.count ?? 0;
  }, [favoritesCounts, selectedBoard]);

  // Filter discover playlists to exclude user's own
  const getDiscoverPlaylists = useCallback(() => {
    const userId = session?.user?.id;
    const combined = [...popularPlaylists, ...recentPlaylists];
    const seen = new Set<string>();
    const filtered: DiscoverablePlaylist[] = [];

    for (const p of combined) {
      if (seen.has(p.uuid)) continue;
      if (userId && p.creatorId === userId) continue;
      seen.add(p.uuid);
      filtered.push(p);
    }

    return filtered;
  }, [popularPlaylists, recentPlaylists, session?.user?.id]);

  // Not authenticated state
  if (!isAuthenticated && sessionStatus !== 'loading') {
    return (
      <>
        <LibraryHeader
          activeBoards={[]}
          selectedBoard="all"
          onBoardChange={() => {}}
        />
        <div className={styles.emptyContainer}>
          <LabelOutlined className={styles.emptyIcon} />
          <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
            Sign in to view your library
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
            Create and manage your own climb playlists by signing in.
          </Typography>
          <MuiButton
            variant="contained"
            startIcon={<LoginOutlined />}
            onClick={() => setShowAuthModal(true)}
            sx={{ mt: 2 }}
          >
            Sign In
          </MuiButton>
        </div>

        {/* Still show discover section for non-authenticated users */}
        {!discoverLoading && getDiscoverPlaylists().length > 0 && (
          <PlaylistScrollSection title="Discover">
            {getDiscoverPlaylists().map((p, i) => (
              <PlaylistCard
                key={p.uuid}
                name={p.name}
                climbCount={p.climbCount}
                color={p.color}
                icon={p.icon}
                href={getPlaylistUrl(p.uuid)}
                variant="scroll"
                index={i}
              />
            ))}
          </PlaylistScrollSection>
        )}

        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Sign in to Boardsesh"
          description="Sign in to create and manage your climb playlists."
        />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <LibraryHeader
          activeBoards={activeBoards}
          selectedBoard={selectedBoard}
          onBoardChange={setSelectedBoard}
        />
        <div className={styles.errorContainer}>
          <SentimentDissatisfiedOutlined className={styles.errorIcon} />
          <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
            Unable to Load Library
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            There was an error loading your library. Please try again.
          </Typography>
          <MuiButton variant="outlined" onClick={fetchUserData}>Try Again</MuiButton>
        </div>
      </>
    );
  }

  const isLoading = playlistsLoading || tokenLoading || sessionStatus === 'loading';
  const favoritesCount = getTotalFavoritesCount();
  const discoverItems = getDiscoverPlaylists();

  // Jump back in items: liked climbs + recent playlists
  const jumpBackInPlaylists = selectedBoard === 'all'
    ? playlists
    : playlists.filter((p) => p.boardType === selectedBoard);

  return (
    <>
      <LibraryHeader
        activeBoards={activeBoards}
        selectedBoard={selectedBoard}
        onBoardChange={setSelectedBoard}
      />

      {/* Recent Playlists Grid */}
      <PlaylistCardGrid
        playlists={playlists}
        selectedBoard={selectedBoard}
        getPlaylistUrl={getPlaylistUrl}
        loading={isLoading}
      />

      {/* Empty state if no playlists */}
      {!isLoading && playlists.length === 0 && (
        <div className={styles.emptyContainer}>
          <LabelOutlined className={styles.emptyIcon} />
          <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
            No playlists yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mb: 2 }}>
            Create your first playlist by adding climbs from the climb list.
          </Typography>
          <Link href={getBackToListUrl()}>
            <MuiButton variant="contained">
              Browse Climbs
            </MuiButton>
          </Link>
        </div>
      )}

      {/* Jump Back In */}
      {(isLoading || jumpBackInPlaylists.length > 0 || favoritesCount > 0) && (
        <PlaylistScrollSection title="Jump Back In" loading={isLoading}>
          {favoritesCount > 0 && (
            <PlaylistCard
              name="Liked Climbs"
              climbCount={favoritesCount}
              href={getFavoritesUrl()}
              variant="scroll"
              isLikedClimbs
            />
          )}
          {jumpBackInPlaylists.slice(0, 10).map((p, i) => (
            <PlaylistCard
              key={p.uuid}
              name={p.name}
              climbCount={p.climbCount}
              color={p.color}
              icon={p.icon}
              href={getPlaylistUrl(p.uuid)}
              variant="scroll"
              index={i}
            />
          ))}
        </PlaylistScrollSection>
      )}

      {/* Discover */}
      {(discoverLoading || discoverItems.length > 0) && (
        <PlaylistScrollSection title="Discover" loading={discoverLoading}>
          {discoverItems.map((p, i) => (
            <PlaylistCard
              key={p.uuid}
              name={p.name}
              climbCount={p.climbCount}
              color={p.color}
              icon={p.icon}
              href={getPlaylistUrl(p.uuid)}
              variant="scroll"
              index={i}
            />
          ))}
        </PlaylistScrollSection>
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Sign in to create and manage your climb playlists."
      />
    </>
  );
}
