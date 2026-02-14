'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { QueueContext, type GraphQLQueueContextType } from '../graphql-queue/QueueContext';
import { usePersistentSession } from '../persistent-session';
import { getBaseBoardPath } from '@/app/lib/url-utils';
import { DEFAULT_SEARCH_PARAMS } from '@/app/lib/url-utils';
import type { BoardDetails, Angle, Climb, SearchRequestPagination } from '@/app/lib/types';
import type { ClimbQueueItem } from './types';

// -------------------------------------------------------------------
// Board info context (for the root-level bottom bar to know what board is active)
// -------------------------------------------------------------------

interface QueueBridgeBoardInfo {
  boardDetails: BoardDetails | null;
  angle: Angle;
  hasActiveQueue: boolean;
}

const QueueBridgeBoardInfoContext = createContext<QueueBridgeBoardInfo>({
  boardDetails: null,
  angle: 0,
  hasActiveQueue: false,
});

export function useQueueBridgeBoardInfo() {
  return useContext(QueueBridgeBoardInfoContext);
}

// -------------------------------------------------------------------
// Setter context (for the injector to push board-route context into the bridge)
// -------------------------------------------------------------------

interface QueueBridgeSetters {
  setInjectedContext: (ctx: GraphQLQueueContextType | null) => void;
  setInjectedBoardDetails: (bd: BoardDetails | null) => void;
  setInjectedAngle: (angle: Angle) => void;
}

const QueueBridgeSetterContext = createContext<QueueBridgeSetters>({
  setInjectedContext: () => {},
  setInjectedBoardDetails: () => {},
  setInjectedAngle: () => {},
});

// -------------------------------------------------------------------
// usePersistentSessionQueueAdapter — thin adapter over PersistentSession
// -------------------------------------------------------------------

function usePersistentSessionQueueAdapter(): {
  context: GraphQLQueueContextType;
  boardDetails: BoardDetails | null;
  angle: Angle;
  hasActiveQueue: boolean;
} {
  const ps = usePersistentSession();

  const isParty = !!ps.activeSession;
  const queue = isParty ? ps.queue : ps.localQueue;
  const currentClimbQueueItem = isParty ? ps.currentClimbQueueItem : ps.localCurrentClimbQueueItem;
  const boardDetails = isParty ? ps.activeSession!.boardDetails : ps.localBoardDetails;
  const angle: Angle = isParty
    ? ps.activeSession!.parsedParams.angle
    : (ps.localCurrentClimbQueueItem?.climb?.angle ?? 0);

  const baseBoardPath = useMemo(() => {
    if (isParty && ps.activeSession?.boardPath) {
      return getBaseBoardPath(ps.activeSession.boardPath);
    }
    return ps.localBoardPath ?? '';
  }, [isParty, ps.activeSession?.boardPath, ps.localBoardPath]);

  const hasActiveQueue = (queue.length > 0 || !!currentClimbQueueItem || isParty) && !!boardDetails;

  const parsedParams = useMemo(() => {
    if (!boardDetails) {
      // Fallback — should not be consumed when hasActiveQueue is false
      return { board_name: 'kilter' as const, layout_id: 0, size_id: 0, set_ids: [0], angle: 0 };
    }
    return {
      board_name: boardDetails.board_name,
      layout_id: boardDetails.layout_id,
      size_id: boardDetails.size_id,
      set_ids: boardDetails.set_ids,
      angle,
    };
  }, [boardDetails, angle]);

  const getNextClimbQueueItem = useCallback((): ClimbQueueItem | null => {
    const idx = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    return idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;
  }, [queue, currentClimbQueueItem]);

  const getPreviousClimbQueueItem = useCallback((): ClimbQueueItem | null => {
    const idx = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    return idx > 0 ? queue[idx - 1] : null;
  }, [queue, currentClimbQueueItem]);

  const setCurrentClimbQueueItem = useCallback(
    (item: ClimbQueueItem) => {
      if (!boardDetails) return;
      // Build the new queue: ensure item is in it
      const newQueue = queue.some(q => q.uuid === item.uuid)
        ? queue
        : [...queue, item];
      ps.setLocalQueueState(newQueue, item, baseBoardPath, boardDetails);
    },
    [queue, boardDetails, baseBoardPath, ps],
  );

  const addToQueue = useCallback(
    (climb: Climb) => {
      if (!boardDetails) return;
      const newItem: ClimbQueueItem = {
        climb,
        addedBy: null,
        uuid: uuidv4(),
        suggested: false,
      };
      const newQueue = [...queue, newItem];
      const current = currentClimbQueueItem ?? newItem;
      ps.setLocalQueueState(newQueue, current, baseBoardPath, boardDetails);
    },
    [queue, currentClimbQueueItem, boardDetails, baseBoardPath, ps],
  );

  const removeFromQueue = useCallback(
    (item: ClimbQueueItem) => {
      if (!boardDetails) return;
      const newQueue = queue.filter(q => q.uuid !== item.uuid);
      const newCurrent = currentClimbQueueItem?.uuid === item.uuid
        ? (newQueue[0] ?? null)
        : currentClimbQueueItem;
      ps.setLocalQueueState(newQueue, newCurrent, baseBoardPath, boardDetails);
    },
    [queue, currentClimbQueueItem, boardDetails, baseBoardPath, ps],
  );

  const setQueue = useCallback(
    (newQueue: ClimbQueueItem[]) => {
      if (!boardDetails) return;
      const newCurrent = newQueue.length === 0
        ? null
        : (currentClimbQueueItem && newQueue.some(q => q.uuid === currentClimbQueueItem.uuid)
            ? currentClimbQueueItem
            : newQueue[0]);
      ps.setLocalQueueState(newQueue, newCurrent, baseBoardPath, boardDetails);
    },
    [currentClimbQueueItem, boardDetails, baseBoardPath, ps],
  );

  const mirrorClimb = useCallback(() => {
    if (!currentClimbQueueItem?.climb || !boardDetails) return;
    const mirrored = !currentClimbQueueItem.climb.mirrored;
    const updatedItem: ClimbQueueItem = {
      ...currentClimbQueueItem,
      climb: { ...currentClimbQueueItem.climb, mirrored },
    };
    const newQueue = queue.map(q => (q.uuid === updatedItem.uuid ? updatedItem : q));
    ps.setLocalQueueState(newQueue, updatedItem, baseBoardPath, boardDetails);
  }, [currentClimbQueueItem, queue, boardDetails, baseBoardPath, ps]);

  const setCurrentClimb = useCallback(
    (climb: Climb) => {
      if (!boardDetails) return;
      const newItem: ClimbQueueItem = {
        climb,
        addedBy: null,
        uuid: uuidv4(),
        suggested: false,
      };
      // Insert after current in queue
      const currentIdx = currentClimbQueueItem
        ? queue.findIndex(q => q.uuid === currentClimbQueueItem.uuid)
        : -1;
      const newQueue = [...queue];
      if (currentIdx >= 0) {
        newQueue.splice(currentIdx + 1, 0, newItem);
      } else {
        newQueue.push(newItem);
      }
      ps.setLocalQueueState(newQueue, newItem, baseBoardPath, boardDetails);
    },
    [queue, currentClimbQueueItem, boardDetails, baseBoardPath, ps],
  );

  // No-op functions for fields not used by the bottom bar
  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => '', []);

  const context: GraphQLQueueContextType = useMemo(
    () => ({
      queue,
      currentClimbQueueItem,
      currentClimb: currentClimbQueueItem?.climb ?? null,
      climbSearchParams: DEFAULT_SEARCH_PARAMS,
      climbSearchResults: null,
      suggestedClimbs: [],
      totalSearchResultCount: null,
      hasMoreResults: false,
      isFetchingClimbs: false,
      isFetchingNextPage: false,
      hasDoneFirstFetch: false,
      viewOnlyMode: false,
      parsedParams,

      // Session management
      isSessionActive: isParty && ps.hasConnected,
      sessionId: ps.activeSession?.sessionId ?? null,
      startSession: noopAsync as GraphQLQueueContextType['startSession'],
      joinSession: noopAsync as unknown as GraphQLQueueContextType['joinSession'],
      endSession: ps.deactivateSession,
      sessionSummary: null,
      dismissSessionSummary: noop,
      sessionGoal: ps.session?.goal ?? null,

      // Session data
      users: isParty ? ps.users : [],
      clientId: ps.clientId,
      isLeader: ps.isLeader,
      isBackendMode: true,
      hasConnected: ps.hasConnected,
      connectionError: ps.error,
      disconnect: ps.deactivateSession,

      // Actions
      addToQueue,
      removeFromQueue,
      setCurrentClimb,
      setCurrentClimbQueueItem,
      setClimbSearchParams: noop as unknown as (params: SearchRequestPagination) => void,
      mirrorClimb,
      fetchMoreClimbs: noop,
      getNextClimbQueueItem,
      getPreviousClimbQueueItem,
      setQueue,
    }),
    [
      queue,
      currentClimbQueueItem,
      parsedParams,
      isParty,
      ps.hasConnected,
      ps.activeSession?.sessionId,
      ps.deactivateSession,
      ps.session?.goal,
      ps.users,
      ps.clientId,
      ps.isLeader,
      ps.error,
      noopAsync,
      noop,
      addToQueue,
      removeFromQueue,
      setCurrentClimb,
      setCurrentClimbQueueItem,
      mirrorClimb,
      getNextClimbQueueItem,
      getPreviousClimbQueueItem,
      setQueue,
    ],
  );

  return { context, boardDetails, angle, hasActiveQueue };
}

// -------------------------------------------------------------------
// QueueBridgeProvider — wraps children + bottom bar at root level
// -------------------------------------------------------------------

export function QueueBridgeProvider({ children }: { children: React.ReactNode }) {
  const [injectedContext, setInjectedContext] = useState<GraphQLQueueContextType | null>(null);
  const [injectedBoardDetails, setInjectedBoardDetails] = useState<BoardDetails | null>(null);
  const [injectedAngle, setInjectedAngle] = useState<Angle>(0);

  const adapter = usePersistentSessionQueueAdapter();

  // When a board route is active (injectedContext set), use the injected context.
  // Otherwise, fall back to the PersistentSession adapter.
  const effectiveContext = injectedContext ?? adapter.context;
  const effectiveBoardDetails = injectedContext ? injectedBoardDetails : adapter.boardDetails;
  const effectiveAngle = injectedContext ? injectedAngle : adapter.angle;
  const effectiveHasActiveQueue = injectedContext
    ? true // If injected, a board route is active — always show bar
    : adapter.hasActiveQueue;

  const boardInfo = useMemo<QueueBridgeBoardInfo>(
    () => ({
      boardDetails: effectiveBoardDetails,
      angle: effectiveAngle,
      hasActiveQueue: effectiveHasActiveQueue,
    }),
    [effectiveBoardDetails, effectiveAngle, effectiveHasActiveQueue],
  );

  const setters = useMemo<QueueBridgeSetters>(
    () => ({
      setInjectedContext,
      setInjectedBoardDetails,
      setInjectedAngle,
    }),
    [],
  );

  return (
    <QueueBridgeSetterContext.Provider value={setters}>
      <QueueBridgeBoardInfoContext.Provider value={boardInfo}>
        <QueueContext.Provider value={effectiveContext}>
          {children}
        </QueueContext.Provider>
      </QueueBridgeBoardInfoContext.Provider>
    </QueueBridgeSetterContext.Provider>
  );
}

// -------------------------------------------------------------------
// QueueBridgeInjector — placed inside board route layouts
// -------------------------------------------------------------------

interface QueueBridgeInjectorProps {
  boardDetails: BoardDetails;
  angle: Angle;
}

export function QueueBridgeInjector({ boardDetails, angle }: QueueBridgeInjectorProps) {
  const { setInjectedContext, setInjectedBoardDetails, setInjectedAngle } = useContext(QueueBridgeSetterContext);

  // Read the board route's QueueContext (from GraphQLQueueProvider which is a parent)
  const queueContext = useContext(QueueContext);

  // Use useLayoutEffect so injection happens synchronously before paint — no flash
  useLayoutEffect(() => {
    if (queueContext) {
      setInjectedContext(queueContext);
    }
    setInjectedBoardDetails(boardDetails);
    setInjectedAngle(angle);

    return () => {
      setInjectedContext(null);
      setInjectedBoardDetails(null);
      setInjectedAngle(0);
    };
  }, [queueContext, boardDetails, angle, setInjectedContext, setInjectedBoardDetails, setInjectedAngle]);

  return null;
}
