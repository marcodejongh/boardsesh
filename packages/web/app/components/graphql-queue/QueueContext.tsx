'use client';

import React, { useContext, createContext, ReactNode, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useQueueSession } from './use-queue-session';
import { useQueueReducer } from '../queue-control/reducer';
import { useQueueDataFetching } from '../queue-control/hooks/use-queue-data-fetching';
import { QueueContextType, ClimbQueueItem, UserName, QueueItemUser } from '../queue-control/types';
import { urlParamsToSearchParams, searchParamsToUrlParams } from '@/app/lib/url-utils';
import { Climb, ParsedBoardRouteParameters } from '@/app/lib/types';
import { useConnectionSettings } from '../connection-manager/connection-settings-context';
import { usePartyProfile } from '../party-manager/party-profile-context';
import { ClientQueueEvent } from '@boardsesh/shared-schema';

type GraphQLQueueContextProps = {
  parsedParams: ParsedBoardRouteParameters;
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

const QueueContext = createContext<QueueContextType | undefined>(undefined);

// Generate session ID from pathname
function generateSessionId(pathname: string): string {
  return pathname.replace(/\//g, '-').slice(1);
}

// Get or create a persistent user ID for this client
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return uuidv4();

  const storageKey = 'boardsesh:userId';
  let userId = localStorage.getItem(storageKey);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(storageKey, userId);
  }
  return userId;
}

// Get username from localStorage or undefined
function getStoredUsername(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('boardsesh:username') || undefined;
}

export const GraphQLQueueProvider = ({ parsedParams, children }: GraphQLQueueContextProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSearchParams = urlParamsToSearchParams(searchParams);
  const [state, dispatch] = useQueueReducer(initialSearchParams);

  // Get daemon URL from settings
  const { daemonUrl, isLoaded } = useConnectionSettings();

  // Get party profile for username and avatarUrl
  const { profile, isLoading: profileLoading } = usePartyProfile();

  // Generate session ID and get user info from party profile
  const sessionId = useMemo(() => generateSessionId(pathname), [pathname]);

  // Use party profile for username and avatarUrl, fallback to legacy localStorage if not available
  const username = useMemo(() => profile?.username || getStoredUsername(), [profile?.username]);
  const avatarUrl = useMemo(() => profile?.avatarUrl, [profile?.avatarUrl]);

  // Build current user info for queue items
  const currentUserInfo: QueueItemUser | undefined = useMemo(() => {
    if (!profile?.id) return undefined;
    return {
      id: profile.id,
      username: profile.username || '',
      avatarUrl: profile.avatarUrl,
    };
  }, [profile?.id, profile?.username, profile?.avatarUrl]);

  // Handle queue events from GraphQL subscription
  const handleQueueEvent = useCallback(
    (event: ClientQueueEvent) => {
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
    },
    [dispatch],
  );

  // Connect to GraphQL session
  const queueSession = useQueueSession({
    daemonUrl: daemonUrl || '',
    sessionId,
    boardPath: pathname,
    username,
    avatarUrl,
    onQueueEvent: handleQueueEvent,
  });

  const { clientId, isLeader } = queueSession;

  // Data fetching for search results
  const {
    climbSearchResults,
    suggestedClimbs,
    totalSearchResultCount,
    hasMoreResults,
    isFetchingClimbs,
    fetchMoreClimbs,
  } = useQueueDataFetching({
    searchParams: state.climbSearchParams,
    queue: state.queue,
    parsedParams,
    hasDoneFirstFetch: state.hasDoneFirstFetch,
    setHasDoneFirstFetch: () => dispatch({ type: 'SET_FIRST_FETCH', payload: true }),
  });

  // Determine view-only mode
  // View-only while still connecting, once connected everyone can modify the queue
  const viewOnlyMode = useMemo(() => {
    if (!daemonUrl) return false; // No daemon = no view-only mode
    if (!queueSession.hasConnected) return true; // Still connecting = view-only
    return false; // Once connected, everyone can modify the queue
  }, [daemonUrl, queueSession.hasConnected]);

  const contextValue: QueueContextType = useMemo(
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

      // Session data for party context
      users: queueSession.users,
      clientId: queueSession.clientId,
      isLeader,
      isDaemonMode: !!daemonUrl,
      hasConnected: queueSession.hasConnected,
      connectionError: queueSession.error,
      disconnect: queueSession.disconnect,

      // Actions
      addToQueue: (climb: Climb) => {
        const newItem = createClimbQueueItem(climb, clientId, currentUserInfo);

        // Optimistic update
        dispatch({ type: 'DELTA_ADD_QUEUE_ITEM', payload: { item: newItem } });

        // Send to server
        queueSession.addQueueItem(newItem).catch((error) => {
          console.error('Failed to add queue item:', error);
          // TODO: Consider rollback on error
        });
      },

      removeFromQueue: (item: ClimbQueueItem) => {
        // Optimistic update
        dispatch({ type: 'DELTA_REMOVE_QUEUE_ITEM', payload: { uuid: item.uuid } });

        // Send to server
        queueSession.removeQueueItem(item.uuid).catch((error) => {
          console.error('Failed to remove queue item:', error);
        });
      },

      setCurrentClimb: async (climb: Climb) => {
        const newItem = createClimbQueueItem(climb, clientId, currentUserInfo);

        // Save previous state for rollback
        const previousQueue = [...state.queue];
        const previousCurrentClimb = state.currentClimbQueueItem;

        // Optimistic update
        dispatch({ type: 'SET_CURRENT_CLIMB', payload: newItem });

        // Calculate position for insertion
        const currentIndex = state.currentClimbQueueItem
          ? state.queue.findIndex(({ uuid }) => uuid === state.currentClimbQueueItem?.uuid)
          : -1;
        const position = currentIndex === -1 ? undefined : currentIndex + 1;

        try {
          // First add the item at the appropriate position, then set as current
          // These must be sequential to avoid race conditions in the database
          await queueSession.addQueueItem(newItem, position);
          await queueSession.setCurrentClimb(newItem, false);
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

        // Send to server
        queueSession.setQueue(queue, state.currentClimbQueueItem).catch((error) => {
          console.error('Failed to set queue:', error);
        });
      },

      setCurrentClimbQueueItem: (item: ClimbQueueItem) => {
        // Optimistic update
        dispatch({
          type: 'DELTA_UPDATE_CURRENT_CLIMB',
          payload: { item, shouldAddToQueue: item.suggested },
        });

        // Send to server
        queueSession.setCurrentClimb(item, item.suggested).catch((error) => {
          console.error('Failed to set current climb:', error);
        });
      },

      setClimbSearchParams: (params) => {
        dispatch({ type: 'SET_CLIMB_SEARCH_PARAMS', payload: params });

        // Update URL with new search parameters
        const urlParams = searchParamsToUrlParams(params);
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

        // Send to server
        queueSession.mirrorCurrentClimb(newMirroredState).catch((error) => {
          console.error('Failed to mirror climb:', error);
        });
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
      daemonUrl,
      queueSession,
      dispatch,
      pathname,
      router,
      fetchMoreClimbs,
      currentUserInfo,
    ],
  );

  // Don't render until connection settings are loaded
  if (!isLoaded) {
    return null;
  }

  // If no daemon URL configured, show error or fallback
  if (!daemonUrl) {
    return (
      <QueueContext.Provider value={contextValue}>
        {children}
      </QueueContext.Provider>
    );
  }

  return <QueueContext.Provider value={contextValue}>{children}</QueueContext.Provider>;
};

export const useGraphQLQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useGraphQLQueueContext must be used within a GraphQLQueueProvider');
  }
  return context;
};

// Re-export the hook with the standard name for easier migration
export { useGraphQLQueueContext as useQueueContext };
