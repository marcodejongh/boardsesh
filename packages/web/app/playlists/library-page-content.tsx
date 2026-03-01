'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import {
  LabelOutlined,
  LoginOutlined,
  SentimentDissatisfiedOutlined,
  ArrowBackOutlined,
} from '@mui/icons-material';
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
import { useMyBoards } from '@/app/hooks/use-my-boards';
import { useQueueBridgeBoardInfo } from '@/app/components/queue-control/queue-bridge-context';
import { constructBoardSlugUrl } from '@/app/lib/url-utils';
import type { UserBoard } from '@boardsesh/shared-schema';
import AuthModal from '@/app/components/auth/auth-modal';
import PlaylistCardGrid from '@/app/components/library/playlist-card-grid';
import PlaylistScrollSection from '@/app/components/library/playlist-scroll-section';
import PlaylistCard from '@/app/components/library/playlist-card';
import BoardScrollSection from '@/app/components/board-scroll/board-scroll-section';
import BoardScrollCard from '@/app/components/board-scroll/board-scroll-card';
import styles from '@/app/components/library/library.module.css';
import boardScrollStyles from '@/app/components/board-scroll/board-scroll.module.css';

/**
 * Find the UserBoard that best matches a board identified by type + layout + size.
 */
function findMatchingBoard(
  boards: UserBoard[],
  boardName: string | undefined,
  layoutId: number | undefined,
  sizeId: number | undefined,
): UserBoard | null {
  if (!boardName) return null;
  return boards.find((b) =>
    b.boardType === boardName &&
    b.layoutId === layoutId &&
    b.sizeId === sizeId,
  ) ?? null;
}

type LibraryPageContentProps = {
  /** When set, the page was rendered from a board route and this board is pre-selected. */
  boardSlug?: string;
  boardAngle?: number;
};

export default function LibraryPageContent({ boardSlug, boardAngle: _boardAngle }: LibraryPageContentProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { token, isLoading: tokenLoading } = useWsAuthToken();
  const router = useRouter();
  const isAuthenticated = sessionStatus === 'authenticated';

  const [hasMounted, setHasMounted] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const defaultBoardAppliedRef = useRef(false);

  // Fetch user's boards for the board selector
  const { boards: myBoards, isLoading: boardsLoading } = useMyBoards(hasMounted);

  // Get current session/queue board info to use as default selection (global route only)
  const { boardDetails: currentBoardDetails, hasActiveQueue } = useQueueBridgeBoardInfo();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Auto-select the matching board once boards finish loading
  useEffect(() => {
    if (defaultBoardAppliedRef.current || boardsLoading || myBoards.length === 0) return;

    if (boardSlug) {
      // Board route: match by slug
      const match = myBoards.find((b) => b.slug === boardSlug);
      if (match) {
        setSelectedBoard(match);
      }
      defaultBoardAppliedRef.current = true;
    } else {
      // Global route: match from current session/queue board
      // Wait if there's an active queue but board details haven't loaded yet
      if (!currentBoardDetails && hasActiveQueue) return;

      const match = findMatchingBoard(
        myBoards,
        currentBoardDetails?.board_name,
        currentBoardDetails?.layout_id,
        currentBoardDetails?.size_id,
      );
      if (match) {
        setSelectedBoard(match);
      }
      defaultBoardAppliedRef.current = true;
    }
  }, [myBoards, boardsLoading, currentBoardDetails, hasActiveQueue, boardSlug]);

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

      const input: GetAllUserPlaylistsInput = selectedBoard
        ? { boardType: selectedBoard.boardType }
        : {};

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

  // Fetch discover playlists (works for both "All" and specific board)
  const fetchDiscoverData = useCallback(async () => {
    try {
      setDiscoverLoading(true);

      const baseInput: DiscoverPlaylistsInput = {
        pageSize: 10,
        ...(selectedBoard && {
          boardType: selectedBoard.boardType,
          layoutId: selectedBoard.layoutId,
        }),
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
    return `/playlists/${playlistUuid}`;
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

  const handleBoardSelect = useCallback((board: UserBoard | null) => {
    setSelectedBoard(board);

    // When rendered from a board route, switching boards navigates to the correct URL
    if (boardSlug) {
      if (board) {
        router.push(constructBoardSlugUrl(board.slug, board.angle, 'playlists'));
      } else {
        router.push('/playlists');
      }
    }
  }, [boardSlug, router]);

  const handleAllBoardsKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBoardSelect(null);
    }
  }, [handleBoardSelect]);

  // Header with back button
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
      <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
        Playlists
      </Typography>
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
  const filteredPlaylists = selectedBoard
    ? playlists.filter((p) => p.boardType === selectedBoard.boardType)
    : playlists;

  return (
    <>
      {renderHeader()}

      {/* Board Selector */}
      <BoardScrollSection loading={boardsLoading && myBoards.length === 0} size="small">
        <div
          className={`${boardScrollStyles.cardScroll} ${boardScrollStyles.cardScrollSmall}`}
          role="button"
          tabIndex={0}
          onClick={() => handleBoardSelect(null)}
          onKeyDown={handleAllBoardsKeyDown}
        >
          <div className={`${boardScrollStyles.cardSquare} ${boardScrollStyles.filterSquare} ${!selectedBoard ? boardScrollStyles.cardSquareSelected : ''}`}>
            <span className={boardScrollStyles.filterLabel}>All</span>
          </div>
          <div className={`${boardScrollStyles.cardName} ${!selectedBoard ? boardScrollStyles.cardNameSelected : ''}`}>
            All Boards
          </div>
        </div>
        {myBoards.map((board) => (
          <BoardScrollCard
            key={board.uuid}
            userBoard={board}
            size="small"
            selected={selectedBoard?.uuid === board.uuid}
            onClick={() => handleBoardSelect(board)}
          />
        ))}
      </BoardScrollSection>

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
          playlists={filteredPlaylists}
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
