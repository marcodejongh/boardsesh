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
  QueueEvent,
  SessionEvent,
  QueueState,
} from '@boardsesh/shared-schema';
import { ClimbQueueItem as LocalClimbQueueItem } from '../queue-control/types';

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
    tickedBy: item.tickedBy,
    suggested: item.suggested,
  };
}

export interface UseQueueSessionOptions {
  daemonUrl: string;
  sessionId: string;
  boardPath: string;
  username?: string;
  onQueueEvent?: (event: QueueEvent) => void;
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
  daemonUrl,
  sessionId,
  boardPath,
  username,
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

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Connect and join session
  useEffect(() => {
    if (!daemonUrl || !sessionId || !boardPath) {
      return;
    }

    let mounted = true;
    let graphqlClient: Client | null = null;

    async function connect() {
      setIsConnecting(true);
      setError(null);

      try {
        // Create the GraphQL client
        graphqlClient = createGraphQLClient(daemonUrl);
        if (!mounted) return;
        setClient(graphqlClient);

        // Join the session
        const response = await execute<{ joinSession: Session }>(graphqlClient, {
          query: JOIN_SESSION,
          variables: { sessionId, boardPath, username },
        });

        if (!mounted) return;

        const sessionData = response.joinSession;
        setSession(sessionData);
        setHasConnected(true);
        setIsConnecting(false);

        // Send initial queue state via callback
        if (onQueueEvent && sessionData.queueState) {
          onQueueEvent({
            __typename: 'FullSync',
            state: sessionData.queueState,
          });
        }

        // Subscribe to queue updates
        queueUnsubscribeRef.current = subscribe<{ queueUpdates: QueueEvent }>(
          graphqlClient,
          {
            query: QUEUE_UPDATES,
            variables: { sessionId },
          },
          {
            next: (data) => {
              if (data.queueUpdates && onQueueEvent) {
                onQueueEvent(data.queueUpdates);
              }
            },
            error: (err) => {
              console.error('Queue subscription error:', err);
              if (mounted) {
                setError(err instanceof Error ? err : new Error(String(err)));
              }
            },
            complete: () => {
              console.log('Queue subscription completed');
            },
          },
        );

        // Subscribe to session updates
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
              if (onSessionEvent) {
                onSessionEvent(event);
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
                    // Session ended - could navigate or show message
                    console.log('Session ended:', event.reason);
                    return prev;
                  default:
                    return prev;
                }
              });
            },
            error: (err) => {
              console.error('Session subscription error:', err);
            },
            complete: () => {
              console.log('Session subscription completed');
            },
          },
        );
      } catch (err) {
        console.error('Failed to connect to session:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsConnecting(false);
        }
      }
    }

    connect();

    // Cleanup
    return () => {
      mounted = false;

      // Unsubscribe from subscriptions
      queueUnsubscribeRef.current?.();
      sessionUnsubscribeRef.current?.();

      // Leave session and dispose client
      if (graphqlClient && sessionRef.current) {
        execute(graphqlClient, { query: LEAVE_SESSION }).catch(console.error);
        graphqlClient.dispose();
      }

      setClient(null);
      setSession(null);
      setIsConnecting(false);
    };
  }, [daemonUrl, sessionId, boardPath, username, onQueueEvent, onSessionEvent]);

  // Mutation functions
  const addQueueItem = useCallback(
    async (item: LocalClimbQueueItem, position?: number) => {
      if (!client) throw new Error('Not connected');
      await execute(client, {
        query: ADD_QUEUE_ITEM,
        variables: { item: toClimbQueueItemInput(item), position },
      });
    },
    [client],
  );

  const removeQueueItem = useCallback(
    async (uuid: string) => {
      if (!client) throw new Error('Not connected');
      await execute(client, {
        query: REMOVE_QUEUE_ITEM,
        variables: { uuid },
      });
    },
    [client],
  );

  const setCurrentClimb = useCallback(
    async (item: LocalClimbQueueItem | null, shouldAddToQueue?: boolean) => {
      if (!client) throw new Error('Not connected');
      await execute(client, {
        query: SET_CURRENT_CLIMB,
        variables: {
          item: item ? toClimbQueueItemInput(item) : null,
          shouldAddToQueue,
        },
      });
    },
    [client],
  );

  const mirrorCurrentClimb = useCallback(
    async (mirrored: boolean) => {
      if (!client) throw new Error('Not connected');
      await execute(client, {
        query: MIRROR_CURRENT_CLIMB,
        variables: { mirrored },
      });
    },
    [client],
  );

  const setQueueMutation = useCallback(
    async (queue: LocalClimbQueueItem[], currentClimbQueueItem?: LocalClimbQueueItem | null) => {
      if (!client) throw new Error('Not connected');
      await execute(client, {
        query: SET_QUEUE,
        variables: {
          queue: queue.map(toClimbQueueItemInput),
          currentClimbQueueItem: currentClimbQueueItem ? toClimbQueueItemInput(currentClimbQueueItem) : null,
        },
      });
    },
    [client],
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
