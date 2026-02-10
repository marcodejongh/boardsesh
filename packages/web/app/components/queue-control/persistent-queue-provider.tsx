'use client';

import React, { useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { QueueContext, type GraphQLQueueContextType } from '../graphql-queue/QueueContext';
import { usePersistentSession } from '../persistent-session';
import { FavoritesProvider } from '../climb-actions/favorites-batch-context';
import { PlaylistsProvider } from '../climb-actions/playlists-batch-context';
import type { Playlist } from '../climb-actions/playlists-batch-context';
import type { ClimbQueueItem } from './types';
import type { Climb, BoardDetails, Angle, ParsedBoardRouteParameters } from '@/app/lib/types';

// Module-level constants to avoid defeating memoization with new references each render
const EMPTY_FAVORITES = new Set<string>();
const EMPTY_PLAYLISTS: Playlist[] = [];
const EMPTY_MEMBERSHIPS = new Map<string, Set<string>>();
const NOOP_IS_FAVORITED = () => false;
const NOOP_TOGGLE_FAVORITE = async () => false;
const NOOP_ADD_TO_PLAYLIST = async () => {};
const NOOP_REMOVE_FROM_PLAYLIST = async () => {};
const NOOP_CREATE_PLAYLIST = async (): Promise<Playlist> => { throw new Error('Not available'); };
const NOOP_REFRESH_PLAYLISTS = async () => {};

interface PersistentQueueProviderProps {
  boardDetails: BoardDetails;
  angle: Angle;
  children: React.ReactNode;
}

/**
 * Lightweight QueueContext provider for use outside board routes.
 * Bridges the persistent session data into the same QueueContext interface
 * that board-route components expect, so the full QueueControlBar (and its
 * sub-components like NextClimbButton, QueueList, etc.) can work unchanged.
 *
 * Search-related features (climb search, suggestions) are not available
 * off board routes — those fields are populated with sensible defaults.
 */
export const PersistentQueueProvider: React.FC<PersistentQueueProviderProps> = ({
  boardDetails,
  angle,
  children,
}) => {
  const {
    activeSession,
    currentClimbQueueItem: partyCurrentClimbQueueItem,
    users,
    clientId,
    isLeader,
    hasConnected,
    error: connectionError,
    localQueue,
    localCurrentClimbQueueItem,
    localBoardPath,
    setLocalQueueState,
    addQueueItem,
    removeQueueItem,
    setCurrentClimb,
    mirrorCurrentClimb,
    setQueue: persistentSetQueue,
    deactivateSession,
  } = usePersistentSession();

  const isPartyMode = !!activeSession;
  const queue = isPartyMode ? [] : localQueue;
  const currentClimbQueueItem = isPartyMode ? partyCurrentClimbQueueItem : localCurrentClimbQueueItem;

  // Build parsedParams from boardDetails
  const parsedParams: ParsedBoardRouteParameters = useMemo(() => ({
    board_name: boardDetails.board_name,
    layout_id: boardDetails.layout_id,
    size_id: boardDetails.size_id,
    set_ids: boardDetails.set_ids,
    angle,
  }), [boardDetails, angle]);

  // Queue navigation helpers
  const getNextClimbQueueItem = useCallback((): ClimbQueueItem | null => {
    const idx = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    return idx >= queue.length - 1 ? null : queue[idx + 1];
  }, [queue, currentClimbQueueItem]);

  const getPreviousClimbQueueItem = useCallback((): ClimbQueueItem | null => {
    const idx = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    return idx > 0 ? queue[idx - 1] : null;
  }, [queue, currentClimbQueueItem]);

  // Update the local queue state helper
  const updateLocalQueue = useCallback(
    (newQueue: ClimbQueueItem[], newCurrent: ClimbQueueItem | null) => {
      if (localBoardPath && boardDetails) {
        setLocalQueueState(newQueue, newCurrent, localBoardPath, boardDetails);
      }
    },
    [localBoardPath, boardDetails, setLocalQueueState],
  );

  const contextValue: GraphQLQueueContextType = useMemo(() => ({
    queue,
    currentClimbQueueItem,
    currentClimb: currentClimbQueueItem?.climb ?? null,

    // Search — not available off board routes
    climbSearchParams: {
      gradeAccuracy: 1,
      maxGrade: 33,
      minAscents: 0,
      minGrade: 0,
      minRating: 0,
      sortBy: 'ascents' as const,
      sortOrder: 'desc' as const,
      name: '',
      onlyClassics: false,
      onlyTallClimbs: false,
      settername: [],
      setternameSuggestion: '',
      holdsFilter: {},
      hideAttempted: false,
      hideCompleted: false,
      showOnlyAttempted: false,
      showOnlyCompleted: false,
      page: 0,
      pageSize: 20,
    },
    climbSearchResults: null,
    suggestedClimbs: [],
    totalSearchResultCount: null,
    hasMoreResults: false,
    isFetchingClimbs: false,
    isFetchingNextPage: false,
    hasDoneFirstFetch: false,
    viewOnlyMode: false,
    parsedParams,

    // Session data
    users: users ?? [],
    clientId: clientId ?? null,
    isLeader: isLeader ?? false,
    isBackendMode: isPartyMode,
    hasConnected: hasConnected ?? false,
    connectionError: connectionError ?? null,
    disconnect: deactivateSession,

    // Session management
    isSessionActive: isPartyMode && (hasConnected ?? false),
    sessionId: activeSession?.sessionId ?? null,
    startSession: async () => {
      throw new Error('Cannot start a session outside of a board route');
    },
    joinSession: async () => {
      throw new Error('Cannot join a session outside of a board route');
    },
    endSession: () => {
      deactivateSession();
    },

    // Queue mutations
    addToQueue: (climb: Climb) => {
      const newItem: ClimbQueueItem = { climb, uuid: uuidv4() };
      if (isPartyMode && hasConnected) {
        addQueueItem(newItem);
      } else {
        updateLocalQueue([...queue, newItem], currentClimbQueueItem);
      }
    },

    removeFromQueue: (item: ClimbQueueItem) => {
      if (isPartyMode && hasConnected) {
        removeQueueItem(item.uuid);
      } else {
        const newQueue = queue.filter((q) => q.uuid !== item.uuid);
        const newCurrent = currentClimbQueueItem?.uuid === item.uuid ? null : currentClimbQueueItem;
        updateLocalQueue(newQueue, newCurrent);
      }
    },

    setCurrentClimb: (climb: Climb) => {
      const newItem: ClimbQueueItem = { climb, uuid: uuidv4() };
      if (isPartyMode && hasConnected) {
        setCurrentClimb(newItem, true);
      } else {
        updateLocalQueue([...queue, newItem], newItem);
      }
    },

    setCurrentClimbQueueItem: (item: ClimbQueueItem) => {
      if (isPartyMode && hasConnected) {
        setCurrentClimb(item, item.suggested);
      } else {
        updateLocalQueue(queue, item);
      }
    },

    setClimbSearchParams: () => {
      // No-op off board routes — search is not available
    },

    mirrorClimb: () => {
      if (!currentClimbQueueItem?.climb) return;
      const newMirrored = !currentClimbQueueItem.climb.mirrored;
      if (isPartyMode && hasConnected) {
        mirrorCurrentClimb(newMirrored);
      } else {
        // Update locally
        const mirrored: ClimbQueueItem = {
          ...currentClimbQueueItem,
          climb: { ...currentClimbQueueItem.climb, mirrored: newMirrored },
        };
        const newQueue = queue.map((q) => (q.uuid === mirrored.uuid ? mirrored : q));
        updateLocalQueue(newQueue, mirrored);
      }
    },

    fetchMoreClimbs: () => {
      // No-op off board routes
    },

    getNextClimbQueueItem,
    getPreviousClimbQueueItem,

    setQueue: (newQueue: ClimbQueueItem[]) => {
      if (isPartyMode && hasConnected) {
        persistentSetQueue(newQueue, currentClimbQueueItem);
      } else {
        updateLocalQueue(newQueue, currentClimbQueueItem);
      }
    },
  }), [
    queue,
    currentClimbQueueItem,
    parsedParams,
    users,
    clientId,
    isLeader,
    isPartyMode,
    hasConnected,
    connectionError,
    activeSession,
    deactivateSession,
    addQueueItem,
    removeQueueItem,
    setCurrentClimb,
    mirrorCurrentClimb,
    persistentSetQueue,
    updateLocalQueue,
    getNextClimbQueueItem,
    getPreviousClimbQueueItem,
  ]);

  return (
    <QueueContext.Provider value={contextValue}>
      <FavoritesProvider
        favorites={EMPTY_FAVORITES}
        isFavorited={NOOP_IS_FAVORITED}
        toggleFavorite={NOOP_TOGGLE_FAVORITE}
        isLoading={false}
        isAuthenticated={false}
      >
        <PlaylistsProvider
          playlists={EMPTY_PLAYLISTS}
          playlistMemberships={EMPTY_MEMBERSHIPS}
          addToPlaylist={NOOP_ADD_TO_PLAYLIST}
          removeFromPlaylist={NOOP_REMOVE_FROM_PLAYLIST}
          createPlaylist={NOOP_CREATE_PLAYLIST}
          isLoading={false}
          isAuthenticated={false}
          refreshPlaylists={NOOP_REFRESH_PLAYLISTS}
        >
          {children}
        </PlaylistsProvider>
      </FavoritesProvider>
    </QueueContext.Provider>
  );
};
