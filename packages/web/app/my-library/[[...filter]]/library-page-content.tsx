'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  LabelOutlined,
  LoginOutlined,
  SentimentDissatisfiedOutlined,
  ArrowBackOutlined,
} from '@mui/icons-material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { executeGraphQL } from '@/app/lib/graphql/client';
import {
  GET_ALL_USER_PLAYLISTS,
  GetAllUserPlaylistsQueryResponse,
  GetAllUserPlaylistsInput,
  DISCOVER_PLAYLISTS,
  DiscoverPlaylistsQueryResponse,
  DiscoverPlaylistsInput,
  Playlist,
  DiscoverablePlaylist,
} from '@/app/lib/graphql/operations/playlists';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { getDefaultLayoutForBoard } from '@/app/lib/board-config-for-playlist';
import AuthModal from '@/app/components/auth/auth-modal';
import PlaylistCardGrid from '@/app/components/library/playlist-card-grid';
import PlaylistScrollSection from '@/app/components/library/playlist-scroll-section';
import PlaylistCard from '@/app/components/library/playlist-card';
import styles from '@/app/components/library/library.module.css';
import IconButton from '@mui/material/IconButton';

const BOARD_OPTIONS = ['all', 'kilter', 'tension', 'moonboard'] as const;

type LibraryPageContentProps = {
  boardFilter?: string;
};

export default function LibraryPageContent({
  boardFilter,
}: LibraryPageContentProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { token, isLoading: tokenLoading } = useWsAuthToken();
  const router = useRouter();
  const isAuthenticated = sessionStatus === 'authenticated';

  const [hasMounted, setHasMounted] = useState(false);
  const selectedBoard = boardFilter ?? 'all';
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Data states
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [popularPlaylists, setPopularPlaylists] = useState<DiscoverablePlaylist[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<DiscoverablePlaylist[]>([]);

  // Loading states
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (tokenLoading || !isAuthenticated) {
      setPlaylistsLoading(false);
      return;
    }

    try {
      setPlaylistsLoading(true);
      setError(null);

      const input: GetAllUserPlaylistsInput =
        selectedBoard !== 'all' ? { boardType: selectedBoard } : {};

      const playlistsRes = await executeGraphQL<GetAllUserPlaylistsQueryResponse, { input: GetAllUserPlaylistsInput }>(
        GET_ALL_USER_PLAYLISTS,
        { input },
        token,
      );

      setPlaylists(playlistsRes.allUserPlaylists);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load your library');
    } finally {
      setPlaylistsLoading(false);
    }
  }, [selectedBoard, token, tokenLoading, isAuthenticated]);

  // Fetch discover playlists (only when a specific board is selected)
  const fetchDiscoverData = useCallback(async () => {
    if (selectedBoard === 'all') {
      setPopularPlaylists([]);
      setRecentPlaylists([]);
      setDiscoverLoading(false);
      return;
    }

    const layoutId = getDefaultLayoutForBoard(selectedBoard);
    if (!layoutId) {
      setDiscoverLoading(false);
      return;
    }

    try {
      setDiscoverLoading(true);

      const baseInput: DiscoverPlaylistsInput = {
        boardType: selectedBoard,
        layoutId,
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
  }, [selectedBoard]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchDiscoverData();
  }, [fetchDiscoverData]);

  const getPlaylistUrl = useCallback((playlistUuid: string) => {
    return `/my-library/playlist/${playlistUuid}`;
  }, []);

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

  // Header with board filter pills
  const renderHeader = () => (
    <div className={styles.header}>
      <IconButton
        size="small"
        onClick={() => router.back()}
        aria-label="Go back"
        sx={{ mr: 0.5 }}
      >
        <ArrowBackOutlined />
      </IconButton>
      <div className={styles.pillsScroll}>
        {BOARD_OPTIONS.map((board) => (
          <Link
            key={board}
            href={board === 'all' ? '/my-library/all' : `/my-library/${board}`}
            className={`${styles.pill} ${selectedBoard === board ? styles.pillActive : ''}`}
          >
            {board === 'all' ? 'All' : board.charAt(0).toUpperCase() + board.slice(1)}
          </Link>
        ))}
      </div>
    </div>
  );

  // Error state (only for authenticated users with fetch errors)
  if (isAuthenticated && error) {
    return (
      <>
        {renderHeader()}
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

  const isLoading = !hasMounted || playlistsLoading || tokenLoading || sessionStatus === 'loading';
  const discoverItems = getDiscoverPlaylists();

  // Filter playlists by selected board
  const filteredPlaylists = selectedBoard === 'all'
    ? playlists
    : playlists.filter((p) => p.boardType === selectedBoard);

  return (
    <>
      {renderHeader()}

      {/* Sign-in banner for non-authenticated users */}
      {hasMounted && !isAuthenticated && sessionStatus !== 'loading' && (
        <div className={styles.signInBanner}>
          <LoginOutlined sx={{ color: 'text.secondary', fontSize: 28 }} />
          <div className={styles.signInBannerText}>
            <Typography variant="body2" fontWeight={600}>
              Sign in to create playlists
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manage your own climb playlists by signing in.
            </Typography>
          </div>
          <MuiButton
            variant="contained"
            size="small"
            onClick={() => setShowAuthModal(true)}
          >
            Sign In
          </MuiButton>
        </div>
      )}

      {/* Authenticated: Recent Playlists Grid */}
      {isAuthenticated && (
        <PlaylistCardGrid
          playlists={playlists}
          selectedBoard={selectedBoard}
          getPlaylistUrl={getPlaylistUrl}
          loading={isLoading}
        />
      )}

      {/* Empty state if no playlists (authenticated only) */}
      {isAuthenticated && !isLoading && playlists.length === 0 && (
        <div className={styles.emptyContainer}>
          <LabelOutlined className={styles.emptyIcon} />
          <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
            No playlists yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mb: 2 }}>
            Create your first playlist by adding climbs from the climb list.
          </Typography>
        </div>
      )}

      {/* Jump Back In (authenticated only) */}
      {isAuthenticated && (isLoading || filteredPlaylists.length > 0) && (
        <PlaylistScrollSection title="Jump Back In" loading={isLoading}>
          {filteredPlaylists.slice(0, 10).map((p, i) => (
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
