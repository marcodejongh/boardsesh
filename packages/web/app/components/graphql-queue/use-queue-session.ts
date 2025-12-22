'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createGraphQLClient, execute, subscribe, Client } from './graphql-client';
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

const DEBUG = process.env.NODE_ENV === 'development';

// Session type matching the GraphQL response
export interface Session {
  id: string;
  boardPath: string;
  users: SessionUser[];
  queueState: QueueState;
  isLeader: boolean;
  clientId: string;
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

export interface UseQueueSessionOptions {
  backendUrl: string;
  sessionId: string;
  boardPath: string;
  username?: string;
  avatarUrl?: string;
  onQueueEvent?: (event: ClientQueueEvent) => void;
  onSessionEvent?: (event: SessionEvent) => void;
}

export interface UseQueueSessionReturn {
  // Connection state
  isConnecting: boolean;
  hasConnected: boolean;
  error: Error | null;

  // Session info
  session: Session | null;
  clientId: string | null;
  isLeader: boolean;
  users: SessionUser[];

  // Mutation functions
  addQueueItem: (item: LocalClimbQueueItem, position?: number) => Promise<void>;
  removeQueueItem: (uuid: string) => Promise<void>;
  setCurrentClimb: (item: LocalClimbQueueItem | null, shouldAddToQueue?: boolean) => Promise<void>;
  mirrorCurrentClimb: (mirrored: boolean) => Promise<void>;
  setQueue: (queue: LocalClimbQueueItem[], currentClimbQueueItem?: LocalClimbQueueItem | null) => Promise<void>;

  // Disconnect
  disconnect: () => void;
}

export function useQueueSession({
  backendUrl,
  sessionId,
  boardPath,
  username,
  avatarUrl,
  onQueueEvent,
  onSessionEvent,
}: UseQueueSessionOptions): UseQueueSessionReturn {
  const [client, setClient] = useState<Client | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const queueUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);

  // Track current session for mutations
  const sessionRef = useRef<Session | null>(null);

  // Lock to prevent concurrent reconnection attempts
  const isReconnectingRef = useRef(false);

  // Store callbacks in refs to avoid effect re-runs when they change
  const onQueueEventRef = useRef(onQueueEvent);
  const onSessionEventRef = useRef(onSessionEvent);

  // Keep refs in sync with props
  useEffect(() => {
    onQueueEventRef.current = onQueueEvent;
  }, [onQueueEvent]);

  useEffect(() => {
    onSessionEventRef.current = onSessionEvent;
  }, [onSessionEvent]);

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Connect and join session
  useEffect(() => {
    if (!backendUrl || !sessionId || !boardPath) {
      if (DEBUG) console.log('[QueueSession] Missing required params:', { backendUrl: !!backendUrl, sessionId, boardPath });
      return;
    }

    let mounted = true;
    let graphqlClient: Client | null = null;

    // Function to join/rejoin the session
    async function joinSession(client: Client): Promise<Session | null> {
      if (DEBUG) console.log('[QueueSession] Calling joinSession mutation...');
      try {
        const response = await execute<{ joinSession: Session }>(client, {
          query: JOIN_SESSION,
          variables: { sessionId, boardPath, username, avatarUrl },
        });
        return response.joinSession;
      } catch (err) {
        console.error('[QueueSession] JoinSession failed:', err);
        return null;
      }
    }

    // Handle reconnection - re-join the session with lock to prevent concurrent attempts
    async function handleReconnect() {
      if (!mounted || !graphqlClient) return;
      if (isReconnectingRef.current) {
        if (DEBUG) console.log('[QueueSession] Reconnection already in progress, skipping');
        return;
      }

      isReconnectingRef.current = true;
      try {
        if (DEBUG) console.log('[QueueSession] Handling reconnection, re-joining session...');
        const sessionData = await joinSession(graphqlClient);
        if (sessionData && mounted) {
          setSession(sessionData);
          if (DEBUG) console.log('[QueueSession] Re-joined session after reconnect, clientId:', sessionData.clientId);
        }
      } finally {
        isReconnectingRef.current = false;
      }
    }

    async function connect() {
      if (DEBUG) console.log('[QueueSession] Connecting to session:', sessionId);
      setIsConnecting(true);
      setError(null);

      try {
        // Create the GraphQL client with reconnection handler
        graphqlClient = createGraphQLClient(backendUrl, handleReconnect);
        if (!mounted) {
          if (DEBUG) console.log('[QueueSession] Unmounted before client setup, disposing');
          graphqlClient.dispose();
          return;
        }
        setClient(graphqlClient);

        // Join the session FIRST before any subscriptions
        if (DEBUG) console.log('[QueueSession] Calling joinSession mutation...');
        const response = await execute<{ joinSession: Session }>(graphqlClient, {
          query: JOIN_SESSION,
          variables: { sessionId, boardPath, username, avatarUrl },
        });

        if (!mounted) {
          if (DEBUG) console.log('[QueueSession] Unmounted after joinSession, disposing');
          graphqlClient.dispose();
          return;
        }

        const sessionData = response.joinSession;
        if (DEBUG) console.log('[QueueSession] Joined session, clientId:', sessionData.clientId, 'isLeader:', sessionData.isLeader);

        setSession(sessionData);
        setHasConnected(true);
        setIsConnecting(false);

        // Send initial queue state via callback
        if (onQueueEventRef.current && sessionData.queueState) {
          onQueueEventRef.current({
            __typename: 'FullSync',
            state: sessionData.queueState,
          });
        }

        // Subscribe to queue updates AFTER joining session
        if (DEBUG) console.log('[QueueSession] Setting up queue subscription...');
        queueUnsubscribeRef.current = subscribe<{ queueUpdates: ClientQueueEvent }>(
          graphqlClient,
          {
            query: QUEUE_UPDATES,
            variables: { sessionId },
          },
          {
            next: (data) => {
              if (data.queueUpdates && onQueueEventRef.current) {
                if (DEBUG) console.log('[QueueSession] Queue event:', data.queueUpdates.__typename);
                onQueueEventRef.current(data.queueUpdates);
              }
            },
            error: (err) => {
              console.error('[QueueSession] Queue subscription error:', err);
              if (mounted) {
                setError(err instanceof Error ? err : new Error(String(err)));
              }
            },
            complete: () => {
              if (DEBUG) console.log('[QueueSession] Queue subscription completed');
            },
          },
        );

        // Subscribe to session updates
        if (DEBUG) console.log('[QueueSession] Setting up session subscription...');
        sessionUnsubscribeRef.current = subscribe<{ sessionUpdates: SessionEvent }>(
          graphqlClient,
          {
            query: SESSION_UPDATES,
            variables: { sessionId },
          },
          {
            next: (data) => {
              if (!data.sessionUpdates) return;

              const event = data.sessionUpdates;
              if (DEBUG) console.log('[QueueSession] Session event:', event.__typename);
              if (onSessionEventRef.current) {
                onSessionEventRef.current(event);
              }

              // Update local session state
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
                    console.log('[QueueSession] Session ended:', event.reason);
                    return prev;
                  default:
                    return prev;
                }
              });
            },
            error: (err) => {
              console.error('[QueueSession] Session subscription error:', err);
            },
            complete: () => {
              if (DEBUG) console.log('[QueueSession] Session subscription completed');
            },
          },
        );
      } catch (err) {
        console.error('[QueueSession] Failed to connect to session:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsConnecting(false);
        }
        // Dispose the client even on error
        if (graphqlClient) {
          graphqlClient.dispose();
        }
      }
    }

    connect();

    // Cleanup
    return () => {
      if (DEBUG) console.log('[QueueSession] Cleaning up session:', sessionId);
      mounted = false;

      // Unsubscribe from subscriptions
      queueUnsubscribeRef.current?.();
      sessionUnsubscribeRef.current?.();

      // Always dispose the client, even if session wasn't fully established
      if (graphqlClient) {
        // Only try to leave session if we actually joined
        if (sessionRef.current) {
          execute(graphqlClient, { query: LEAVE_SESSION }).catch((err) => {
            if (DEBUG) console.log('[QueueSession] Leave session failed (expected if connection closed):', err);
          });
        }
        graphqlClient.dispose();
      }

      setClient(null);
      setSession(null);
      setIsConnecting(false);
    };
  }, [backendUrl, sessionId, boardPath, username, avatarUrl]); // Removed onQueueEvent and onSessionEvent - using refs instead

  // Mutation functions - must check for session, not just client
  // The client exists before joinSession completes, so we need to wait for session
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

  const setCurrentClimb = useCallback(
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

  const mirrorCurrentClimb = useCallback(
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
    async (queue: LocalClimbQueueItem[], currentClimbQueueItem?: LocalClimbQueueItem | null) => {
      if (!client || !session) throw new Error('Not connected to session');
      await execute(client, {
        query: SET_QUEUE,
        variables: {
          queue: queue.map(toClimbQueueItemInput),
          currentClimbQueueItem: currentClimbQueueItem ? toClimbQueueItemInput(currentClimbQueueItem) : null,
        },
      });
    },
    [client, session],
  );

  const disconnect = useCallback(() => {
    queueUnsubscribeRef.current?.();
    sessionUnsubscribeRef.current?.();
    if (client) {
      execute(client, { query: LEAVE_SESSION }).catch(console.error);
      client.dispose();
    }
    setClient(null);
    setSession(null);
  }, [client]);

  return {
    isConnecting,
    hasConnected,
    error,
    session,
    clientId: session?.clientId ?? null,
    isLeader: session?.isLeader ?? false,
    users: session?.users ?? [],
    addQueueItem,
    removeQueueItem,
    setCurrentClimb,
    mirrorCurrentClimb,
    setQueue: setQueueMutation,
    disconnect,
  };
}
