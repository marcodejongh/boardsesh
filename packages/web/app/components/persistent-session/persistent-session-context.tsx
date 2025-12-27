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
const BOARD_NAMES = ['kilter', 'tension', 'decoy'];

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
  const { token: wsAuthToken } = useWsAuthToken();
  const { username, avatarUrl } = usePartyProfile();

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

  // Refs for cleanup and callbacks
  const queueUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isReconnectingRef = useRef(false);
  const activeSessionRef = useRef<ActiveSessionInfo | null>(null);

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

    const { sessionId, boardPath } = activeSession;
    const backendUrl = DEFAULT_BACKEND_URL;

    if (!backendUrl) {
      if (DEBUG) console.log('[PersistentSession] No backend URL configured');
      return;
    }

    let mounted = true;
    let graphqlClient: Client | null = null;

    async function joinSession(clientToUse: Client): Promise<Session | null> {
      if (DEBUG) console.log('[PersistentSession] Calling joinSession mutation...');
      try {
        const response = await execute<{ joinSession: Session }>(clientToUse, {
          query: JOIN_SESSION,
          variables: { sessionId, boardPath, username, avatarUrl },
        });
        return response.joinSession;
      } catch (err) {
        console.error('[PersistentSession] JoinSession failed:', err);
        return null;
      }
    }

    async function handleReconnect() {
      if (!mounted || !graphqlClient) return;
      if (isReconnectingRef.current) {
        if (DEBUG) console.log('[PersistentSession] Reconnection already in progress');
        return;
      }

      isReconnectingRef.current = true;
      try {
        if (DEBUG) console.log('[PersistentSession] Reconnecting...');
        const sessionData = await joinSession(graphqlClient);
        if (sessionData && mounted) {
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
          authToken: wsAuthToken,
          onReconnect: handleReconnect,
        });

        if (!mounted) {
          graphqlClient.dispose();
          return;
        }

        setClient(graphqlClient);

        const sessionData = await joinSession(graphqlClient);

        if (!mounted) {
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
              if (mounted) {
                setError(err instanceof Error ? err : new Error(String(err)));
              }
            },
            complete: () => {
              if (DEBUG) console.log('[PersistentSession] Queue subscription completed');
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
            },
            complete: () => {
              if (DEBUG) console.log('[PersistentSession] Session subscription completed');
            },
          },
        );
      } catch (err) {
        console.error('[PersistentSession] Connection failed:', err);
        if (mounted) {
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
      mounted = false;

      queueUnsubscribeRef.current?.();
      sessionUnsubscribeRef.current?.();

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
  }, [activeSession, username, avatarUrl, wsAuthToken, handleQueueEvent, handleSessionEvent]);

  // Session lifecycle functions
  const activateSession = useCallback((info: ActiveSessionInfo) => {
    if (DEBUG) console.log('[PersistentSession] Activating session:', info.sessionId);
    setActiveSession(info);
  }, []);

  const deactivateSession = useCallback(() => {
    if (DEBUG) console.log('[PersistentSession] Deactivating session');
    setActiveSession(null);
    setQueueState([]);
    setCurrentClimbQueueItem(null);
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
          currentClimbQueueItem: newCurrentClimbQueueItem ? toClimbQueueItemInput(newCurrentClimbQueueItem) : null,
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
