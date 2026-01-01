'use client';

import React, { useContext, createContext, ReactNode, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useQueueReducer } from '../queue-control/reducer';
import { useQueueDataFetching } from '../queue-control/hooks/use-queue-data-fetching';
import { QueueContextType, ClimbQueueItem, UserName, QueueItemUser } from '../queue-control/types';
import { urlParamsToSearchParams, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useConnectionSettings } from '../connection-manager/connection-settings-context';
import { usePartyProfile } from '../party-manager/party-profile-context';
import { SubscriptionQueueEvent } from '@boardsesh/shared-schema';
import { saveSessionToHistory } from '../setup-wizard/session-history-panel';
import { usePersistentSession } from '../persistent-session';
import { FavoritesProvider } from '../climb-actions/favorites-batch-context';
import { PlaylistsProvider, type Playlist } from '../climb-actions/playlists-batch-context';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_USER_PLAYLISTS,
  GET_PLAYLISTS_FOR_CLIMB,
  ADD_CLIMB_TO_PLAYLIST,
  REMOVE_CLIMB_FROM_PLAYLIST,
  CREATE_PLAYLIST,
  type GetUserPlaylistsQueryResponse,
  type GetPlaylistsForClimbQueryResponse,
  type CreatePlaylistMutationResponse,
  type AddClimbToPlaylistMutationResponse,
  type RemoveClimbFromPlaylistMutationResponse,
} from '@/app/lib/graphql/operations/playlists';

/**
 * Extracts the base board configuration path from a full pathname.
 * This removes dynamic segments that can change during a session:
 * - /play/[climb_uuid] - viewing different climbs
 * - /list, /create - different views
 * - /{angle} - the board angle is adjustable during a session
 *
 * The base path represents the physical board setup: /{board}/{layout}/{size}/{sets}
 */
function getBaseBoardPath(pathname: string): string {
  // First, strip off /play/[uuid], /list, or /create if present
  let path = pathname;

  const playMatch = path.match(/^(.+?)\/play\/[^/]+$/);
  if (playMatch) {
    path = playMatch[1];
  } else {
    const listMatch = path.match(/^(.+?)\/list$/);
    if (listMatch) {
      path = listMatch[1];
    } else {
      const createMatch = path.match(/^(.+?)\/create$/);
      if (createMatch) {
        path = createMatch[1];
      }
    }
  }

  // Strip off the angle (last segment, which is a number)
  const angleMatch = path.match(/^(.+?)\/\d+$/);
  if (angleMatch) {
    return angleMatch[1];
  }

  return path;
}

// Extended context type with session management
export interface GraphQLQueueContextType extends QueueContextType {
  // Session management
  isSessionActive: boolean;
  sessionId: string | null;
  startSession: (options?: { discoverable?: boolean; name?: string }) => Promise<string>;
  joinSession: (sessionId: string) => Promise<void>;
  endSession: () => void;
}

type GraphQLQueueContextProps = {
  parsedParams: ParsedBoardRouteParameters;
  boardDetails: BoardDetails;
  children: ReactNode;
};

const createClimbQueueItem = (
  climb: Climb,
  addedBy: UserName,
  addedByUser?: QueueItemUser,
  suggested?: boolean,
): ClimbQueueItem => ({
  climb,
  addedBy,
  addedByUser,
  uuid: uuidv4(),
  suggested: !!suggested,
});

const QueueContext = createContext<GraphQLQueueContextType | undefined>(undefined);


export const GraphQLQueueProvider = ({ parsedParams, boardDetails, children }: GraphQLQueueContextProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSearchParams = urlParamsToSearchParams(searchParams);
  const [state, dispatch] = useQueueReducer(initialSearchParams);

  // Correlation ID counter for tracking local updates (keeps reducer pure)
  const correlationCounterRef = useRef(0);

  // Get backend URL from settings
  const { backendUrl } = useConnectionSettings();

  // Get party profile for user ID, and username/avatarUrl from NextAuth session
  const { profile, username, avatarUrl } = usePartyProfile();

  // Get persistent session (managed at root level)
  const persistentSession = usePersistentSession();

  // Read sessionId from URL search params - party mode is opt-in
  const sessionIdFromUrl = searchParams.get('session');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionIdFromUrl);

  // Sync activeSessionId with URL changes (e.g., when navigating to a shared link)
  useEffect(() => {
    // Only update activeSessionId from URL if:
    // 1. URL has a session param (joining/starting), OR
    // 2. We don't have an active session yet
    // This prevents accidentally clearing the session when URL param is temporarily missing
    if (sessionIdFromUrl) {
      setActiveSessionId(sessionIdFromUrl);
    }
    // Note: Don't clear activeSessionId when URL param is removed
    // Only explicit endSession() should clear the session
  }, [sessionIdFromUrl]);

  // Restore session param to URL if it's missing but we have an active session
  useEffect(() => {
    if (activeSessionId && !sessionIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('session', activeSessionId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeSessionId, sessionIdFromUrl, pathname, router, searchParams]);

  // Session ID for connection - only connect if we have an active session
  const sessionId = activeSessionId;

  // Compute base board path for session comparison (excludes /play/[uuid] segments)
  const baseBoardPath = useMemo(() => getBaseBoardPath(pathname), [pathname]);

  // Check if persistent session is active for this board
  // Uses baseBoardPath to ensure navigation between climbs doesn't break the session check
  const isPersistentSessionActive = persistentSession.activeSession?.sessionId === sessionId &&
    persistentSession.activeSession?.boardPath === baseBoardPath;

  // Build current user info for queue items
  const currentUserInfo: QueueItemUser | undefined = useMemo(() => {
    if (!profile?.id) return undefined;
    return {
      id: profile.id,
      username: username || '',
      avatarUrl: avatarUrl,
    };
  }, [profile?.id, username, avatarUrl]);

  // Initialize queue state from persistent session when remounting
  // This handles the case where we navigate away and back - the persistent session
  // already has the queue data, but the reducer was reinitialized with empty state
  useEffect(() => {
    if (isPersistentSessionActive && persistentSession.hasConnected) {
      // Sync initial state from persistent session when remounting
      if (persistentSession.queue.length > 0 || persistentSession.currentClimbQueueItem) {
        dispatch({
          type: 'INITIAL_QUEUE_DATA',
          payload: {
            queue: persistentSession.queue,
            currentClimbQueueItem: persistentSession.currentClimbQueueItem,
          },
        });
      }
    }
  // Only run on mount and when session becomes active - not on every queue change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersistentSessionActive, persistentSession.hasConnected]);

  // Initialize queue state from local queue when remounting (non-party mode)
  // This handles the case where we navigate away and back without party mode
  useEffect(() => {
    // Only run when NOT in party mode
    if (isPersistentSessionActive || sessionId) return;

    // Check if we have saved local queue for this board path
    // Use baseBoardPath for comparison to handle navigation between climbs
    if (
      persistentSession.localBoardPath === baseBoardPath &&
      (persistentSession.localQueue.length > 0 || persistentSession.localCurrentClimbQueueItem)
    ) {
      dispatch({
        type: 'INITIAL_QUEUE_DATA',
        payload: {
          queue: persistentSession.localQueue,
          currentClimbQueueItem: persistentSession.localCurrentClimbQueueItem,
        },
      });
    }
  // Only run on mount - not on every queue change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear local queue if navigating to a different board configuration
  useEffect(() => {
    // Use baseBoardPath to avoid clearing queue when just navigating between climbs
    if (persistentSession.localBoardPath && persistentSession.localBoardPath !== baseBoardPath) {
      persistentSession.clearLocalQueue();
    }
  }, [baseBoardPath, persistentSession]);

  // Sync queue changes to local queue when not in party mode
  useEffect(() => {
    // Only sync when NOT in party mode
    if (isPersistentSessionActive || sessionId) return;

    // Sync queue state to persistent session for local storage
    // Use baseBoardPath to ensure consistent path storage across navigation
    persistentSession.setLocalQueueState(
      state.queue,
      state.currentClimbQueueItem,
      baseBoardPath,
      boardDetails,
    );
  }, [
    state.queue,
    state.currentClimbQueueItem,
    baseBoardPath,
    boardDetails,
    isPersistentSessionActive,
    sessionId,
    persistentSession,
  ]);

  // Subscribe to queue events from persistent session
  // Note: Initial sync is handled by the FullSync event sent by persistent-session-context on join
  useEffect(() => {
    if (!isPersistentSessionActive) return;

    const unsubscribe = persistentSession.subscribeToQueueEvents((event: SubscriptionQueueEvent) => {
      switch (event.__typename) {
        case 'FullSync':
          dispatch({
            type: 'INITIAL_QUEUE_DATA',
            payload: {
              queue: event.state.queue as ClimbQueueItem[],
              currentClimbQueueItem: event.state.currentClimbQueueItem as ClimbQueueItem | null,
            },
          });
          break;
        case 'QueueItemAdded':
          dispatch({
            type: 'DELTA_ADD_QUEUE_ITEM',
            payload: {
              item: event.addedItem as ClimbQueueItem,
              position: event.position,
            },
          });
          break;
        case 'QueueItemRemoved':
          dispatch({
            type: 'DELTA_REMOVE_QUEUE_ITEM',
            payload: { uuid: event.uuid },
          });
          break;
        case 'QueueReordered':
          dispatch({
            type: 'DELTA_REORDER_QUEUE_ITEM',
            payload: {
              uuid: event.uuid,
              oldIndex: event.oldIndex,
              newIndex: event.newIndex,
            },
          });
          break;
        case 'CurrentClimbChanged':
          dispatch({
            type: 'DELTA_UPDATE_CURRENT_CLIMB',
            payload: {
              item: event.currentItem as ClimbQueueItem | null,
              shouldAddToQueue: false,
              isServerEvent: true,
              eventClientId: event.clientId || undefined,
              myClientId: persistentSession.clientId || undefined,
              serverCorrelationId: event.correlationId || undefined,
            },
          });
          break;
        case 'ClimbMirrored':
          dispatch({
            type: 'DELTA_MIRROR_CURRENT_CLIMB',
            payload: { mirrored: event.mirrored },
          });
          break;
      }
    });

    return unsubscribe;
  }, [isPersistentSessionActive, persistentSession, dispatch]);

  // Cleanup orphaned pending updates (network failures, timeouts)
  // This is the ONLY place with time-based logic, isolated from reducer
  // FIX: Use ref to persist timestamps across renders (was being recreated every render)
  const pendingTimestampsRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (!isPersistentSessionActive || state.pendingCurrentClimbUpdates.length === 0) {
      return;
    }

    // Get persisted timestamp map from ref
    const pendingTimestamps = pendingTimestampsRef.current;

    // Add timestamps for NEW correlation IDs only
    state.pendingCurrentClimbUpdates.forEach(id => {
      if (!pendingTimestamps.has(id)) {
        pendingTimestamps.set(id, Date.now());
      }
    });

    // Remove timestamps for correlation IDs no longer pending
    Array.from(pendingTimestamps.keys()).forEach(id => {
      if (!state.pendingCurrentClimbUpdates.includes(id)) {
        pendingTimestamps.delete(id);
      }
    });

    // Set up cleanup timer for stale entries (>5 seconds)
    // Reduced from 10s/5s to 5s/2s to minimize stale update window
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      const staleIds: string[] = [];

      pendingTimestamps.forEach((timestamp, id) => {
        if (now - timestamp > 5000) {  // 5 seconds (reduced from 10s)
          staleIds.push(id);
        }
      });

      // Batch cleanup to avoid multiple re-renders
      if (staleIds.length > 0) {
        console.warn('[QueueContext] Cleaning up orphaned pending updates:', staleIds);
        dispatch({
          type: 'CLEANUP_PENDING_UPDATES_BATCH',
          payload: { correlationIds: staleIds },
        });
        staleIds.forEach(id => pendingTimestamps.delete(id));
      }
    }, 2000);  // Check every 2 seconds (reduced from 5s)

    return () => {
      clearInterval(cleanupTimer);
    };
  }, [isPersistentSessionActive, state.pendingCurrentClimbUpdates, dispatch]);

  // Use persistent session values when active
  const clientId = isPersistentSessionActive ? persistentSession.clientId : null;
  const isLeader = isPersistentSessionActive ? persistentSession.isLeader : false;
  const hasConnected = isPersistentSessionActive ? persistentSession.hasConnected : false;
  const users = isPersistentSessionActive ? persistentSession.users : [];
  const connectionError = isPersistentSessionActive ? persistentSession.error : null;

  // Session management functions
  const startSession = useCallback(
    async (options?: { discoverable?: boolean; name?: string }) => {
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }

      // Generate a new session ID
      const newSessionId = uuidv4();

      // Capture current queue state for the new session
      if (state.queue.length > 0 || state.currentClimbQueueItem) {
        persistentSession.setInitialQueueForSession(
          newSessionId,
          state.queue,
          state.currentClimbQueueItem
        );
      }

      // Update URL with session parameter (this triggers BoardSessionBridge)
      const params = new URLSearchParams(searchParams.toString());
      params.set('session', newSessionId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      // Update state
      setActiveSessionId(newSessionId);

      // Save to session history
      await saveSessionToHistory({
        id: newSessionId,
        name: options?.name || null,
        boardPath: pathname,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        backendUrl: backendUrl,
      });

      return newSessionId;
    },
    [backendUrl, pathname, router, searchParams, state.queue, state.currentClimbQueueItem, persistentSession],
  );

  const joinSessionHandler = useCallback(
    async (sessionIdToJoin: string) => {
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }

      // Update URL with session parameter
      const params = new URLSearchParams(searchParams.toString());
      params.set('session', sessionIdToJoin);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      // Update state
      setActiveSessionId(sessionIdToJoin);

      // Save to session history
      await saveSessionToHistory({
        id: sessionIdToJoin,
        name: null,
        boardPath: pathname,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        backendUrl: backendUrl,
      });
    },
    [backendUrl, pathname, router, searchParams],
  );

  const endSession = useCallback(() => {
    // Deactivate persistent session
    persistentSession.deactivateSession();

    // Remove session from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('session');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });

    // Update state
    setActiveSessionId(null);
  }, [persistentSession, pathname, router, searchParams]);

  // Whether party mode is active
  const isSessionActive = !!sessionId && hasConnected;

  // Data fetching for search results and favorites
  const {
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs,
    fetchMoreClimbs,
    // Favorites
    favorites,
    isFavorited,
    toggleFavorite,
    isLoadingFavorites,
    isAuthenticated,
  } = useQueueDataFetching({
    searchParams: state.climbSearchParams,
    queue: state.queue,
    parsedParams,
    hasDoneFirstFetch: state.hasDoneFirstFetch,
    setHasDoneFirstFetch: () => dispatch({ type: 'SET_FIRST_FETCH', payload: true }),
  });

  // Playlist state and handlers
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistMemberships, setPlaylistMemberships] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const { token: wsAuthToken, isAuthenticated: isPlaylistAuthenticated } = useWsAuthToken();

  // Fetch user's playlists when authenticated and board details change
  useEffect(() => {
    if (!wsAuthToken || !boardDetails) return;

    const fetchPlaylists = async () => {
      try {
        setPlaylistsLoading(true);
        const client = createGraphQLHttpClient(wsAuthToken);

        const response = await client.request<GetUserPlaylistsQueryResponse>(
          GET_USER_PLAYLISTS,
          {
            input: {
              boardType: boardDetails.board_name,
              layoutId: boardDetails.layout_id,
            },
          }
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
  }, [wsAuthToken, boardDetails?.board_name, boardDetails?.layout_id]);

  // Fetch playlist memberships for climbs in queue
  useEffect(() => {
    if (!wsAuthToken || !boardDetails || state.queue.length === 0) return;

    const fetchPlaylistMemberships = async () => {
      try {
        const client = createGraphQLHttpClient(wsAuthToken);
        const climbUuids = state.queue.map((item) => item.climb.uuid);

        // Batch query for all climbs
        const memberships = new Map<string, Set<string>>();

        await Promise.all(
          climbUuids.map(async (uuid) => {
            const response = await client.request<GetPlaylistsForClimbQueryResponse>(
              GET_PLAYLISTS_FOR_CLIMB,
              {
                input: {
                  boardType: boardDetails.board_name,
                  layoutId: boardDetails.layout_id,
                  climbUuid: uuid,
                },
              }
            );
            memberships.set(uuid, new Set(response.playlistsForClimb));
          })
        );

        setPlaylistMemberships(memberships);
      } catch (error) {
        console.error('Failed to fetch playlist memberships:', error);
      }
    };

    fetchPlaylistMemberships();
  }, [wsAuthToken, boardDetails, state.queue]);

  // Playlist operations
  const addToPlaylistHandler = useCallback(
    async (playlistId: string, climbUuid: string, angle: number) => {
      if (!wsAuthToken) throw new Error('Not authenticated');

      const client = createGraphQLHttpClient(wsAuthToken);
      await client.request<AddClimbToPlaylistMutationResponse>(ADD_CLIMB_TO_PLAYLIST, {
        input: { playlistId, climbUuid, angle },
      });

      // Update local state - membership tracking
      setPlaylistMemberships((prev) => {
        const updated = new Map(prev);
        const current = updated.get(climbUuid) || new Set<string>();
        current.add(playlistId);
        updated.set(climbUuid, current);
        return updated;
      });

      // Update local state - increment climbCount for the playlist
      setPlaylists((prev) =>
        prev.map((p) => (p.uuid === playlistId ? { ...p, climbCount: p.climbCount + 1 } : p))
      );
    },
    [wsAuthToken]
  );

  const removeFromPlaylistHandler = useCallback(
    async (playlistId: string, climbUuid: string) => {
      if (!wsAuthToken) throw new Error('Not authenticated');

      const client = createGraphQLHttpClient(wsAuthToken);
      await client.request<RemoveClimbFromPlaylistMutationResponse>(REMOVE_CLIMB_FROM_PLAYLIST, {
        input: { playlistId, climbUuid },
      });

      // Update local state - membership tracking
      setPlaylistMemberships((prev) => {
        const updated = new Map(prev);
        const current = updated.get(climbUuid);
        if (current) {
          current.delete(playlistId);
          updated.set(climbUuid, current);
        }
        return updated;
      });

      // Update local state - decrement climbCount for the playlist
      setPlaylists((prev) =>
        prev.map((p) =>
          p.uuid === playlistId ? { ...p, climbCount: Math.max(0, p.climbCount - 1) } : p
        )
      );
    },
    [wsAuthToken]
  );

  const createPlaylistHandler = useCallback(
    async (
      name: string,
      description?: string,
      color?: string,
      icon?: string
    ): Promise<Playlist> => {
      if (!wsAuthToken) throw new Error('Not authenticated');
      if (!boardDetails) throw new Error('Board details not available');

      const client = createGraphQLHttpClient(wsAuthToken);
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

      // Update local state
      setPlaylists((prev) => [response.createPlaylist, ...prev]);

      return response.createPlaylist;
    },
    [wsAuthToken, boardDetails]
  );

  const refreshPlaylistsHandler = useCallback(async () => {
    if (!wsAuthToken || !boardDetails) return;

    try {
      setPlaylistsLoading(true);
      const client = createGraphQLHttpClient(wsAuthToken);

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
  }, [wsAuthToken, boardDetails]);

  // Determine view-only mode
  // View-only while still connecting, once connected everyone can modify the queue
  // If no session is active, not view-only (local mode)
  const viewOnlyMode = useMemo(() => {
    if (!sessionId) return false; // No session = local mode, not view-only
    if (!backendUrl) return false; // No backend = no view-only mode
    if (!hasConnected) return true; // Still connecting = view-only
    return false; // Once connected, everyone can modify the queue
  }, [sessionId, backendUrl, hasConnected]);

  const contextValue: GraphQLQueueContextType = useMemo(
    () => ({
      queue: state.queue,
      currentClimbQueueItem: state.currentClimbQueueItem,
      currentClimb: state.currentClimbQueueItem?.climb || null,
      climbSearchParams: state.climbSearchParams,
      climbSearchResults,
      suggestedClimbs,
      totalSearchResultCount,
      hasMoreResults,
      isFetchingClimbs,
      hasDoneFirstFetch: state.hasDoneFirstFetch,
      viewOnlyMode,
      parsedParams,

      // Session management
      isSessionActive,
      sessionId,
      startSession,
      joinSession: joinSessionHandler,
      endSession,

      // Session data for party context
      users,
      clientId,
      isLeader,
      isBackendMode: !!backendUrl,
      hasConnected,
      connectionError,
      disconnect: persistentSession.deactivateSession,

      // Actions
      addToQueue: (climb: Climb) => {
        const newItem = createClimbQueueItem(climb, clientId, currentUserInfo);

        // Optimistic update
        dispatch({ type: 'DELTA_ADD_QUEUE_ITEM', payload: { item: newItem } });

        // Send to server only if connected
        if (hasConnected && isPersistentSessionActive) {
          persistentSession.addQueueItem(newItem).catch((error) => {
            console.error('Failed to add queue item:', error);
          });
        }
      },

      removeFromQueue: (item: ClimbQueueItem) => {
        // Optimistic update
        dispatch({ type: 'DELTA_REMOVE_QUEUE_ITEM', payload: { uuid: item.uuid } });

        // Send to server only if connected
        if (hasConnected && isPersistentSessionActive) {
          persistentSession.removeQueueItem(item.uuid).catch((error) => {
            console.error('Failed to remove queue item:', error);
          });
        }
      },

      setCurrentClimb: async (climb: Climb) => {
        const newItem = createClimbQueueItem(climb, clientId, currentUserInfo);

        // Optimistic update
        dispatch({ type: 'SET_CURRENT_CLIMB', payload: newItem });

        // Only sync with backend if connected
        if (hasConnected && isPersistentSessionActive) {
          // Save previous state for rollback
          const previousQueue = [...state.queue];
          const previousCurrentClimb = state.currentClimbQueueItem;

          // Calculate position for insertion
          const currentIndex = state.currentClimbQueueItem
            ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
            : -1;
          const position = currentIndex === -1 ? undefined : currentIndex + 1;

          try {
            // First add the item at the appropriate position, then set as current
            // These must be sequential to avoid race conditions in the database
            await persistentSession.addQueueItem(newItem, position);
            await persistentSession.setCurrentClimb(newItem, false);
          } catch (error) {
            console.error('Failed to set current climb, rolling back:', error);
            // Rollback to previous state
            dispatch({
              type: 'UPDATE_QUEUE',
              payload: {
                queue: previousQueue,
                currentClimbQueueItem: previousCurrentClimb,
              },
            });
          }
        }
      },

      setQueue: (queue) => {
        // Optimistic update
        dispatch({
          type: 'UPDATE_QUEUE',
          payload: {
            queue,
            currentClimbQueueItem: state.currentClimbQueueItem,
          },
        });

        // Send to server only if connected
        if (hasConnected && isPersistentSessionActive) {
          persistentSession.setQueue(queue, state.currentClimbQueueItem).catch((error) => {
            console.error('Failed to set queue:', error);
          });
        }
      },

      setCurrentClimbQueueItem: (item: ClimbQueueItem) => {
        // Generate correlation ID OUTSIDE reducer (keeps reducer pure)
        // Format: clientId-counter (e.g., "client-abc123-5")
        const correlationId = clientId ? `${clientId}-${++correlationCounterRef.current}` : undefined;

        // Optimistic update with correlation ID
        dispatch({
          type: 'DELTA_UPDATE_CURRENT_CLIMB',
          payload: {
            item,
            shouldAddToQueue: item.suggested,
            correlationId,
          },
        });

        // Send to server only if connected
        if (hasConnected && isPersistentSessionActive) {
          persistentSession.setCurrentClimb(item, item.suggested, correlationId).catch((error) => {
            console.error('Failed to set current climb:', error);
            // Remove from pending on error to prevent blocking future updates
            if (correlationId) {
              dispatch({
                type: 'CLEANUP_PENDING_UPDATE',
                payload: { correlationId },
              });
            }
          });
        }
      },

      setClimbSearchParams: (params) => {
        dispatch({ type: 'SET_CLIMB_SEARCH_PARAMS', payload: params });

        // Update URL with new search parameters, preserving session param
        const urlParams = searchParamsToUrlParams(params);

        // Preserve the session parameter if it exists
        const currentSession = searchParams.get('session');
        if (currentSession) {
          urlParams.set('session', currentSession);
        }

        const queryString = urlParams.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(newUrl, { scroll: false });
      },

      mirrorClimb: () => {
        if (!state.currentClimbQueueItem?.climb) {
          return;
        }
        const newMirroredState = !state.currentClimbQueueItem.climb?.mirrored;

        // Optimistic update
        dispatch({
          type: 'DELTA_MIRROR_CURRENT_CLIMB',
          payload: { mirrored: newMirroredState },
        });

        // Send to server only if connected
        if (hasConnected && isPersistentSessionActive) {
          persistentSession.mirrorCurrentClimb(newMirroredState).catch((error) => {
            console.error('Failed to mirror climb:', error);
          });
        }
      },

      fetchMoreClimbs,

      getNextClimbQueueItem: () => {
        const queueItemIndex = state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid);

        if (
          (state.queue.length === 0 || state.queue.length <= queueItemIndex + 1) &&
          climbSearchResults &&
          climbSearchResults?.length > 0
        ) {
          const nextClimb = suggestedClimbs[0];
          return nextClimb ? createClimbQueueItem(nextClimb, clientId, currentUserInfo, true) : null;
        }

        return queueItemIndex >= state.queue.length - 1 ? null : state.queue[queueItemIndex + 1];
      },

      getPreviousClimbQueueItem: () => {
        const queueItemIndex = state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid);
        return queueItemIndex > 0 ? state.queue[queueItemIndex - 1] : null;
      },
    }),
    [
      state,
      climbSearchResults,
      suggestedClimbs,
      totalSearchResultCount,
      hasMoreResults,
      isFetchingClimbs,
      viewOnlyMode,
      parsedParams,
      clientId,
      isLeader,
      users,
      hasConnected,
      connectionError,
      backendUrl,
      persistentSession,
      isPersistentSessionActive,
      dispatch,
      pathname,
      router,
      fetchMoreClimbs,
      currentUserInfo,
      isSessionActive,
      sessionId,
      startSession,
      joinSessionHandler,
      endSession,
    ],
  );

  // Wrap children with FavoritesProvider and PlaylistsProvider to pass hoisted data
  const wrappedChildren = (
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
        isAuthenticated={isPlaylistAuthenticated}
        refreshPlaylists={refreshPlaylistsHandler}
      >
        {children}
      </PlaylistsProvider>
    </FavoritesProvider>
  );

  // If no backend URL configured, show error or fallback
  if (!backendUrl) {
    return (
      <QueueContext.Provider value={contextValue}>
        {wrappedChildren}
      </QueueContext.Provider>
    );
  }

  return <QueueContext.Provider value={contextValue}>{wrappedChildren}</QueueContext.Provider>;
};

export const useGraphQLQueueContext = (): GraphQLQueueContextType => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useGraphQLQueueContext must be used within a GraphQLQueueProvider');
  }
  return context;
};

// Re-export the hook with the standard name for easier migration
export { useGraphQLQueueContext as useQueueContext };
