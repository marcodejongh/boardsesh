'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import MuiAlert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { FormatListBulletedOutlined, AppsOutlined } from '@mui/icons-material';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { track } from '@vercel/analytics';
import { Climb, BoardDetails } from '@/app/lib/types';
import { executeGraphQL, createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_PLAYLIST_CLIMBS,
  GetPlaylistClimbsQueryResponse,
  GetPlaylistClimbsQueryVariables,
  GET_USER_PLAYLISTS,
  GetUserPlaylistsQueryResponse,
  GET_PLAYLISTS_FOR_CLIMB,
  GetPlaylistsForClimbQueryResponse,
  ADD_CLIMB_TO_PLAYLIST,
  AddClimbToPlaylistMutationResponse,
  REMOVE_CLIMB_FROM_PLAYLIST,
  RemoveClimbFromPlaylistMutationResponse,
  CREATE_PLAYLIST,
  CreatePlaylistMutationResponse,
  Playlist,
} from '@/app/lib/graphql/operations/playlists';
import {
  GET_FAVORITES,
  FavoritesQueryResponse,
  TOGGLE_FAVORITE,
  ToggleFavoriteMutationResponse,
} from '@/app/lib/graphql/operations/favorites';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import ClimbCard from '@/app/components/climb-card/climb-card';
import ClimbListItem from '@/app/components/climb-card/climb-list-item';
import { ClimbCardSkeleton } from '@/app/components/board-page/board-page-skeleton';
import { EmptyState } from '@/app/components/ui/empty-state';
import { FavoritesProvider } from '@/app/components/climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '@/app/components/climb-actions/playlists-batch-context';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';
import styles from '@/app/components/library/playlist-view.module.css';

type ViewMode = 'grid' | 'list';

type PlaylistClimbsListProps = {
  playlistUuid: string;
  boardDetails: BoardDetails;
  angle: number;
};

const skeletonCardBoxSx = { width: { xs: '100%', lg: '50%' } };

const ClimbsListSkeleton = ({ aspectRatio }: { aspectRatio: number }) => {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <Box sx={skeletonCardBoxSx} key={i}>
          <ClimbCardSkeleton aspectRatio={aspectRatio} />
        </Box>
      ))}
    </>
  );
};

export default function PlaylistClimbsList({
  playlistUuid,
  boardDetails,
  angle,
}: PlaylistClimbsListProps) {
  const { token, isAuthenticated, isLoading: tokenLoading } = useWsAuthToken();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedClimbUuid, setSelectedClimbUuid] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Playlists state (same pattern as QueueContext)
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistMemberships, setPlaylistMemberships] = useState<Map<string, Set<string>>>(
    new Map(),
  );
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  // Load saved view mode preference
  useEffect(() => {
    getPreference<ViewMode>('playlistClimbListViewMode').then((saved) => {
      if (saved) setViewMode(saved);
    });
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPreference('playlistClimbListViewMode', mode);
    track('Playlist View Mode Changed', { mode, playlistUuid });
  }, [playlistUuid]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['playlistClimbs', playlistUuid, boardDetails.board_name, boardDetails.layout_id, boardDetails.size_id, angle],
    queryFn: async ({ pageParam = 0 }) => {
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
            angle: angle,
            page: pageParam,
            pageSize: 20,
          },
        },
        token,
      );
      return response.playlistClimbs;
    },
    enabled: !tokenLoading && !!token,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allClimbs: Climb[] = data?.pages.flatMap((page) => page.climbs as Climb[]) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Filter out cross-layout climbs
  const { visibleClimbs, hiddenCount } = useMemo(() => {
    const visible: Climb[] = [];
    let hidden = 0;

    for (const climb of allClimbs) {
      const isCrossLayout = climb.layoutId != null && climb.layoutId !== boardDetails.layout_id;
      if (isCrossLayout) {
        hidden++;
      } else {
        visible.push({ ...climb, angle });
      }
    }

    return { visibleClimbs: visible, hiddenCount: hidden };
  }, [allClimbs, boardDetails.layout_id, angle]);

  // === Favorites data fetching ===
  const climbUuids = useMemo(
    () => visibleClimbs.map((climb) => climb.uuid).sort(),
    [visibleClimbs],
  );

  const favoritesQueryKey = useMemo(
    () => ['favorites', boardDetails.board_name, angle, climbUuids.join(',')] as const,
    [boardDetails.board_name, angle, climbUuids],
  );

  const { data: favoritesData, isLoading: isLoadingFavorites } = useQuery({
    queryKey: favoritesQueryKey,
    queryFn: async (): Promise<Set<string>> => {
      if (climbUuids.length === 0) return new Set();
      const client = createGraphQLHttpClient(token);
      const result = await client.request<FavoritesQueryResponse>(GET_FAVORITES, {
        boardName: boardDetails.board_name,
        climbUuids,
        angle,
      });
      return new Set(result.favorites);
    },
    enabled: isAuthenticated && !tokenLoading && climbUuids.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const favorites = favoritesData ?? new Set<string>();

  const toggleFavoriteMutation = useMutation({
    mutationKey: ['toggleFavorite', boardDetails.board_name, angle],
    mutationFn: async (climbUuid: string): Promise<{ uuid: string; favorited: boolean }> => {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<ToggleFavoriteMutationResponse>(TOGGLE_FAVORITE, {
        input: {
          boardName: boardDetails.board_name,
          climbUuid,
          angle,
        },
      });
      return { uuid: climbUuid, favorited: result.toggleFavorite.favorited };
    },
    onMutate: async (climbUuid: string) => {
      await queryClient.cancelQueries({ queryKey: favoritesQueryKey });
      const previousFavorites = queryClient.getQueryData<Set<string>>(favoritesQueryKey);
      queryClient.setQueryData<Set<string>>(favoritesQueryKey, (old) => {
        const next = new Set(old);
        if (next.has(climbUuid)) {
          next.delete(climbUuid);
        } else {
          next.add(climbUuid);
        }
        return next;
      });
      return { previousFavorites };
    },
    onError: (_err, _climbUuid, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoritesQueryKey, context.previousFavorites);
      }
    },
  });

  const toggleFavorite = useCallback(
    async (climbUuid: string): Promise<boolean> => {
      if (!isAuthenticated) return false;
      const result = await toggleFavoriteMutation.mutateAsync(climbUuid);
      return result.favorited;
    },
    [isAuthenticated, toggleFavoriteMutation],
  );

  const isFavorited = useCallback(
    (climbUuid: string): boolean => favorites.has(climbUuid),
    [favorites],
  );

  // === Playlists data fetching ===
  // Fetch user's playlists
  useEffect(() => {
    if (!token || !isAuthenticated || boardDetails.board_name === 'moonboard') return;

    const fetchPlaylists = async () => {
      try {
        setPlaylistsLoading(true);
        const client = createGraphQLHttpClient(token);
        const response = await client.request<GetUserPlaylistsQueryResponse>(
          GET_USER_PLAYLISTS,
          {
            input: {
              boardType: boardDetails.board_name,
              layoutId: boardDetails.layout_id,
            },
          },
        );
        setPlaylists(response.userPlaylists);
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
        setPlaylists([]);
      } finally {
        setPlaylistsLoading(false);
      }
    };

    fetchPlaylists();
  }, [token, isAuthenticated, boardDetails.board_name, boardDetails.layout_id]);

  // Fetch playlist memberships for visible climbs
  useEffect(() => {
    if (
      !token ||
      !isAuthenticated ||
      boardDetails.board_name === 'moonboard' ||
      visibleClimbs.length === 0
    )
      return;

    const fetchPlaylistMemberships = async () => {
      try {
        const client = createGraphQLHttpClient(token);
        const memberships = new Map<string, Set<string>>();

        await Promise.all(
          visibleClimbs.map(async (climb) => {
            const response = await client.request<GetPlaylistsForClimbQueryResponse>(
              GET_PLAYLISTS_FOR_CLIMB,
              {
                input: {
                  boardType: boardDetails.board_name,
                  layoutId: boardDetails.layout_id,
                  climbUuid: climb.uuid,
                },
              },
            );
            memberships.set(climb.uuid, new Set(response.playlistsForClimb));
          }),
        );

        setPlaylistMemberships(memberships);
      } catch (error) {
        console.error('Failed to fetch playlist memberships:', error);
      }
    };

    fetchPlaylistMemberships();
  }, [token, isAuthenticated, boardDetails.board_name, boardDetails.layout_id, visibleClimbs]);

  const addToPlaylistHandler = useCallback(
    async (playlistId: string, climbUuid: string, climbAngle: number) => {
      if (!token) throw new Error('Not authenticated');
      const client = createGraphQLHttpClient(token);
      await client.request<AddClimbToPlaylistMutationResponse>(ADD_CLIMB_TO_PLAYLIST, {
        input: { playlistId, climbUuid, angle: climbAngle },
      });
      setPlaylistMemberships((prev) => {
        const updated = new Map(prev);
        const current = updated.get(climbUuid) || new Set<string>();
        current.add(playlistId);
        updated.set(climbUuid, current);
        return updated;
      });
      setPlaylists((prev) =>
        prev.map((p) => (p.uuid === playlistId ? { ...p, climbCount: p.climbCount + 1 } : p)),
      );
    },
    [token],
  );

  const removeFromPlaylistHandler = useCallback(
    async (playlistId: string, climbUuid: string) => {
      if (!token) throw new Error('Not authenticated');
      const client = createGraphQLHttpClient(token);
      await client.request<RemoveClimbFromPlaylistMutationResponse>(REMOVE_CLIMB_FROM_PLAYLIST, {
        input: { playlistId, climbUuid },
      });
      setPlaylistMemberships((prev) => {
        const updated = new Map(prev);
        const current = updated.get(climbUuid);
        if (current) {
          current.delete(playlistId);
          updated.set(climbUuid, current);
        }
        return updated;
      });
      setPlaylists((prev) =>
        prev.map((p) =>
          p.uuid === playlistId ? { ...p, climbCount: Math.max(0, p.climbCount - 1) } : p,
        ),
      );
    },
    [token],
  );

  const createPlaylistHandler = useCallback(
    async (
      name: string,
      description?: string,
      color?: string,
      icon?: string,
    ): Promise<Playlist> => {
      if (!token) throw new Error('Not authenticated');
      const client = createGraphQLHttpClient(token);
      const response = await client.request<CreatePlaylistMutationResponse>(CREATE_PLAYLIST, {
        input: {
          boardType: boardDetails.board_name,
          layoutId: boardDetails.layout_id,
          name,
          description,
          color,
          icon,
        },
      });
      setPlaylists((prev) => [response.createPlaylist, ...prev]);
      return response.createPlaylist;
    },
    [token, boardDetails.board_name, boardDetails.layout_id],
  );

  const refreshPlaylistsHandler = useCallback(async () => {
    if (!token) return;
    try {
      setPlaylistsLoading(true);
      const client = createGraphQLHttpClient(token);
      const response = await client.request<GetUserPlaylistsQueryResponse>(GET_USER_PLAYLISTS, {
        input: {
          boardType: boardDetails.board_name,
          layoutId: boardDetails.layout_id,
        },
      });
      setPlaylists(response.userPlaylists);
    } catch (error) {
      console.error('Failed to refresh playlists:', error);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [token, boardDetails.board_name, boardDetails.layout_id]);

  // Refs for observer callback values — prevents observer recreation on every page load
  const fetchNextPageRef = useRef(fetchNextPage);
  const hasNextPageRef = useRef(hasNextPage);
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  fetchNextPageRef.current = fetchNextPage;
  hasNextPageRef.current = hasNextPage;
  isFetchingNextPageRef.current = isFetchingNextPage;

  // Intersection Observer callback for infinite scroll — stable ref, never recreated
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPageRef.current && !isFetchingNextPageRef.current) {
        fetchNextPageRef.current();
      }
    },
    [],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  const handleClimbSelect = useCallback((climb: Climb) => {
    setSelectedClimbUuid(climb.uuid);
    track('Playlist Climb Selected', {
      climbUuid: climb.uuid,
      playlistUuid,
    });
  }, [playlistUuid]);

  const climbHandlersMap = useMemo(() => {
    const map = new Map<string, () => void>();
    visibleClimbs.forEach(climb => {
      map.set(climb.uuid, () => handleClimbSelect(climb));
    });
    return map;
  }, [visibleClimbs, handleClimbSelect]);

  const sentinelStyle = useMemo(
    () => ({ minHeight: '20px', marginTop: '16px' }),
    [],
  );

  const gridContainerSx = useMemo(() => ({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
  }), []);

  const cardBoxSx = useMemo(() => ({
    width: { xs: '100%', lg: '50%' },
  }), []);

  const aspectRatio = boardDetails.boardWidth / boardDetails.boardHeight;

  if ((isLoading || tokenLoading) && allClimbs.length === 0) {
    return (
      <div className={styles.climbsSection}>
        <Box sx={gridContainerSx}>
          <ClimbsListSkeleton aspectRatio={aspectRatio} />
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.climbsSection}>
        <EmptyState description="Failed to load climbs" />
      </div>
    );
  }

  if (visibleClimbs.length === 0 && hiddenCount === 0 && !isFetching) {
    return (
      <div className={styles.climbsSection}>
        <EmptyState description="No climbs in this playlist yet" />
      </div>
    );
  }

  return (
    <div className={styles.climbsSection}>
      {/* View Mode Toggle */}
      <div className={styles.viewModeToggle}>
        <IconButton
          size="small"
          color={viewMode === 'list' ? 'primary' : 'default'}
          onClick={() => handleViewModeChange('list')}
          aria-label="List view"
        >
          <FormatListBulletedOutlined />
        </IconButton>
        <IconButton
          size="small"
          color={viewMode === 'grid' ? 'primary' : 'default'}
          onClick={() => handleViewModeChange('grid')}
          aria-label="Grid view"
        >
          <AppsOutlined />
        </IconButton>
      </div>

      {hiddenCount > 0 && (
        <MuiAlert severity="info" className={styles.hiddenClimbsNotice}>
          {`Not showing ${hiddenCount} ${hiddenCount === 1 ? 'climb' : 'climbs'} from other layouts`}
        </MuiAlert>
      )}

      {visibleClimbs.length === 0 && hiddenCount > 0 && !isFetching && (
        <EmptyState description="All climbs in this playlist are from other layouts" />
      )}

      <FavoritesProvider
        favorites={favorites}
        isFavorited={isFavorited}
        toggleFavorite={toggleFavorite}
        isLoading={isLoadingFavorites}
        isAuthenticated={isAuthenticated}
      >
        <PlaylistsProvider
          playlists={playlists}
          playlistMemberships={playlistMemberships}
          addToPlaylist={addToPlaylistHandler}
          removeFromPlaylist={removeFromPlaylistHandler}
          createPlaylist={createPlaylistHandler}
          isLoading={playlistsLoading}
          isAuthenticated={isAuthenticated}
          refreshPlaylists={refreshPlaylistsHandler}
        >
          {viewMode === 'grid' ? (
            <Box sx={gridContainerSx}>
              {visibleClimbs.map((climb) => (
                <Box sx={cardBoxSx} key={climb.uuid}>
                  <ClimbCard
                    climb={climb}
                    boardDetails={boardDetails}
                    selected={selectedClimbUuid === climb.uuid}
                    onCoverDoubleClick={climbHandlersMap.get(climb.uuid)}
                  />
                </Box>
              ))}
              {isFetching && allClimbs.length === 0 && (
                <ClimbsListSkeleton aspectRatio={aspectRatio} />
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {visibleClimbs.map((climb) => (
                <ClimbListItem
                  key={climb.uuid}
                  climb={climb}
                  boardDetails={boardDetails}
                  selected={selectedClimbUuid === climb.uuid}
                  onSelect={climbHandlersMap.get(climb.uuid)}
                />
              ))}
            </Box>
          )}
        </PlaylistsProvider>
      </FavoritesProvider>

      <div ref={loadMoreRef} style={sentinelStyle}>
        {isFetchingNextPage && (
          <Box sx={gridContainerSx}>
            <ClimbsListSkeleton aspectRatio={aspectRatio} />
          </Box>
        )}
        {!hasNextPage && visibleClimbs.length > 0 && (
          <div className={styles.endOfList}>
            {allClimbs.length >= totalCount ? `All ${visibleClimbs.length} climbs loaded` : 'No more climbs'}
          </div>
        )}
      </div>
    </div>
  );
}
