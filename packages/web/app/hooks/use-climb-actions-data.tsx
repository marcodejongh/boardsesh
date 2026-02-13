'use client';

import { useCallback, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_FAVORITES,
  TOGGLE_FAVORITE,
  type FavoritesQueryResponse,
  type ToggleFavoriteMutationResponse,
} from '@/app/lib/graphql/operations/favorites';
import {
  GET_ALL_USER_PLAYLISTS,
  GET_PLAYLISTS_FOR_CLIMB,
  ADD_CLIMB_TO_PLAYLIST,
  REMOVE_CLIMB_FROM_PLAYLIST,
  CREATE_PLAYLIST,
  type GetAllUserPlaylistsQueryResponse,
  type GetPlaylistsForClimbQueryResponse,
  type AddClimbToPlaylistMutationResponse,
  type RemoveClimbFromPlaylistMutationResponse,
  type CreatePlaylistMutationResponse,
  type Playlist,
} from '@/app/lib/graphql/operations/playlists';

interface UseClimbActionsDataOptions {
  boardName: string;
  layoutId: number;
  angle: number;
  climbUuids: string[];
}

export function useClimbActionsData({
  boardName,
  layoutId,
  angle,
  climbUuids,
}: UseClimbActionsDataOptions) {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useWsAuthToken();
  const { showMessage } = useSnackbar();
  const queryClient = useQueryClient();

  // Stable sorted UUIDs to prevent unnecessary re-fetches
  const sortedClimbUuids = useMemo(() => [...climbUuids].sort(), [climbUuids]);

  // === Favorites ===

  const favoritesQueryKey = useMemo(
    () => ['favorites', boardName, angle, sortedClimbUuids.join(',')] as const,
    [boardName, angle, sortedClimbUuids],
  );

  const { data: favoritesData, isLoading: isLoadingFavorites } = useQuery({
    queryKey: favoritesQueryKey,
    queryFn: async (): Promise<Set<string>> => {
      if (sortedClimbUuids.length === 0) return new Set();
      const client = createGraphQLHttpClient(token);
      try {
        const result = await client.request<FavoritesQueryResponse>(GET_FAVORITES, {
          boardName,
          climbUuids: sortedClimbUuids,
          angle,
        });
        return new Set(result.favorites);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GraphQL] Favorites query error for ${boardName}:`, error);
        throw new Error(`Failed to fetch favorites: ${errorMessage}`);
      }
    },
    enabled: isAuthenticated && !isAuthLoading && sortedClimbUuids.length > 0 && !!boardName,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const favorites = favoritesData ?? new Set<string>();

  const toggleFavoriteMutation = useMutation({
    mutationKey: ['toggleFavorite', boardName, angle],
    mutationFn: async (climbUuid: string): Promise<{ uuid: string; favorited: boolean }> => {
      const client = createGraphQLHttpClient(token);
      try {
        const result = await client.request<ToggleFavoriteMutationResponse>(TOGGLE_FAVORITE, {
          input: { boardName, climbUuid, angle },
        });
        return { uuid: climbUuid, favorited: result.toggleFavorite.favorited };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GraphQL] Toggle favorite error for climb ${climbUuid}:`, error);
        throw new Error(`Failed to toggle favorite: ${errorMessage}`);
      }
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
    onError: (err, climbUuid, context) => {
      console.error(`[Favorites] Error toggling favorite for climb ${climbUuid}:`, err);
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoritesQueryKey, context.previousFavorites);
      }
      showMessage('Failed to update favorite. Please try again.', 'error');
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

  // === Playlists ===

  const [playlistMemberships, setPlaylistMemberships] = useState<Map<string, Set<string>>>(
    new Map(),
  );

  // Fetch user's playlists (all boards)
  const playlistsQueryKey = useMemo(() => ['userPlaylists', token] as const, [token]);

  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: playlistsQueryKey,
    queryFn: async (): Promise<Playlist[]> => {
      const client = createGraphQLHttpClient(token);
      const response = await client.request<GetAllUserPlaylistsQueryResponse>(GET_ALL_USER_PLAYLISTS, {
        input: {},
      });
      return response.allUserPlaylists;
    },
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch playlist memberships for visible climbs
  const climbUuidsKey = useMemo(() => sortedClimbUuids.join(','), [sortedClimbUuids]);

  const { data: membershipsData } = useQuery({
    queryKey: ['playlistMemberships', boardName, layoutId, climbUuidsKey],
    queryFn: async (): Promise<Map<string, Set<string>>> => {
      if (sortedClimbUuids.length === 0) return new Map();
      const client = createGraphQLHttpClient(token);
      const memberships = new Map<string, Set<string>>();

      await Promise.all(
        sortedClimbUuids.map(async (uuid) => {
          const response = await client.request<GetPlaylistsForClimbQueryResponse>(
            GET_PLAYLISTS_FOR_CLIMB,
            { input: { boardType: boardName, layoutId, climbUuid: uuid } },
          );
          memberships.set(uuid, new Set(response.playlistsForClimb));
        }),
      );

      return memberships;
    },
    enabled:
      isAuthenticated && !isAuthLoading && sortedClimbUuids.length > 0 && !!boardName && layoutId > 0 && boardName !== 'moonboard',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Merge query data with local optimistic state
  const effectiveMemberships = membershipsData
    ? new Map([...membershipsData, ...playlistMemberships])
    : playlistMemberships;

  const addToPlaylist = useCallback(
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
      queryClient.setQueryData<Playlist[]>(playlistsQueryKey, (prev) =>
        prev?.map((p) => (p.uuid === playlistId ? { ...p, climbCount: p.climbCount + 1 } : p)),
      );
    },
    [token, playlistsQueryKey, queryClient],
  );

  const removeFromPlaylist = useCallback(
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
      queryClient.setQueryData<Playlist[]>(playlistsQueryKey, (prev) =>
        prev?.map((p) =>
          p.uuid === playlistId ? { ...p, climbCount: Math.max(0, p.climbCount - 1) } : p,
        ),
      );
    },
    [token, playlistsQueryKey, queryClient],
  );

  const createPlaylist = useCallback(
    async (
      name: string,
      description?: string,
      color?: string,
      icon?: string,
    ): Promise<Playlist> => {
      if (!token) throw new Error('Not authenticated');
      const client = createGraphQLHttpClient(token);
      const response = await client.request<CreatePlaylistMutationResponse>(CREATE_PLAYLIST, {
        input: { boardType: boardName, layoutId, name, description, color, icon },
      });
      queryClient.setQueryData<Playlist[]>(playlistsQueryKey, (prev) =>
        prev ? [response.createPlaylist, ...prev] : [response.createPlaylist],
      );
      return response.createPlaylist;
    },
    [token, boardName, layoutId, playlistsQueryKey, queryClient],
  );

  const refreshPlaylists = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: playlistsQueryKey });
  }, [queryClient, playlistsQueryKey]);

  return {
    favoritesProviderProps: {
      favorites,
      isFavorited,
      toggleFavorite,
      isLoading: isLoadingFavorites,
      isAuthenticated,
    },
    playlistsProviderProps: {
      playlists,
      playlistMemberships: effectiveMemberships,
      addToPlaylist,
      removeFromPlaylist,
      createPlaylist,
      isLoading: playlistsLoading,
      isAuthenticated,
      refreshPlaylists,
    },
  };
}
