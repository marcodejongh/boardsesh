'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation'; // Used by useIsOnBoardRoute
import { execute, Client } from '../graphql-queue/graphql-client';
import {
  ADD_QUEUE_ITEM,
  REMOVE_QUEUE_ITEM,
  SET_CURRENT_CLIMB,
  MIRROR_CURRENT_CLIMB,
  SET_QUEUE,
  SessionUser,
  SubscriptionQueueEvent,
  SessionEvent,
  SUPPORTED_BOARDS,
} from '@boardsesh/shared-schema';
import { ClimbQueueItem as LocalClimbQueueItem } from '../queue-control/types';
import { BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { usePartyProfile } from '../party-manager/party-profile-context';
import { computeQueueStateHash } from '@/app/utils/hash';
import { getStoredQueue, saveQueueState, cleanupOldQueues, getMostRecentQueue, StoredQueueState } from '@/app/lib/queue-storage-db';
import { getPreference, setPreference, removePreference } from '@/app/lib/user-preferences-db';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  END_SESSION as END_SESSION_GQL,
  type EndSessionResponse,
} from '@/app/lib/graphql/operations/sessions';
import type { SessionLiveStats, SessionSummary } from '@boardsesh/shared-schema';
import {
  evaluateQueueEventSequence,
  insertQueueItemIdempotent,
  upsertSessionUser,
} from './event-utils';
import { SessionConnection, type SessionData, type SessionConnectionCallbacks } from './session-connection';

const DEBUG = process.env.NODE_ENV === 'development';

// Key for persisting ActiveSessionInfo in user-preferences IndexedDB
const ACTIVE_SESSION_KEY = 'activeSession';

// Default backend URL from environment variable
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || null;

// Board names to check if we're on a board route - use centralized constant
const BOARD_NAMES = SUPPORTED_BOARDS;

// Cooldown for corruption-triggered resyncs to prevent infinite loops
const CORRUPTION_RESYNC_COOLDOWN_MS = 30000; // 30 seconds

// Debounce delay for saving queue to IndexedDB
const QUEUE_SAVE_DEBOUNCE_MS = 500;

// Session type matching the GraphQL response
export interface Session {
  id: string;
  name: string | null;
  boardPath: string;
  users: SessionUser[];
  queueState: {
    sequence: number;
    stateHash: string;
    queue: unknown[];
    currentClimbQueueItem: unknown;
  };
  isLeader: boolean;
  clientId: string;
  goal?: string | null;
  isPublic?: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  isPermanent?: boolean;
  color?: string | null;
}

// Active session info stored at root level
export interface ActiveSessionInfo {
  sessionId: string;
  sessionName?: string;
  boardPath: string;
  boardDetails: BoardDetails;
  parsedParams: ParsedBoardRouteParameters;
}

// Convert local ClimbQueueItem to GraphQL input format
function toClimbQueueItemInput(item: unknown) {
  const typedItem = item as LocalClimbQueueItem;
  return {
    uuid: typedItem.uuid,
    climb: {
      uuid: typedItem.climb.uuid,
      setter_username: typedItem.climb.setter_username,
      name: typedItem.climb.name,
      description: typedItem.climb.description || '',
      frames: typedItem.climb.frames,
      angle: typedItem.climb.angle,
      ascensionist_count: typedItem.climb.ascensionist_count,
      difficulty: typedItem.climb.difficulty,
      quality_average: typedItem.climb.quality_average,
      stars: typedItem.climb.stars,
      difficulty_error: typedItem.climb.difficulty_error,
      litUpHoldsMap: typedItem.climb.litUpHoldsMap,
      mirrored: typedItem.climb.mirrored,
      benchmark_difficulty: typedItem.climb.benchmark_difficulty,
      userAscents: typedItem.climb.userAscents,
      userAttempts: typedItem.climb.userAttempts,
    },
    addedBy: typedItem.addedBy,
    addedByUser: typedItem.addedByUser
      ? {
          id: typedItem.addedByUser.id,
          username: typedItem.addedByUser.username,
          avatarUrl: typedItem.addedByUser.avatarUrl,
        }
      : undefined,
    tickedBy: typedItem.tickedBy,
    suggested: typedItem.suggested,
  };
}

export interface PersistentSessionContextType {
  // Active session info
  activeSession: ActiveSessionInfo | null;

  // Session state
  session: Session | null;
  isConnecting: boolean;
  hasConnected: boolean;
  error: Error | null;

  // Session data
  clientId: string | null;
  isLeader: boolean;
  users: SessionUser[];

  // Queue state synced from backend
  currentClimbQueueItem: LocalClimbQueueItem | null;
  queue: LocalClimbQueueItem[];

  // Local queue state (persists without WebSocket session)
  localQueue: LocalClimbQueueItem[];
  localCurrentClimbQueueItem: LocalClimbQueueItem | null;
  localBoardPath: string | null;
  localBoardDetails: BoardDetails | null;
  isLocalQueueLoaded: boolean;
  setLocalQueueState: (
    queue: LocalClimbQueueItem[],
    currentItem: LocalClimbQueueItem | null,
    boardPath: string,
    boardDetails: BoardDetails,
  ) => void;
  clearLocalQueue: () => void;
  loadStoredQueue: (boardPath: string) => Promise<StoredQueueState | null>;

  // Session lifecycle
  activateSession: (info: ActiveSessionInfo) => void;
  deactivateSession: () => void;
  setInitialQueueForSession: (
    sessionId: string,
    queue: LocalClimbQueueItem[],
    currentClimb: LocalClimbQueueItem | null,
    sessionName?: string,
  ) => void;

  // Mutation functions
  addQueueItem: (item: LocalClimbQueueItem, position?: number) => Promise<void>;
  removeQueueItem: (uuid: string) => Promise<void>;
  setCurrentClimb: (item: LocalClimbQueueItem | null, shouldAddToQueue?: boolean, correlationId?: string) => Promise<void>;
  mirrorCurrentClimb: (mirrored: boolean) => Promise<void>;
  setQueue: (queue: LocalClimbQueueItem[], currentClimbQueueItem?: LocalClimbQueueItem | null) => Promise<void>;

  // Event subscription for board-level components
  subscribeToQueueEvents: (callback: (event: SubscriptionQueueEvent) => void) => () => void;
  subscribeToSessionEvents: (callback: (event: SessionEvent) => void) => () => void;

  // Trigger a resync with the server (useful when corrupted data is detected)
  triggerResync: () => void;

  // True when we had a working connection but the WebSocket dropped
  isReconnecting: boolean;

  // Session ending with summary (elevated from GraphQLQueueProvider)
  endSessionWithSummary: () => void;
  liveSessionStats: SessionLiveStats | null;
  sessionSummary: SessionSummary | null;
  dismissSessionSummary: () => void;
}

const PersistentSessionContext = createContext<PersistentSessionContextType | undefined>(undefined);

export const PersistentSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token: wsAuthToken, isLoading: isAuthLoading } = useWsAuthToken();
  const { username, avatarUrl } = usePartyProfile();

  // Active session info
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);

  // Connection state (driven by SessionConnection's ConnectionStateMachine)
  const [client, setClient] = useState<Client | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Queue state synced from backend
  const [currentClimbQueueItem, setCurrentClimbQueueItem] = useState<LocalClimbQueueItem | null>(null);
  const [queue, setQueueState] = useState<LocalClimbQueueItem[]>([]);

  // Sequence tracking for gap detection and state verification
  const [lastReceivedStateHash, setLastReceivedStateHash] = useState<string | null>(null);
  const lastReceivedSequenceRef = useRef<number | null>(null);

  // Local queue state (persists without WebSocket session)
  const [localQueue, setLocalQueue] = useState<LocalClimbQueueItem[]>([]);
  const [localCurrentClimbQueueItem, setLocalCurrentClimbQueueItem] = useState<LocalClimbQueueItem | null>(null);
  const [localBoardPath, setLocalBoardPath] = useState<string | null>(null);
  const [localBoardDetails, setLocalBoardDetails] = useState<BoardDetails | null>(null);
  const [isLocalQueueLoaded, setIsLocalQueueLoaded] = useState(false);

  // Ref for debounced IndexedDB save timer
  const saveQueueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pending initial queue for new sessions
  const [pendingInitialQueue, setPendingInitialQueue] = useState<{
    sessionId: string;
    queue: LocalClimbQueueItem[];
    currentClimb: LocalClimbQueueItem | null;
    sessionName?: string;
  } | null>(null);
  const [liveSessionStats, setLiveSessionStats] = useState<SessionLiveStats | null>(null);

  // Refs for current values (used by SessionConnection callbacks to avoid stale closures)
  const queueRef = useRef<LocalClimbQueueItem[]>([]);
  const currentClimbQueueItemRef = useRef<LocalClimbQueueItem | null>(null);
  const pendingInitialQueueRef = useRef(pendingInitialQueue);

  // SessionConnection instance ref
  const connectionRef = useRef<SessionConnection | null>(null);

  // Cooldown tracking for corruption-triggered resyncs
  const lastCorruptionResyncRef = useRef<number>(0);
  const isFilteringCorruptedItemsRef = useRef(false);

  // Event subscribers
  const queueEventSubscribersRef = useRef<Set<(event: SubscriptionQueueEvent) => void>>(new Set());
  const sessionEventSubscribersRef = useRef<Set<(event: SessionEvent) => void>>(new Set());

  // Keep refs in sync
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentClimbQueueItemRef.current = currentClimbQueueItem; }, [currentClimbQueueItem]);
  useEffect(() => { pendingInitialQueueRef.current = pendingInitialQueue; }, [pendingInitialQueue]);

  // Clean up old queues from IndexedDB on mount
  useEffect(() => {
    cleanupOldQueues(30).catch((error) => {
      console.error('[PersistentSession] Failed to cleanup old queues:', error);
    });
  }, []);

  // Clean up debounced save timer on unmount
  useEffect(() => {
    return () => {
      if (saveQueueTimeoutRef.current) {
        clearTimeout(saveQueueTimeoutRef.current);
      }
    };
  }, []);

  // Auto-restore session state on mount (party session OR local queue)
  useEffect(() => {
    async function restoreState() {
      // 1. Try to restore party session first (takes priority)
      try {
        const persisted = await getPreference<ActiveSessionInfo>(ACTIVE_SESSION_KEY);
        if (persisted && persisted.sessionId && persisted.boardPath && persisted.boardDetails) {
          if (DEBUG) console.log('[PersistentSession] Restoring persisted session:', persisted.sessionId);
          setActiveSession(persisted);
          setIsLocalQueueLoaded(true);
          return;
        }
      } catch (error) {
        console.error('[PersistentSession] Failed to restore persisted session:', error);
      }

      // 2. No party session — restore most recent local queue
      try {
        const stored = await getMostRecentQueue();
        if (stored && (stored.queue.length > 0 || stored.currentClimbQueueItem)) {
          if (DEBUG) console.log('[PersistentSession] Auto-restored most recent queue:', stored.queue.length, 'items for', stored.boardPath);
          setLocalQueue(stored.queue);
          setLocalCurrentClimbQueueItem(stored.currentClimbQueueItem);
          setLocalBoardPath(stored.boardPath);
          setLocalBoardDetails(stored.boardDetails);
        }
      } catch (error) {
        console.error('[PersistentSession] Failed to auto-restore queue:', error);
      }

      setIsLocalQueueLoaded(true);
    }

    restoreState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Notify queue event subscribers
  const notifyQueueSubscribers = useCallback((event: SubscriptionQueueEvent) => {
    queueEventSubscribersRef.current.forEach((callback) => callback(event));
  }, []);

  // Notify session event subscribers
  const notifySessionSubscribers = useCallback((event: SessionEvent) => {
    sessionEventSubscribersRef.current.forEach((callback) => callback(event));
  }, []);

  // Helper to update sequence ref
  const updateLastReceivedSequence = useCallback((sequence: number) => {
    lastReceivedSequenceRef.current = sequence;
  }, []);

  // Handle queue events internally
  const handleQueueEvent = useCallback((event: SubscriptionQueueEvent) => {
    // Sequence validation for stale/gap detection
    if (event.__typename !== 'FullSync') {
      const lastSeq = lastReceivedSequenceRef.current;
      const sequenceDecision = evaluateQueueEventSequence(lastSeq, event.sequence);

      if (sequenceDecision === 'ignore-stale') {
        if (DEBUG) {
          console.log(
            `[PersistentSession] Ignoring stale/duplicate event with sequence ${event.sequence} ` +
            `(last received: ${lastSeq})`
          );
        }
        return;
      }

      if (sequenceDecision === 'gap') {
        console.warn(
          `[PersistentSession] Sequence gap detected: expected ${lastSeq! + 1}, got ${event.sequence}. ` +
          `Triggering resync.`
        );
        connectionRef.current?.triggerResync();
        return;
      }
    }

    switch (event.__typename) {
      case 'FullSync':
        setQueueState((event.state.queue as LocalClimbQueueItem[]).filter(item => item != null));
        setCurrentClimbQueueItem(event.state.currentClimbQueueItem as LocalClimbQueueItem | null);
        updateLastReceivedSequence(event.sequence);
        setLastReceivedStateHash(event.state.stateHash);
        break;
      case 'QueueItemAdded':
        if (event.addedItem == null) {
          console.error('[PersistentSession] Received QueueItemAdded with null/undefined item, skipping');
          updateLastReceivedSequence(event.sequence);
          break;
        }
        setQueueState((prev) => {
          return insertQueueItemIdempotent(
            prev,
            event.addedItem as LocalClimbQueueItem,
            event.position,
          );
        });
        updateLastReceivedSequence(event.sequence);
        break;
      case 'QueueItemRemoved':
        setQueueState((prev) => prev.filter((item) => item.uuid !== event.uuid));
        updateLastReceivedSequence(event.sequence);
        break;
      case 'QueueReordered':
        setQueueState((prev) => {
          const newQueue = [...prev];
          const [item] = newQueue.splice(event.oldIndex, 1);
          newQueue.splice(event.newIndex, 0, item);
          return newQueue;
        });
        updateLastReceivedSequence(event.sequence);
        break;
      case 'CurrentClimbChanged':
        setCurrentClimbQueueItem(event.currentItem as LocalClimbQueueItem | null);
        updateLastReceivedSequence(event.sequence);
        break;
      case 'ClimbMirrored':
        setCurrentClimbQueueItem((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            climb: {
              ...prev.climb,
              mirrored: event.mirrored,
            },
          };
        });
        updateLastReceivedSequence(event.sequence);
        break;
    }

    // Notify external subscribers
    notifyQueueSubscribers(event);
  }, [notifyQueueSubscribers, updateLastReceivedSequence]);

  // Keep state hash in sync with local state after delta events
  // Also detects corrupted items and triggers resync if found
  useEffect(() => {
    if (!session) return;

    if (isFilteringCorruptedItemsRef.current) {
      isFilteringCorruptedItemsRef.current = false;
      return;
    }

    const hasCorruptedItems = queue.some(item => item == null);
    if (hasCorruptedItems) {
      const now = Date.now();
      const timeSinceLastResync = now - lastCorruptionResyncRef.current;

      if (timeSinceLastResync < CORRUPTION_RESYNC_COOLDOWN_MS) {
        console.error(
          `[PersistentSession] Detected null/undefined items in queue, but resync on cooldown ` +
          `(${Math.round((CORRUPTION_RESYNC_COOLDOWN_MS - timeSinceLastResync) / 1000)}s remaining). ` +
          `Filtering locally.`
        );
        isFilteringCorruptedItemsRef.current = true;
        setQueueState(prev => prev.filter(item => item != null));
        return;
      }

      console.error('[PersistentSession] Detected null/undefined items in queue, triggering resync');
      lastCorruptionResyncRef.current = now;
      connectionRef.current?.triggerResync();
      return;
    }

    const newHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);
    setLastReceivedStateHash(newHash);
  }, [session, queue, currentClimbQueueItem]);

  // Handle session events internally
  const handleSessionEvent = useCallback((event: SessionEvent) => {
    if (event.__typename === 'SessionStatsUpdated') {
      setLiveSessionStats({
        sessionId: event.sessionId,
        totalSends: event.totalSends,
        totalFlashes: event.totalFlashes,
        totalAttempts: event.totalAttempts,
        tickCount: event.tickCount,
        participants: event.participants,
        gradeDistribution: event.gradeDistribution,
        boardTypes: event.boardTypes,
        hardestGrade: event.hardestGrade,
        durationMinutes: event.durationMinutes,
        goal: event.goal,
        ticks: event.ticks,
      });
      notifySessionSubscribers(event);
      return;
    }

    setSession((prev) => {
      if (!prev) return prev;

      switch (event.__typename) {
        case 'UserJoined':
          return {
            ...prev,
            users: upsertSessionUser(prev.users, event.user),
          };
        case 'UserLeft':
          return {
            ...prev,
            users: prev.users.filter((u) => u.id !== event.userId),
          };
        case 'LeaderChanged':
          return {
            ...prev,
            isLeader: event.leaderId === prev.clientId,
            users: prev.users.map((u) => ({
              ...u,
              isLeader: u.id === event.leaderId,
            })),
          };
        case 'SessionEnded':
          if (DEBUG) console.log('[PersistentSession] Session ended:', event.reason);
          setLiveSessionStats(null);
          removePreference(ACTIVE_SESSION_KEY).catch(() => {});
          return prev;
        default:
          return prev;
      }
    });

    notifySessionSubscribers(event);
  }, [notifySessionSubscribers]);

  // Reset live stats when active session changes or clears
  useEffect(() => {
    setLiveSessionStats((prev) => {
      if (!activeSession) return null;
      return prev?.sessionId === activeSession.sessionId ? prev : null;
    });
  }, [activeSession]);

  // ── SessionConnection lifecycle ──────────────────────────────────
  // Creates/destroys SessionConnection when activeSession changes

  useEffect(() => {
    if (!activeSession) {
      if (DEBUG) console.log('[PersistentSession] No active session, skipping connection');
      return;
    }

    if (isAuthLoading) {
      if (DEBUG) console.log('[PersistentSession] Waiting for auth to load...');
      return;
    }

    const backendUrl = DEFAULT_BACKEND_URL;
    if (!backendUrl) {
      if (DEBUG) console.log('[PersistentSession] No backend URL configured');
      return;
    }

    const { sessionId, boardPath, sessionName } = activeSession;

    const callbacks: SessionConnectionCallbacks = {
      onConnectionFlagsChange: (flags) => {
        setIsConnecting(flags.isConnecting);
        setHasConnected(flags.hasConnected);
        setIsWebSocketConnected(flags.isWebSocketConnected);
      },
      onSessionJoined: (sessionData) => {
        setSession(sessionData as unknown as Session);
      },
      onSessionCleared: () => {
        removePreference(ACTIVE_SESSION_KEY).catch(() => {});
        setActiveSession(null);
      },
      onQueueEvent: handleQueueEvent,
      onSessionEvent: handleSessionEvent,
      onError: (err) => {
        setError(err);
      },
      onClientCreated: (newClient) => {
        setClient(newClient);
      },
      getQueueState: () => ({
        queue: queueRef.current,
        currentItemUuid: currentClimbQueueItemRef.current?.uuid || null,
      }),
      getLastSequence: () => lastReceivedSequenceRef.current,
      toClimbQueueItemInput,
      getPendingInitialQueue: () => {
        const piq = pendingInitialQueueRef.current;
        if (!piq) return null;
        return {
          sessionId: piq.sessionId,
          queue: piq.queue,
          currentClimb: piq.currentClimb,
          sessionName: piq.sessionName,
        };
      },
      clearPendingInitialQueue: () => {
        setPendingInitialQueue(null);
      },
    };

    const conn = new SessionConnection({
      backendUrl,
      sessionId,
      boardPath,
      sessionName,
      callbacks,
    });

    conn.updateCredentials(wsAuthToken ?? null, username, avatarUrl);
    connectionRef.current = conn;

    conn.connect();

    return () => {
      if (DEBUG) console.log('[PersistentSession] Cleaning up connection');
      conn.dispose();
      connectionRef.current = null;

      setClient(null);
      setSession(null);
      setHasConnected(false);
      setIsWebSocketConnected(false);
      setIsConnecting(false);
    };
  // Intentionally omitted deps to prevent unnecessary WebSocket reconnections:
  // - username, avatarUrl, wsAuthToken: synced via updateCredentials() in a separate effect
  // - handleQueueEvent, handleSessionEvent: stable callbacks (deps are refs/other stable callbacks),
  //   but including them would risk reconnection if React ever recreates them
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, isAuthLoading]);

  // Keep credentials in sync without triggering reconnection
  useEffect(() => {
    connectionRef.current?.updateCredentials(wsAuthToken ?? null, username, avatarUrl);
  }, [wsAuthToken, username, avatarUrl]);

  // Proactive reconnection detection on iOS foreground return
  useEffect(() => {
    if (!activeSession || !hasConnected) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (DEBUG) console.log('[PersistentSession] Page became visible, triggering resync');
          connectionRef.current?.triggerResync();
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [activeSession, hasConnected]);

  // Periodic state hash verification (every 60 seconds)
  useEffect(() => {
    if (!session || !lastReceivedStateHash || queue.length === 0) return;

    const verifyInterval = setInterval(() => {
      const localHash = computeQueueStateHash(queue, currentClimbQueueItem?.uuid || null);

      if (localHash !== lastReceivedStateHash) {
        console.warn(
          '[PersistentSession] State hash mismatch detected!',
          `Local: ${localHash}, Server: ${lastReceivedStateHash}`,
          'Triggering automatic resync...'
        );
        connectionRef.current?.triggerResync();
      } else {
        if (DEBUG) console.log('[PersistentSession] State hash verification passed');
      }
    }, 60000);

    return () => clearInterval(verifyInterval);
  }, [session, lastReceivedStateHash, queue, currentClimbQueueItem]);

  // Defensive state consistency check
  useEffect(() => {
    if (!session || !currentClimbQueueItem || queue.length === 0) return;

    const isCurrentInQueue = queue.some(item => item.uuid === currentClimbQueueItem.uuid);

    if (!isCurrentInQueue) {
      console.warn(
        '[PersistentSession] Current climb not found in queue - state inconsistency detected. Triggering resync.'
      );
      connectionRef.current?.triggerResync();
    }
  }, [session, currentClimbQueueItem, queue]);

  // ── Session lifecycle functions ──────────────────────────────────

  const activateSession = useCallback((info: ActiveSessionInfo) => {
    setActiveSession((prev) => {
      if (prev?.sessionId === info.sessionId && prev?.boardPath === info.boardPath) {
        return prev;
      }
      if (DEBUG) console.log('[PersistentSession] Activating session:', info.sessionId);
      setPreference(ACTIVE_SESSION_KEY, info).catch((err) =>
        console.error('[PersistentSession] Failed to persist session:', err),
      );
      return info;
    });
  }, []);

  const deactivateSession = useCallback(() => {
    if (DEBUG) console.log('[PersistentSession] Deactivating session');
    setActiveSession(null);
    setQueueState([]);
    setCurrentClimbQueueItem(null);
    setLiveSessionStats(null);
    removePreference(ACTIVE_SESSION_KEY).catch((err) =>
      console.error('[PersistentSession] Failed to clear persisted session:', err),
    );
  }, []);

  const setInitialQueueForSession = useCallback(
    (sessionId: string, queue: LocalClimbQueueItem[], currentClimb: LocalClimbQueueItem | null, sessionName?: string) => {
      if (DEBUG) console.log(`[PersistentSession] Setting initial queue for session ${sessionId}:`, queue.length, 'items', sessionName ? `name: ${sessionName}` : '');
      setPendingInitialQueue({ sessionId, queue, currentClimb, sessionName });
    },
    []
  );

  // Load stored queue from IndexedDB
  const loadStoredQueue = useCallback(async (boardPath: string): Promise<StoredQueueState | null> => {
    if (activeSession) {
      if (DEBUG) console.log('[PersistentSession] Skipping queue load - party session active');
      return null;
    }

    try {
      const stored = await getStoredQueue(boardPath);
      if (stored) {
        if (DEBUG) console.log('[PersistentSession] Loaded queue from IndexedDB:', stored.queue.length, 'items');
        setLocalQueue(stored.queue);
        setLocalCurrentClimbQueueItem(stored.currentClimbQueueItem);
        setLocalBoardPath(stored.boardPath);
        setLocalBoardDetails(stored.boardDetails);
      }
      setIsLocalQueueLoaded(true);
      return stored;
    } catch (error) {
      console.error('[PersistentSession] Failed to load queue from IndexedDB:', error);
      setIsLocalQueueLoaded(true);
      return null;
    }
  }, [activeSession]);

  // Debounced save to IndexedDB
  const debouncedSaveToIndexedDB = useCallback(
    (
      newQueue: LocalClimbQueueItem[],
      newCurrentItem: LocalClimbQueueItem | null,
      boardPath: string,
      boardDetails: BoardDetails,
    ) => {
      if (saveQueueTimeoutRef.current) {
        clearTimeout(saveQueueTimeoutRef.current);
      }

      saveQueueTimeoutRef.current = setTimeout(() => {
        saveQueueState({
          boardPath,
          queue: newQueue,
          currentClimbQueueItem: newCurrentItem,
          boardDetails,
          updatedAt: Date.now(),
        }).catch((error) => {
          console.error('[PersistentSession] Failed to save queue to IndexedDB:', error);
        });
      }, QUEUE_SAVE_DEBOUNCE_MS);
    },
    [],
  );

  // Local queue management functions
  const setLocalQueueState = useCallback(
    (
      newQueue: LocalClimbQueueItem[],
      newCurrentItem: LocalClimbQueueItem | null,
      boardPath: string,
      boardDetails: BoardDetails,
    ) => {
      if (activeSession) return;

      setLocalQueue(newQueue);
      setLocalCurrentClimbQueueItem(newCurrentItem);
      setLocalBoardPath(boardPath);
      setLocalBoardDetails(boardDetails);

      debouncedSaveToIndexedDB(newQueue, newCurrentItem, boardPath, boardDetails);
    },
    [activeSession, debouncedSaveToIndexedDB],
  );

  const clearLocalQueue = useCallback(() => {
    if (DEBUG) console.log('[PersistentSession] Clearing local queue');
    setLocalQueue([]);
    setLocalCurrentClimbQueueItem(null);
    setLocalBoardPath(null);
    setLocalBoardDetails(null);

    if (saveQueueTimeoutRef.current) {
      clearTimeout(saveQueueTimeoutRef.current);
      saveQueueTimeoutRef.current = null;
    }
  }, []);

  // ── Mutation functions ──────────────────────────────────────────

  const addQueueItem = useCallback(
    async (item: LocalClimbQueueItem, position?: number) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: ADD_QUEUE_ITEM,
        variables: { item: toClimbQueueItemInput(item), position },
      });
    },
    [client, session],
  );

  const removeQueueItem = useCallback(
    async (uuid: string) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: REMOVE_QUEUE_ITEM,
        variables: { uuid },
      });
    },
    [client, session],
  );

  const setCurrentClimbMutation = useCallback(
    async (item: LocalClimbQueueItem | null, shouldAddToQueue?: boolean, correlationId?: string) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: SET_CURRENT_CLIMB,
        variables: {
          item: item ? toClimbQueueItemInput(item) : null,
          shouldAddToQueue,
          correlationId,
        },
      });
    },
    [client, session],
  );

  const mirrorCurrentClimbMutation = useCallback(
    async (mirrored: boolean) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: MIRROR_CURRENT_CLIMB,
        variables: { mirrored },
      });
    },
    [client, session],
  );

  const setQueueMutation = useCallback(
    async (newQueue: LocalClimbQueueItem[], newCurrentClimbQueueItem?: LocalClimbQueueItem | null) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: SET_QUEUE,
        variables: {
          queue: newQueue.map(toClimbQueueItemInput),
          currentClimbQueueItem: newCurrentClimbQueueItem ? toClimbQueueItemInput(newCurrentClimbQueueItem) : undefined,
        },
      });
    },
    [client, session],
  );

  // Event subscription functions
  const subscribeToQueueEvents = useCallback((callback: (event: SubscriptionQueueEvent) => void) => {
    queueEventSubscribersRef.current.add(callback);
    return () => {
      queueEventSubscribersRef.current.delete(callback);
    };
  }, []);

  const subscribeToSessionEvents = useCallback((callback: (event: SessionEvent) => void) => {
    sessionEventSubscribersRef.current.add(callback);
    return () => {
      sessionEventSubscribersRef.current.delete(callback);
    };
  }, []);

  // Trigger a resync with the server
  const triggerResync = useCallback(() => {
    console.log('[PersistentSession] Manual resync triggered');
    connectionRef.current?.triggerResync();
  }, []);

  // Session summary state
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const dismissSessionSummary = useCallback(() => {
    setSessionSummary(null);
  }, []);

  // Use a ref for wsAuthToken inside endSessionWithSummary to avoid re-creating callback
  const wsAuthTokenRef = useRef(wsAuthToken);
  useEffect(() => { wsAuthTokenRef.current = wsAuthToken; }, [wsAuthToken]);

  const endSessionWithSummary = useCallback(() => {
    const endingSessionId = activeSession?.sessionId;
    const token = wsAuthTokenRef.current;

    deactivateSession();

    if (endingSessionId && token) {
      const httpClient = createGraphQLHttpClient(token);
      httpClient.request<EndSessionResponse>(END_SESSION_GQL, { sessionId: endingSessionId })
        .then((response) => {
          if (response.endSession) {
            setSessionSummary(response.endSession);
          }
        })
        .catch((err) => {
          console.error('[PersistentSession] Failed to get session summary:', err);
        });
    }
  }, [activeSession, deactivateSession]);

  // Derived: true when we previously had a working connection but the WebSocket dropped
  const isReconnecting = hasConnected && !isWebSocketConnected;

  const value = useMemo<PersistentSessionContextType>(
    () => ({
      activeSession,
      session,
      isConnecting,
      hasConnected,
      error,
      clientId: session?.clientId ?? null,
      isLeader: session?.isLeader ?? false,
      users: session?.users ?? [],
      currentClimbQueueItem,
      queue,
      localQueue,
      localCurrentClimbQueueItem,
      localBoardPath,
      localBoardDetails,
      isLocalQueueLoaded,
      setLocalQueueState,
      clearLocalQueue,
      loadStoredQueue,
      activateSession,
      deactivateSession,
      setInitialQueueForSession,
      addQueueItem,
      removeQueueItem,
      setCurrentClimb: setCurrentClimbMutation,
      mirrorCurrentClimb: mirrorCurrentClimbMutation,
      setQueue: setQueueMutation,
      subscribeToQueueEvents,
      subscribeToSessionEvents,
      triggerResync,
      isReconnecting,
      endSessionWithSummary,
      liveSessionStats,
      sessionSummary,
      dismissSessionSummary,
    }),
    [
      activeSession,
      session,
      isConnecting,
      hasConnected,
      error,
      currentClimbQueueItem,
      queue,
      localQueue,
      localCurrentClimbQueueItem,
      localBoardPath,
      localBoardDetails,
      isLocalQueueLoaded,
      setLocalQueueState,
      clearLocalQueue,
      loadStoredQueue,
      activateSession,
      deactivateSession,
      setInitialQueueForSession,
      addQueueItem,
      removeQueueItem,
      setCurrentClimbMutation,
      mirrorCurrentClimbMutation,
      setQueueMutation,
      subscribeToQueueEvents,
      subscribeToSessionEvents,
      triggerResync,
      isReconnecting,
      endSessionWithSummary,
      liveSessionStats,
      sessionSummary,
      dismissSessionSummary,
    ],
  );

  return (
    <PersistentSessionContext.Provider value={value}>
      {children}
    </PersistentSessionContext.Provider>
  );
};

export function usePersistentSession() {
  const context = useContext(PersistentSessionContext);
  if (!context) {
    throw new Error('usePersistentSession must be used within a PersistentSessionProvider');
  }
  return context;
}

// Helper hook to check if we're on a board route
export function useIsOnBoardRoute() {
  const pathname = usePathname();
  return pathname.startsWith('/b/') || BOARD_NAMES.some((board) => pathname.startsWith(`/${board}/`));
}
