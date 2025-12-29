'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation'; // Used by useIsOnBoardRoute
import { createGraphQLClient, execute, subscribe, Client } from '../graphql-queue/graphql-client';
import {
  JOIN_SESSION,
  LEAVE_SESSION,
  ADD_QUEUE_ITEM,
  REMOVE_QUEUE_ITEM,
  SET_CURRENT_CLIMB,
  MIRROR_CURRENT_CLIMB,
  SET_QUEUE,
  SESSION_UPDATES,
  QUEUE_UPDATES,
  SessionUser,
  ClientQueueEvent,
  SessionEvent,
  QueueState,
} from '@boardsesh/shared-schema';
import { ClimbQueueItem as LocalClimbQueueItem } from '../queue-control/types';
import { BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { usePartyProfile } from '../party-manager/party-profile-context';

const DEBUG = process.env.NODE_ENV === 'development';

// Default backend URL from environment variable
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || null;

// Board names to check if we're on a board route
const BOARD_NAMES = ['kilter', 'tension'];

// Session type matching the GraphQL response
export interface Session {
  id: string;
  boardPath: string;
  users: SessionUser[];
  queueState: QueueState;
  isLeader: boolean;
  clientId: string;
}

// Active session info stored at root level
export interface ActiveSessionInfo {
  sessionId: string;
  boardPath: string;
  boardDetails: BoardDetails;
  parsedParams: ParsedBoardRouteParameters;
  // Initial queue to set when creating a new session
  initialQueue?: LocalClimbQueueItem[];
  initialCurrentClimbQueueItem?: LocalClimbQueueItem | null;
}

// Convert local ClimbQueueItem to GraphQL input format
function toClimbQueueItemInput(item: LocalClimbQueueItem) {
  return {
    uuid: item.uuid,
    climb: {
      uuid: item.climb.uuid,
      setter_username: item.climb.setter_username,
      name: item.climb.name,
      description: item.climb.description || '',
      frames: item.climb.frames,
      angle: item.climb.angle,
      ascensionist_count: item.climb.ascensionist_count,
      difficulty: item.climb.difficulty,
      quality_average: item.climb.quality_average,
      stars: item.climb.stars,
      difficulty_error: item.climb.difficulty_error,
      litUpHoldsMap: item.climb.litUpHoldsMap,
      mirrored: item.climb.mirrored,
      benchmark_difficulty: item.climb.benchmark_difficulty,
      userAscents: item.climb.userAscents,
      userAttempts: item.climb.userAttempts,
    },
    addedBy: item.addedBy,
    addedByUser: item.addedByUser
      ? {
          id: item.addedByUser.id,
          username: item.addedByUser.username,
          avatarUrl: item.addedByUser.avatarUrl,
        }
      : undefined,
    tickedBy: item.tickedBy,
    suggested: item.suggested,
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
  setLocalQueueState: (
    queue: LocalClimbQueueItem[],
    currentItem: LocalClimbQueueItem | null,
    boardPath: string,
    boardDetails: BoardDetails,
    options?: { force?: boolean },
  ) => void;
  clearLocalQueue: () => void;

  // Session lifecycle
  activateSession: (info: ActiveSessionInfo) => void;
  deactivateSession: () => void;

  // Mutation functions
  addQueueItem: (item: LocalClimbQueueItem, position?: number) => Promise<void>;
  removeQueueItem: (uuid: string) => Promise<void>;
  setCurrentClimb: (item: LocalClimbQueueItem | null, shouldAddToQueue?: boolean) => Promise<void>;
  mirrorCurrentClimb: (mirrored: boolean) => Promise<void>;
  setQueue: (queue: LocalClimbQueueItem[], currentClimbQueueItem?: LocalClimbQueueItem | null) => Promise<void>;

  // Event subscription for board-level components
  subscribeToQueueEvents: (callback: (event: ClientQueueEvent) => void) => () => void;
  subscribeToSessionEvents: (callback: (event: SessionEvent) => void) => () => void;
}

const PersistentSessionContext = createContext<PersistentSessionContextType | undefined>(undefined);

export const PersistentSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token: wsAuthToken, isLoading: isAuthLoading } = useWsAuthToken();
  const { username, avatarUrl } = usePartyProfile();

  // Use refs for values that shouldn't trigger reconnection
  // These values are used during connection but changes shouldn't cause reconnect
  const wsAuthTokenRef = useRef(wsAuthToken);
  const usernameRef = useRef(username);
  const avatarUrlRef = useRef(avatarUrl);

  // Keep refs in sync with current values
  useEffect(() => {
    wsAuthTokenRef.current = wsAuthToken;
  }, [wsAuthToken]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    avatarUrlRef.current = avatarUrl;
  }, [avatarUrl]);

  // Active session info
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);

  // Connection state
  const [client, setClient] = useState<Client | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Queue state synced from backend
  const [currentClimbQueueItem, setCurrentClimbQueueItem] = useState<LocalClimbQueueItem | null>(null);
  const [queue, setQueueState] = useState<LocalClimbQueueItem[]>([]);

  // Local queue state (persists without WebSocket session)
  const [localQueue, setLocalQueue] = useState<LocalClimbQueueItem[]>([]);
  const [localCurrentClimbQueueItem, setLocalCurrentClimbQueueItem] = useState<LocalClimbQueueItem | null>(null);
  const [localBoardPath, setLocalBoardPath] = useState<string | null>(null);
  const [localBoardDetails, setLocalBoardDetails] = useState<BoardDetails | null>(null);

  // Refs for cleanup and callbacks
  const queueUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isReconnectingRef = useRef(false);
  const activeSessionRef = useRef<ActiveSessionInfo | null>(null);
  const mountedRef = useRef(false);

  // Event subscribers
  const queueEventSubscribersRef = useRef<Set<(event: ClientQueueEvent) => void>>(new Set());
  const sessionEventSubscribersRef = useRef<Set<(event: SessionEvent) => void>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Notify queue event subscribers
  const notifyQueueSubscribers = useCallback((event: ClientQueueEvent) => {
    queueEventSubscribersRef.current.forEach((callback) => callback(event));
  }, []);

  // Notify session event subscribers
  const notifySessionSubscribers = useCallback((event: SessionEvent) => {
    sessionEventSubscribersRef.current.forEach((callback) => callback(event));
  }, []);

  // Handle queue events internally
  const handleQueueEvent = useCallback((event: ClientQueueEvent) => {
    switch (event.__typename) {
      case 'FullSync':
        setQueueState(event.state.queue as LocalClimbQueueItem[]);
        setCurrentClimbQueueItem(event.state.currentClimbQueueItem as LocalClimbQueueItem | null);
        break;
      case 'QueueItemAdded':
        setQueueState((prev) => {
          const newQueue = [...prev];
          if (event.position !== undefined && event.position >= 0) {
            newQueue.splice(event.position, 0, event.addedItem as LocalClimbQueueItem);
          } else {
            newQueue.push(event.addedItem as LocalClimbQueueItem);
          }
          return newQueue;
        });
        break;
      case 'QueueItemRemoved':
        setQueueState((prev) => prev.filter((item) => item.uuid !== event.uuid));
        break;
      case 'QueueReordered':
        setQueueState((prev) => {
          const newQueue = [...prev];
          const [item] = newQueue.splice(event.oldIndex, 1);
          newQueue.splice(event.newIndex, 0, item);
          return newQueue;
        });
        break;
      case 'CurrentClimbChanged':
        setCurrentClimbQueueItem(event.currentItem as LocalClimbQueueItem | null);
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
        break;
    }

    // Notify external subscribers
    notifyQueueSubscribers(event);
  }, [notifyQueueSubscribers]);

  // Handle session events internally
  const handleSessionEvent = useCallback((event: SessionEvent) => {
    setSession((prev) => {
      if (!prev) return prev;

      switch (event.__typename) {
        case 'UserJoined':
          return {
            ...prev,
            users: [...prev.users, event.user],
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
          return prev;
        default:
          return prev;
      }
    });

    // Notify external subscribers
    notifySessionSubscribers(event);
  }, [notifySessionSubscribers]);

  // Connect to session when activeSession changes
  useEffect(() => {
    if (!activeSession) {
      if (DEBUG) console.log('[PersistentSession] No active session, skipping connection');
      return;
    }

    // Wait for auth to finish loading before connecting
    // This prevents creating duplicate connections when token loads async
    if (isAuthLoading) {
      if (DEBUG) console.log('[PersistentSession] Waiting for auth to load...');
      return;
    }

    const { sessionId, boardPath } = activeSession;
    const backendUrl = DEFAULT_BACKEND_URL;

    if (!backendUrl) {
      if (DEBUG) console.log('[PersistentSession] No backend URL configured');
      return;
    }

    // Use ref for mounted flag so reconnect callback can safely check current state
    mountedRef.current = true;
    let graphqlClient: Client | null = null;

    async function joinSession(clientToUse: Client, isInitialConnection = false): Promise<Session | null> {
      if (DEBUG) console.log('[PersistentSession] Calling joinSession mutation...', { isInitialConnection, hasInitialQueue: !!(activeSession.initialQueue?.length) });
      try {
        // Only pass initial queue on first connection (not reconnects)
        const initialQueue = isInitialConnection && activeSession.initialQueue?.length
          ? activeSession.initialQueue.map(toClimbQueueItemInput)
          : undefined;
        const initialCurrentClimbQueueItem = isInitialConnection && activeSession.initialCurrentClimbQueueItem
          ? toClimbQueueItemInput(activeSession.initialCurrentClimbQueueItem)
          : undefined;

        const response = await execute<{ joinSession: Session }>(clientToUse, {
          query: JOIN_SESSION,
          // Use refs for values that may change but shouldn't trigger reconnection
          variables: {
            sessionId,
            boardPath,
            username: usernameRef.current,
            avatarUrl: avatarUrlRef.current,
            initialQueue,
            initialCurrentClimbQueueItem,
          },
        });
        return response.joinSession;
      } catch (err) {
        console.error('[PersistentSession] JoinSession failed:', err);
        return null;
      }
    }

    async function handleReconnect() {
      // Use ref to safely check if component is still mounted
      if (!mountedRef.current || !graphqlClient) return;
      if (isReconnectingRef.current) {
        if (DEBUG) console.log('[PersistentSession] Reconnection already in progress');
        return;
      }

      isReconnectingRef.current = true;
      try {
        if (DEBUG) console.log('[PersistentSession] Reconnecting...');
        const sessionData = await joinSession(graphqlClient);
        // Double-check mounted state after async operation
        if (sessionData && mountedRef.current) {
          setSession(sessionData);
          if (DEBUG) console.log('[PersistentSession] Reconnected, clientId:', sessionData.clientId);
        }
      } finally {
        isReconnectingRef.current = false;
      }
    }

    async function connect() {
      if (DEBUG) console.log('[PersistentSession] Connecting to session:', sessionId);
      setIsConnecting(true);
      setError(null);

      try {
        graphqlClient = createGraphQLClient({
          url: backendUrl!,
          // Use ref for auth token - it's set once auth loading completes
          authToken: wsAuthTokenRef.current,
          onReconnect: handleReconnect,
        });

        if (!mountedRef.current) {
          graphqlClient.dispose();
          return;
        }

        setClient(graphqlClient);

        const sessionData = await joinSession(graphqlClient, true); // true = initial connection, pass initial queue

        if (!mountedRef.current) {
          graphqlClient.dispose();
          return;
        }

        if (!sessionData) {
          throw new Error('Failed to join session');
        }

        if (DEBUG) console.log('[PersistentSession] Joined session, clientId:', sessionData.clientId);

        setSession(sessionData);
        setHasConnected(true);
        setIsConnecting(false);

        // Send initial queue state
        if (sessionData.queueState) {
          handleQueueEvent({
            __typename: 'FullSync',
            state: sessionData.queueState,
          });
        }

        // Subscribe to queue updates
        queueUnsubscribeRef.current = subscribe<{ queueUpdates: ClientQueueEvent }>(
          graphqlClient,
          { query: QUEUE_UPDATES, variables: { sessionId } },
          {
            next: (data) => {
              if (data.queueUpdates) {
                handleQueueEvent(data.queueUpdates);
              }
            },
            error: (err) => {
              console.error('[PersistentSession] Queue subscription error:', err);
              // Clean up ref on error
              queueUnsubscribeRef.current = null;
              if (mountedRef.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
              }
            },
            complete: () => {
              if (DEBUG) console.log('[PersistentSession] Queue subscription completed');
              // Clean up ref on complete
              queueUnsubscribeRef.current = null;
            },
          },
        );

        // Subscribe to session updates
        sessionUnsubscribeRef.current = subscribe<{ sessionUpdates: SessionEvent }>(
          graphqlClient,
          { query: SESSION_UPDATES, variables: { sessionId } },
          {
            next: (data) => {
              if (data.sessionUpdates) {
                handleSessionEvent(data.sessionUpdates);
              }
            },
            error: (err) => {
              console.error('[PersistentSession] Session subscription error:', err);
              // Clean up ref on error
              sessionUnsubscribeRef.current = null;
            },
            complete: () => {
              if (DEBUG) console.log('[PersistentSession] Session subscription completed');
              // Clean up ref on complete
              sessionUnsubscribeRef.current = null;
            },
          },
        );
      } catch (err) {
        console.error('[PersistentSession] Connection failed:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsConnecting(false);
        }
        if (graphqlClient) {
          graphqlClient.dispose();
        }
      }
    }

    connect();

    return () => {
      if (DEBUG) console.log('[PersistentSession] Cleaning up connection');
      // Set mounted ref to false FIRST to prevent any reconnect callbacks from executing
      mountedRef.current = false;

      // Clean up subscriptions
      if (queueUnsubscribeRef.current) {
        queueUnsubscribeRef.current();
        queueUnsubscribeRef.current = null;
      }
      if (sessionUnsubscribeRef.current) {
        sessionUnsubscribeRef.current();
        sessionUnsubscribeRef.current = null;
      }

      if (graphqlClient) {
        if (sessionRef.current) {
          execute(graphqlClient, { query: LEAVE_SESSION }).catch(() => {});
        }
        graphqlClient.dispose();
      }

      setClient(null);
      setSession(null);
      setHasConnected(false);
      setIsConnecting(false);
    };
  // Note: username, avatarUrl, wsAuthToken are accessed via refs to prevent reconnection on changes
  }, [activeSession, isAuthLoading, handleQueueEvent, handleSessionEvent]);

  // Session lifecycle functions
  const activateSession = useCallback((info: ActiveSessionInfo) => {
    setActiveSession((prev) => {
      // Skip update if sessionId and boardPath are the same - prevents duplicate connections
      // when only object references change (e.g., search filter changes cause server re-render)
      if (prev?.sessionId === info.sessionId && prev?.boardPath === info.boardPath) {
        return prev;
      }
      if (DEBUG) console.log('[PersistentSession] Activating session:', info.sessionId);
      return info;
    });
  }, []);

  const deactivateSession = useCallback(() => {
    if (DEBUG) console.log('[PersistentSession] Deactivating session');
    setActiveSession(null);
    // Note: Don't clear queue state here. The queue should persist
    // when leaving a session. QueueContext handles saving to local state.
  }, []);

  // Local queue management functions
  const setLocalQueueState = useCallback(
    (
      newQueue: LocalClimbQueueItem[],
      newCurrentItem: LocalClimbQueueItem | null,
      boardPath: string,
      boardDetails: BoardDetails,
      options?: { force?: boolean },
    ) => {
      // Don't store local queue if party mode is active (unless force is true)
      // Force is used when leaving a party session to preserve the queue
      if (activeSession && !options?.force) return;

      setLocalQueue(newQueue);
      setLocalCurrentClimbQueueItem(newCurrentItem);
      setLocalBoardPath(boardPath);
      setLocalBoardDetails(boardDetails);
    },
    [activeSession],
  );

  const clearLocalQueue = useCallback(() => {
    if (DEBUG) console.log('[PersistentSession] Clearing local queue');
    setLocalQueue([]);
    setLocalCurrentClimbQueueItem(null);
    setLocalBoardPath(null);
    setLocalBoardDetails(null);
  }, []);

  // Mutation functions
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
    async (item: LocalClimbQueueItem | null, shouldAddToQueue?: boolean) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: SET_CURRENT_CLIMB,
        variables: {
          item: item ? toClimbQueueItemInput(item) : null,
          shouldAddToQueue,
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
  const subscribeToQueueEvents = useCallback((callback: (event: ClientQueueEvent) => void) => {
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
      setLocalQueueState,
      clearLocalQueue,
      activateSession,
      deactivateSession,
      addQueueItem,
      removeQueueItem,
      setCurrentClimb: setCurrentClimbMutation,
      mirrorCurrentClimb: mirrorCurrentClimbMutation,
      setQueue: setQueueMutation,
      subscribeToQueueEvents,
      subscribeToSessionEvents,
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
      setLocalQueueState,
      clearLocalQueue,
      activateSession,
      deactivateSession,
      addQueueItem,
      removeQueueItem,
      setCurrentClimbMutation,
      mirrorCurrentClimbMutation,
      setQueueMutation,
      subscribeToQueueEvents,
      subscribeToSessionEvents,
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
  return BOARD_NAMES.some((board) => pathname.startsWith(`/${board}/`));
}
