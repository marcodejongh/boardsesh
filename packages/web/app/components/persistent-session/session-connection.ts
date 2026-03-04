/**
 * SessionConnection encapsulates all WebSocket connection orchestration:
 * - graphql-ws client lifecycle (create, connect, dispose)
 * - Session join/leave mutations
 * - Queue and session subscription setup/teardown
 * - Reconnection with delta sync / full sync fallback
 * - Transient retry logic with exponential backoff
 *
 * This class replaces the ~400-line useEffect in persistent-session-context.tsx.
 * It emits events via callbacks rather than calling React setState directly,
 * making it independently testable and free from stale closure issues.
 */

import { createGraphQLClient, execute, subscribe, Client } from '../graphql-queue/graphql-client';
import {
  INITIAL_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  BACKOFF_MULTIPLIER,
  MAX_TRANSIENT_RETRIES,
} from '../graphql-queue/retry-constants';
import {
  JOIN_SESSION,
  LEAVE_SESSION,
  QUEUE_UPDATES,
  SESSION_UPDATES,
  EVENTS_REPLAY,
  type SubscriptionQueueEvent,
  type SessionEvent,
  type QueueEvent,
  type EventsReplayResponse,
} from '@boardsesh/shared-schema';
import { ConnectionStateMachine, type ConnectionFlags } from './connection-state-machine';
import { TransientJoinError } from './errors';
import { computeQueueStateHash } from '@/app/utils/hash';

const DEBUG = process.env.NODE_ENV === 'development';

/** Session data returned from joinSession mutation */
export interface SessionData {
  id: string;
  name: string | null;
  boardPath: string;
  users: Array<{
    id: string;
    username: string;
    isLeader: boolean;
    avatarUrl?: string;
  }>;
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

/** Initial queue data to seed a new session */
export interface InitialQueueData {
  sessionId: string;
  queue: Array<{ uuid: string; [key: string]: unknown }>;
  currentClimb: { uuid: string; [key: string]: unknown } | null;
  sessionName?: string;
}

/** Callbacks for the React layer to receive events */
export interface SessionConnectionCallbacks {
  onConnectionFlagsChange: (flags: ConnectionFlags) => void;
  onSessionJoined: (session: SessionData) => void;
  onSessionCleared: () => void;
  onQueueEvent: (event: SubscriptionQueueEvent) => void;
  onSessionEvent: (event: SessionEvent) => void;
  onError: (error: Error) => void;
  onClientCreated: (client: Client) => void;
  /** Called to read current queue state for hash verification during reconnect */
  getQueueState: () => { queue: Array<{ uuid: string }>, currentItemUuid: string | null };
  /** Called to read current sequence number for delta sync */
  getLastSequence: () => number | null;
  /** Called to convert queue items to GraphQL input format */
  toClimbQueueItemInput: (item: unknown) => unknown;
  /** Called to get current pending initial queue data */
  getPendingInitialQueue: () => InitialQueueData | null;
  /** Called after initial queue is consumed */
  clearPendingInitialQueue: () => void;
}

/** Configuration for creating a SessionConnection */
export interface SessionConnectionConfig {
  backendUrl: string;
  sessionId: string;
  boardPath: string;
  sessionName?: string;
  callbacks: SessionConnectionCallbacks;
}

/**
 * Transform QueueEvent (from eventsReplay) to SubscriptionQueueEvent format.
 * eventsReplay returns server format with `item`, but handlers expect subscription
 * format with `addedItem`/`currentItem`.
 */
function transformToSubscriptionEvent(event: QueueEvent): SubscriptionQueueEvent {
  switch (event.__typename) {
    case 'QueueItemAdded':
      return {
        __typename: 'QueueItemAdded',
        sequence: event.sequence,
        addedItem: event.item,
        position: event.position,
      };
    case 'CurrentClimbChanged':
      return {
        __typename: 'CurrentClimbChanged',
        sequence: event.sequence,
        currentItem: event.item,
        clientId: event.clientId,
        correlationId: event.correlationId,
      };
    default:
      return event as SubscriptionQueueEvent;
  }
}

export class SessionConnection {
  private readonly config: SessionConnectionConfig;
  private readonly stateMachine = new ConnectionStateMachine();

  private client: Client | null = null;
  private queueUnsubscribe: (() => void) | null = null;
  private sessionUnsubscribe: (() => void) | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private transientRetryCount = 0;
  private disposed = false;

  // Mutable credentials that can be updated without reconnecting
  private authToken: string | null = null;
  private username: string | undefined = '';
  private avatarUrl: string | undefined;

  constructor(config: SessionConnectionConfig) {
    this.config = config;

    // Wire up state machine to emit flag changes
    this.stateMachine.onStateChange(() => {
      if (!this.disposed) {
        this.config.callbacks.onConnectionFlagsChange(this.stateMachine.flags);
      }
    });
  }

  /** Update auth credentials without triggering reconnect */
  updateCredentials(authToken: string | null, username: string | undefined, avatarUrl: string | undefined): void {
    this.authToken = authToken;
    this.username = username;
    this.avatarUrl = avatarUrl;
  }

  /** Get the current connection state flags */
  get flags(): ConnectionFlags {
    return this.stateMachine.flags;
  }

  /** Get the underlying graphql-ws client (for mutations) */
  get graphqlClient(): Client | null {
    return this.client;
  }

  /**
   * Start the connection. Creates the graphql-ws client, joins the session,
   * and sets up subscriptions.
   */
  async connect(): Promise<void> {
    if (this.disposed) return;

    // Prevent duplicate connections
    if (this.stateMachine.state === 'CONNECTING') {
      if (DEBUG) console.log('[SessionConnection] Connection already in progress, skipping');
      return;
    }

    this.stateMachine.transition('CONNECTING');

    const { backendUrl, sessionId, callbacks } = this.config;

    try {
      this.client = createGraphQLClient({
        url: backendUrl,
        authToken: this.authToken,
        onReconnect: () => this.handleReconnect(),
        onConnectionStateChange: (connected, isReconnect) => {
          if (this.disposed) return;
          if (connected && isReconnect) {
            // On reconnection, don't transition to CONNECTED yet.
            // handleReconnect will do it after resync completes.
            return;
          }
          if (!connected && this.stateMachine.state === 'CONNECTED') {
            this.stateMachine.transition('RECONNECTING');
          }
        },
      });

      if (this.disposed) {
        this.client.dispose();
        this.client = null;
        return;
      }

      callbacks.onClientCreated(this.client);

      const sessionData = await this.joinSession();

      if (this.disposed) {
        this.client?.dispose();
        this.client = null;
        return;
      }

      if (!sessionData) {
        throw new TransientJoinError('JoinSession returned no payload');
      }

      if (DEBUG) console.log('[SessionConnection] Joined session, clientId:', sessionData.clientId);

      this.transientRetryCount = 0;
      this.stateMachine.transition('CONNECTED');
      callbacks.onSessionJoined(sessionData);

      // Send initial queue state via FullSync
      if (sessionData.queueState) {
        callbacks.onQueueEvent({
          __typename: 'FullSync',
          sequence: sessionData.queueState.sequence,
          state: sessionData.queueState,
        } as SubscriptionQueueEvent);
      }

      this.setupSubscriptions();
    } catch (err) {
      if (this.disposed) return;

      console.error('[SessionConnection] Connection failed:', err);

      const error = err instanceof Error ? err : new Error(String(err));
      callbacks.onError(error);

      if (err instanceof TransientJoinError) {
        this.transientRetryCount++;
        if (this.transientRetryCount > MAX_TRANSIENT_RETRIES) {
          console.warn(
            `[SessionConnection] Exhausted ${MAX_TRANSIENT_RETRIES} transient retries`,
          );
          this.transientRetryCount = 0;
          this.stateMachine.transition('FAILED');
          callbacks.onSessionCleared();
        } else {
          this.scheduleRetry();
        }
      } else {
        // Definitive failure
        this.stateMachine.transition('FAILED');
        callbacks.onSessionCleared();
      }

      // Dispose client on failure
      if (this.client) {
        this.client.dispose();
        this.client = null;
      }
    }
  }

  /**
   * Handle WebSocket reconnection: rejoin session, delta sync or full sync.
   */
  private async handleReconnect(): Promise<void> {
    if (this.disposed || !this.client) return;

    // Prevent concurrent reconnections
    if (this.stateMachine.state === 'RECONNECTING') {
      // Already reconnecting from the state machine's perspective;
      // but if called via onReconnect callback, we need to proceed with resync
    }

    const { sessionId, callbacks } = this.config;

    try {
      if (DEBUG) console.log('[SessionConnection] Reconnecting...');

      const lastSeq = callbacks.getLastSequence();
      const sessionData = await this.joinSession();

      if (this.disposed || !sessionData) return;

      // Calculate sequence gap
      const currentSeq = sessionData.queueState.sequence;
      const gap = lastSeq !== null ? currentSeq - lastSeq : 0;

      if (DEBUG) console.log(`[SessionConnection] Reconnected. Last seq: ${lastSeq}, Current seq: ${currentSeq}, Gap: ${gap}`);

      if (gap > 0 && gap <= 100 && lastSeq !== null) {
        await this.attemptDeltaSync(lastSeq, sessionData);
      } else if (gap > 100) {
        if (DEBUG) console.log(`[SessionConnection] Gap too large (${gap}), using full sync`);
        this.applyFullSync(sessionData);
      } else if (lastSeq === null) {
        if (DEBUG) console.log('[SessionConnection] First connection, applying initial state');
        this.applyFullSync(sessionData);
      } else if (gap === 0) {
        this.verifyHashAndSync(sessionData);
      }

      callbacks.onSessionJoined(sessionData);
      if (DEBUG) console.log('[SessionConnection] Reconnection complete, clientId:', sessionData.clientId);
    } finally {
      // Mark as connected now that resync is complete
      if (!this.disposed) {
        this.stateMachine.transition('CONNECTED');
      }
    }
  }

  /**
   * Trigger a manual resync (e.g. from corruption detection or visibility change).
   */
  triggerResync(): void {
    if (this.disposed || !this.client) return;
    if (this.stateMachine.state !== 'CONNECTED' && this.stateMachine.state !== 'RECONNECTING') return;

    if (DEBUG) console.log('[SessionConnection] Manual resync triggered');
    this.handleReconnect();
  }

  /**
   * Execute a GraphQL mutation on the connected client.
   */
  async executeMutation<TData = unknown>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    if (!this.client) throw new Error('Not connected to session');
    return execute<TData>(this.client, { query, variables });
  }

  /**
   * Disconnect and clean up all resources.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (DEBUG) console.log('[SessionConnection] Disposing');

    // Clear retry timer
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Unsubscribe from subscriptions
    this.queueUnsubscribe?.();
    this.queueUnsubscribe = null;
    this.sessionUnsubscribe?.();
    this.sessionUnsubscribe = null;

    // Dispose client — use microtask to let pending operations complete
    const clientToCleanup = this.client;
    this.client = null;

    if (clientToCleanup) {
      Promise.resolve().then(() => {
        execute(clientToCleanup, { query: LEAVE_SESSION }).catch(() => {});
        clientToCleanup.dispose();
      });
    }

    this.stateMachine.reset();
    this.stateMachine.dispose();
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async joinSession(): Promise<SessionData | null> {
    if (!this.client) return null;

    if (DEBUG) console.log('[SessionConnection] Calling joinSession mutation...');

    try {
      const { sessionId, boardPath, sessionName, callbacks } = this.config;

      const initialQueueData = callbacks.getPendingInitialQueue();
      const isForThisSession = initialQueueData?.sessionId === sessionId;
      const queueData = isForThisSession ? initialQueueData : null;

      if (DEBUG && queueData) {
        console.log('[SessionConnection] Sending initial queue with', queueData.queue.length, 'items');
      }

      const effectiveSessionName = sessionName || queueData?.sessionName;
      const variables: Record<string, unknown> = {
        sessionId,
        boardPath,
        username: this.username,
        avatarUrl: this.avatarUrl,
      };

      if (queueData) {
        variables.initialQueue = queueData.queue.map(callbacks.toClimbQueueItemInput);
        variables.initialCurrentClimb = queueData.currentClimb
          ? callbacks.toClimbQueueItemInput(queueData.currentClimb)
          : null;
      }

      if (effectiveSessionName) {
        variables.sessionName = effectiveSessionName;
      }

      const response = await execute<{ joinSession: SessionData }>(this.client, {
        query: JOIN_SESSION,
        variables,
      });

      const joinedSession = response?.joinSession;
      if (!joinedSession) {
        console.error('[SessionConnection] JoinSession returned no session payload');
        return null;
      }

      // Clear pending queue only after confirmed successful join payload
      if (queueData) {
        callbacks.clearPendingInitialQueue();
      }

      return joinedSession;
    } catch (err) {
      console.error('[SessionConnection] JoinSession failed:', err);
      return null;
    }
  }

  private setupSubscriptions(): void {
    if (!this.client || this.disposed) return;

    const { sessionId, callbacks } = this.config;

    // Subscribe to queue updates
    this.queueUnsubscribe = subscribe<{ queueUpdates: SubscriptionQueueEvent }>(
      this.client,
      { query: QUEUE_UPDATES, variables: { sessionId } },
      {
        next: (data) => {
          if (data.queueUpdates) {
            callbacks.onQueueEvent(data.queueUpdates);
          }
        },
        error: (err) => {
          console.error('[SessionConnection] Queue subscription error:', err);
          this.queueUnsubscribe = null;
          if (!this.disposed) {
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
          }
        },
        complete: () => {
          if (DEBUG) console.log('[SessionConnection] Queue subscription completed');
          this.queueUnsubscribe = null;
        },
      },
    );

    // Subscribe to session updates
    this.sessionUnsubscribe = subscribe<{ sessionUpdates: SessionEvent }>(
      this.client,
      { query: SESSION_UPDATES, variables: { sessionId } },
      {
        next: (data) => {
          if (data.sessionUpdates) {
            callbacks.onSessionEvent(data.sessionUpdates);
          }
        },
        error: (err) => {
          console.error('[SessionConnection] Session subscription error:', err);
          this.sessionUnsubscribe = null;
        },
        complete: () => {
          if (DEBUG) console.log('[SessionConnection] Session subscription completed');
          this.sessionUnsubscribe = null;
        },
      },
    );
  }

  private async attemptDeltaSync(lastSeq: number, sessionData: SessionData): Promise<void> {
    if (!this.client) return;

    const { sessionId, callbacks } = this.config;

    try {
      if (DEBUG) console.log(`[SessionConnection] Attempting delta sync for missed events...`);

      const response = await execute<{ eventsReplay: EventsReplayResponse }>(this.client, {
        query: EVENTS_REPLAY,
        variables: { sessionId, sinceSequence: lastSeq },
      });

      const replay = response?.eventsReplay;
      if (!replay) {
        throw new Error('eventsReplay payload missing');
      }

      if (replay.events.length > 0) {
        if (DEBUG) console.log(`[SessionConnection] Replaying ${replay.events.length} events`);
        replay.events.forEach(event => {
          callbacks.onQueueEvent(transformToSubscriptionEvent(event));
        });
        if (DEBUG) console.log('[SessionConnection] Delta sync completed successfully');
      } else {
        if (DEBUG) console.log('[SessionConnection] No events to replay');
      }
    } catch (err) {
      console.warn('[SessionConnection] Delta sync failed, falling back to full sync:', err);
      this.applyFullSync(sessionData);
    }
  }

  private applyFullSync(sessionData: SessionData): void {
    if (sessionData.queueState) {
      this.config.callbacks.onQueueEvent({
        __typename: 'FullSync',
        sequence: sessionData.queueState.sequence,
        state: sessionData.queueState,
      } as SubscriptionQueueEvent);
    }
  }

  private verifyHashAndSync(sessionData: SessionData): void {
    const { queue, currentItemUuid } = this.config.callbacks.getQueueState();
    const localHash = computeQueueStateHash(queue, currentItemUuid);

    if (localHash !== sessionData.queueState.stateHash) {
      if (DEBUG) console.log('[SessionConnection] Hash mismatch on reconnect despite gap=0, applying full sync');
      this.applyFullSync(sessionData);
    } else {
      if (DEBUG) console.log('[SessionConnection] No missed events, already in sync');
    }
  }

  private scheduleRetry(): void {
    const delay = Math.min(
      INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, this.transientRetryCount - 1),
      MAX_RETRY_DELAY_MS,
    );

    if (DEBUG) {
      console.log(
        `[SessionConnection] Transient retry ${this.transientRetryCount}/${MAX_TRANSIENT_RETRIES} in ${delay}ms`,
      );
    }

    this.retryTimeout = setTimeout(() => {
      if (!this.disposed) {
        this.connect();
      }
    }, delay);
  }
}
