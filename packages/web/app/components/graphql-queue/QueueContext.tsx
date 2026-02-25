'use client';

import React, { useContext, createContext, ReactNode, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useQueueReducer } from '../queue-control/reducer';
import { useQueueDataFetching } from '../queue-control/hooks/use-queue-data-fetching';
import { QueueContextType, ClimbQueueItem, UserName, QueueItemUser } from '../queue-control/types';
import { urlParamsToSearchParams, searchParamsToUrlParams, getBaseBoardPath } from '@/app/lib/url-utils';
import { Climb, ParsedBoardRouteParameters, BoardDetails } from '@/app/lib/types';
import { useConnectionSettings } from '../connection-manager/connection-settings-context';
import { usePartyProfile } from '../party-manager/party-profile-context';
import { SubscriptionQueueEvent } from '@boardsesh/shared-schema';
import { saveSessionToHistory } from '../setup-wizard/session-history-panel';
import { usePersistentSession } from '../persistent-session';
import { FavoritesProvider } from '../climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '../climb-actions/playlists-batch-context';
import { useClimbActionsData } from '@/app/hooks/use-climb-actions-data';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  END_SESSION as END_SESSION_GQL,
  type EndSessionResponse,
} from '@/app/lib/graphql/operations/sessions';
import type { SessionSummary } from '@boardsesh/shared-schema';
import { SUGGESTIONS_THRESHOLD } from '../board-page/constants';
import SessionSummaryDialog from '../session-summary/session-summary-dialog';

// Extended context type with session management
export interface GraphQLQueueContextType extends QueueContextType {
  // Session management
  isSessionActive: boolean;
  sessionId: string | null;
  startSession: (options?: { discoverable?: boolean; name?: string; sessionId?: string }) => Promise<string>;
  joinSession: (sessionId: string) => Promise<void>;
  endSession: () => void;
  // Session summary shown after ending a session
  sessionSummary: SessionSummary | null;
  dismissSessionSummary: () => void;
  // Session goal
  sessionGoal: string | null;
}

type GraphQLQueueContextProps = {
  parsedParams: ParsedBoardRouteParameters;
  boardDetails: BoardDetails;
  children: ReactNode;
  // When provided, the provider operates in "off-board" mode:
  // uses this path instead of computing from pathname, reads session ID
  // from persistent session instead of URL, and skips URL manipulation.
  baseBoardPath?: string;
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

export const QueueContext = createContext<GraphQLQueueContextType | undefined>(undefined);


export const GraphQLQueueProvider = ({ parsedParams, boardDetails, children, baseBoardPath: propsBaseBoardPath }: GraphQLQueueContextProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSearchParams = urlParamsToSearchParams(searchParams);
  const [state, dispatch] = useQueueReducer(initialSearchParams);

  // Off-board mode: when a baseBoardPath is explicitly provided (e.g. from persistent session),
  // skip URL-based session management and path computation.
  const isOffBoardMode = propsBaseBoardPath !== undefined;

  // Correlation ID counter for tracking local updates (keeps reducer pure)
  const correlationCounterRef = useRef(0);

  // Guard to prevent syncing empty initial state before restoration completes.
  // On mount, the reducer starts with empty state. The sync effect must not
  // write to persistent session until restoration (from memory or IndexedDB)
  // has finished — otherwise it overwrites valid data with empty state,
  // causing the queue bridge to see an empty queue and hide the control bar.
  // Uses useState (not useRef) so the sync effect only sees hasRestored=true
  // in the render where state.queue already contains the restored data.
  // With a ref, the restore and sync effects run in the same render cycle:
  // the restore sets the ref and dispatches, but the sync sees the ref=true
  // while state.queue is still empty, writing empty state to localQueue.
  const [hasRestored, setHasRestored] = useState(false);

  // Get backend URL from settings
  const { backendUrl } = useConnectionSettings();

  // Get party profile for user ID, and username/avatarUrl from NextAuth session
  const { profile, username, avatarUrl } = usePartyProfile();

  // Auth token for GraphQL HTTP requests (used by endSession and playlists)
  const { token: wsAuthToken } = useWsAuthToken();

  // Get persistent session (managed at root level)
  const persistentSession = usePersistentSession();

  // Session ID source differs by mode:
  // - Board routes: read from URL ?session= param
  // - Off-board: read from persistent session (URL doesn't carry session info)
  const sessionIdFromUrl = searchParams.get('session');
  const persistentSessionId = persistentSession.activeSession?.sessionId ?? null;
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    isOffBoardMode ? persistentSessionId : sessionIdFromUrl,
  );

  // Sync activeSessionId with URL changes (board routes only)
  useEffect(() => {
    if (isOffBoardMode) return;
    if (sessionIdFromUrl) {
      setActiveSessionId(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl, isOffBoardMode]);

  // Sync activeSessionId from persistent session (off-board mode only)
  useEffect(() => {
    if (!isOffBoardMode) return;
    setActiveSessionId(persistentSessionId);
  }, [isOffBoardMode, persistentSessionId]);

  // Restore session param to URL if it's missing but we have an active session (board routes only)
  useEffect(() => {
    if (isOffBoardMode) return;
    if (activeSessionId && !sessionIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('session', activeSessionId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeSessionId, sessionIdFromUrl, pathname, router, searchParams, isOffBoardMode]);

  // Session ID for connection - only connect if we have an active session
  const sessionId = activeSessionId;

  // Compute base board path for session comparison (excludes /play/[uuid] segments)
  // Off-board mode uses the provided path; board routes compute from pathname.
  const baseBoardPath = useMemo(
    () => propsBaseBoardPath ?? getBaseBoardPath(pathname),
    [propsBaseBoardPath, pathname],
  );

  // Check if persistent session is active for this board
  // Uses baseBoardPath to ensure navigation between climbs doesn't break the session check
  // Compare base paths since activeSession.boardPath may include angle/view segments
  const isPersistentSessionActive = persistentSession.activeSession?.sessionId === sessionId &&
    (persistentSession.activeSession?.boardPath
      ? getBaseBoardPath(persistentSession.activeSession.boardPath)
      : '') === baseBoardPath;

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
      setHasRestored(true);
    }
  // Only run on mount and when session becomes active - not on every queue change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersistentSessionActive, persistentSession.hasConnected]);

  // Initialize queue state from local queue when remounting (non-party mode)
  // This handles the case where we navigate away and back without party mode
  // Also loads from IndexedDB on initial mount
  useEffect(() => {
    // Only run when NOT in party mode
    if (isPersistentSessionActive || sessionId) return;

    // If local queue is already loaded (in memory), use it directly
    // This handles navigation between board routes during the same session
    if (
      persistentSession.isLocalQueueLoaded &&
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
      setHasRestored(true);
      return;
    }

    // If not loaded yet, load from IndexedDB
    // This handles initial page load after browser refresh
    if (!persistentSession.isLocalQueueLoaded) {
      persistentSession.loadStoredQueue(baseBoardPath).then((stored) => {
        if (stored && (stored.queue.length > 0 || stored.currentClimbQueueItem)) {
          dispatch({
            type: 'INITIAL_QUEUE_DATA',
            payload: {
              queue: stored.queue,
              currentClimbQueueItem: stored.currentClimbQueueItem,
            },
          });
        }
        setHasRestored(true);
      });
      return;
    }

    // Local queue is loaded but empty or for a different board — nothing to restore
    setHasRestored(true);
  // Only run on mount and when isLocalQueueLoaded changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentSession.isLocalQueueLoaded]);

  // Clear local queue if navigating to a different board configuration
  useEffect(() => {
    // Use baseBoardPath to avoid clearing queue when just navigating between climbs
    if (persistentSession.localBoardPath && persistentSession.localBoardPath !== baseBoardPath) {
      persistentSession.clearLocalQueue();
    }
  }, [baseBoardPath, persistentSession]);

  // Sync queue changes to local queue when not in party mode
  useEffect(() => {
    // Don't sync until initial restoration is complete — the reducer starts
    // with empty state and would overwrite valid persistent session data.
    // hasRestored is a state variable (not a ref) so this effect only runs
    // after the render where INITIAL_QUEUE_DATA has been applied to state.queue.
    if (!hasRestored) return;

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
    hasRestored,
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
              shouldAddToQueue: (event.currentItem as ClimbQueueItem | null)?.suggested ?? false,
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

  // Trigger resync when corrupted data is detected
  useEffect(() => {
    if (!state.needsResync || !isPersistentSessionActive) {
      return;
    }

    console.log('[QueueContext] Corrupted data detected, triggering resync');

    // Clear the flag first to prevent multiple resyncs
    dispatch({ type: 'CLEAR_RESYNC_FLAG' });

    // Trigger the resync
    persistentSession.triggerResync();
  }, [state.needsResync, isPersistentSessionActive, persistentSession, dispatch]);

  // Use persistent session values when active
  const clientId = isPersistentSessionActive ? persistentSession.clientId : null;
  const isLeader = isPersistentSessionActive ? persistentSession.isLeader : false;
  const hasConnected = isPersistentSessionActive ? persistentSession.hasConnected : false;
  // Memoize users array to prevent unnecessary context value recreation
  // Note: persistentSession.users is already stable from the persistent session context
  const users = useMemo(
    () => (isPersistentSessionActive ? persistentSession.users : []),
    [isPersistentSessionActive, persistentSession.users]
  );
  const connectionError = isPersistentSessionActive ? persistentSession.error : null;

  // Session management functions
  const startSession = useCallback(
    async (options?: { discoverable?: boolean; name?: string; sessionId?: string }) => {
      if (isOffBoardMode) {
        throw new Error('Cannot start a session outside of a board route');
      }
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }

      // Use pre-created session ID or generate a new one
      const newSessionId = options?.sessionId || uuidv4();

      // Capture current queue state for the new session
      if (state.queue.length > 0 || state.currentClimbQueueItem) {
        persistentSession.setInitialQueueForSession(
          newSessionId,
          state.queue,
          state.currentClimbQueueItem,
          options?.name
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
      });

      return newSessionId;
    },
    [backendUrl, pathname, router, searchParams, state.queue, state.currentClimbQueueItem, persistentSession, isOffBoardMode],
  );

  const joinSessionHandler = useCallback(
    async (sessionIdToJoin: string) => {
      if (isOffBoardMode) {
        throw new Error('Cannot join a session outside of a board route');
      }
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
      });
    },
    [backendUrl, pathname, router, searchParams, isOffBoardMode],
  );

  // Session summary state (shown after ending a session)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const dismissSessionSummary = useCallback(() => {
    setSessionSummary(null);
  }, []);

  const endSession = useCallback(() => {
    // Capture session ID before deactivating
    const endingSessionId = activeSessionId;

    // Deactivate persistent session
    persistentSession.deactivateSession();

    // Remove session from URL (board routes only)
    if (!isOffBoardMode) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('session');
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    }

    // Update state
    setActiveSessionId(null);

    // Call END_SESSION mutation to get summary (non-blocking)
    if (endingSessionId && wsAuthToken) {
      const client = createGraphQLHttpClient(wsAuthToken);
      client.request<EndSessionResponse>(END_SESSION_GQL, { sessionId: endingSessionId })
        .then((response) => {
          if (response.endSession) {
            setSessionSummary(response.endSession);
          }
        })
        .catch((err) => {
          console.error('[QueueContext] Failed to get session summary:', err);
        });
    }
  }, [persistentSession, pathname, router, searchParams, isOffBoardMode, activeSessionId, wsAuthToken]);

  // Whether party mode is active
  const isSessionActive = !!sessionId && hasConnected;

  // Data fetching for search results
  const {
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs,
    isFetchingNextPage,
    fetchMoreClimbs,
    climbUuids,
  } = useQueueDataFetching({
    searchParams: state.climbSearchParams,
    queue: state.queue,
    parsedParams,
    hasDoneFirstFetch: state.hasDoneFirstFetch,
    setHasDoneFirstFetch: () => dispatch({ type: 'SET_FIRST_FETCH', payload: true }),
  });

  // Favorites and playlists data fetching (shared hook)
  const { favoritesProviderProps, playlistsProviderProps } = useClimbActionsData({
    boardName: parsedParams.board_name,
    layoutId: boardDetails.layout_id,
    angle: parsedParams.angle,
    climbUuids,
  });

  // Proactively fetch more suggestions when running low
  // This handles the case where users navigate via next/prev buttons without viewing the queue
  // Track state to prevent infinite loops when fetched climbs are filtered out (already in queue)
  const proactiveFetchState = useRef({
    lastSuggestedCount: suggestedClimbs.length,
    lastQueueLength: state.queue.length,
    hasFetchedForCurrentLowState: false,
  });

  useEffect(() => {
    const prev = proactiveFetchState.current;

    // Reset fetch guard when:
    // 1. Suggestions increased (successful fetch or items removed from queue)
    // 2. Queue shrunk (items removed, so more climbs become available as suggestions)
    // 3. No more results (reset for when new search/filters are applied)
    if (
      suggestedClimbs.length > prev.lastSuggestedCount ||
      state.queue.length < prev.lastQueueLength ||
      !hasMoreResults
    ) {
      prev.hasFetchedForCurrentLowState = false;
    }
    prev.lastSuggestedCount = suggestedClimbs.length;
    prev.lastQueueLength = state.queue.length;

    // Don't trigger fetch if currently fetching or no more results
    if (isFetchingNextPage || !hasMoreResults) {
      return;
    }

    // Fetch if below threshold and haven't already tried for this state
    if (
      suggestedClimbs.length < SUGGESTIONS_THRESHOLD &&
      state.hasDoneFirstFetch &&
      !prev.hasFetchedForCurrentLowState
    ) {
      prev.hasFetchedForCurrentLowState = true;
      fetchMoreClimbs();
    }
  }, [suggestedClimbs.length, state.queue.length, hasMoreResults, isFetchingNextPage, fetchMoreClimbs, state.hasDoneFirstFetch]);

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
      isFetchingNextPage,
      hasDoneFirstFetch: state.hasDoneFirstFetch,
      viewOnlyMode,
      parsedParams,

      // Session management
      isSessionActive,
      sessionId,
      startSession,
      joinSession: joinSessionHandler,
      endSession,
      sessionSummary,
      dismissSessionSummary,
      sessionGoal: isPersistentSessionActive ? (persistentSession.session?.goal ?? null) : null,

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

        // Update URL with new search parameters (board routes only)
        if (!isOffBoardMode) {
          const urlParams = searchParamsToUrlParams(params);

          // Preserve the session parameter if it exists
          const currentSession = searchParams.get('session');
          if (currentSession) {
            urlParams.set('session', currentSession);
          }

          const queryString = urlParams.toString();
          const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
          router.replace(newUrl, { scroll: false });
        }
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
          // Find the first suggested climb that isn't already in the queue
          // This handles race conditions where suggestedClimbs hasn't been recomputed yet
          const nextClimb = suggestedClimbs.find(
            climb => !state.queue.some(qItem => qItem.climb?.uuid === climb.uuid)
          );
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
      isFetchingNextPage,
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
      sessionSummary,
      dismissSessionSummary,
      isOffBoardMode,
    ],
  );

  // Wrap children with FavoritesProvider and PlaylistsProvider to pass hoisted data
  const wrappedChildren = (
    <FavoritesProvider {...favoritesProviderProps}>
      <PlaylistsProvider {...playlistsProviderProps}>
        {children}
      </PlaylistsProvider>
    </FavoritesProvider>
  );

  // If no backend URL configured, show error or fallback
  if (!backendUrl) {
    return (
      <QueueContext.Provider value={contextValue}>
        {wrappedChildren}
        <SessionSummaryDialog summary={sessionSummary} onDismiss={dismissSessionSummary} />
      </QueueContext.Provider>
    );
  }

  return (
    <QueueContext.Provider value={contextValue}>
      {wrappedChildren}
      <SessionSummaryDialog summary={sessionSummary} onDismiss={dismissSessionSummary} />
    </QueueContext.Provider>
  );
};

export const useGraphQLQueueContext = (): GraphQLQueueContextType => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useGraphQLQueueContext must be used within a GraphQLQueueProvider');
  }
  return context;
};

export const useOptionalQueueContext = (): GraphQLQueueContextType | null => {
  return useContext(QueueContext) ?? null;
};

// Re-export the hook with the standard name for easier migration
export { useGraphQLQueueContext as useQueueContext };
