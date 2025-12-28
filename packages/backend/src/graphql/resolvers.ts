import { makeExecutableSchema } from '@graphql-tools/schema';
import GraphQLJSON from 'graphql-type-json';
import { v4 as uuidv4 } from 'uuid';
import { typeDefs } from '@boardsesh/shared-schema';
import { roomManager, VersionConflictError, type DiscoverableSession } from '../services/room-manager.js';
import { pubsub } from '../pubsub/index.js';
import { updateContext, getContext } from './context.js';
import { checkRateLimit } from '../utils/rate-limiter.js';
import {
  validateInput,
  CreateSessionInputSchema,
  SessionIdSchema,
  BoardPathSchema,
  UsernameSchema,
  AvatarUrlSchema,
  ClimbQueueItemSchema,
  QueueArraySchema,
  LatitudeSchema,
  LongitudeSchema,
  RadiusMetersSchema,
  QueueIndexSchema,
  QueueItemIdSchema,
} from '../validation/schemas.js';
import type {
  ConnectionContext,
  QueueEvent,
  SessionEvent,
  ClimbQueueItem,
  QueueState,
  SessionUser,
} from '@boardsesh/shared-schema';

// Input type for createSession mutation
type CreateSessionInput = {
  boardPath: string;
  latitude: number;
  longitude: number;
  name?: string;
  discoverable: boolean;
};

// Maximum retries for version conflicts
const MAX_RETRIES = 3;

/**
 * Helper to require a session context.
 * Throws if the user is not in a session.
 */
function requireSession(ctx: ConnectionContext): string {
  if (!ctx.sessionId) {
    console.error(`[Auth] requireSession failed: connectionId=${ctx.connectionId}, sessionId=${ctx.sessionId}`);
    throw new Error(`Must be in a session to perform this operation (connectionId: ${ctx.connectionId})`);
  }
  return ctx.sessionId;
}

/**
 * Helper to require authentication.
 * Throws if the user is not authenticated.
 * Used for operations that require a logged-in user (e.g., creating sessions).
 */
function requireAuthenticated(ctx: ConnectionContext): void {
  if (!ctx.isAuthenticated) {
    throw new Error('Authentication required to perform this operation');
  }
}

/**
 * Helper to verify user is a member of the session they're trying to access.
 * Used for subscription authorization.
 *
 * This function includes retry logic to handle race conditions where subscriptions
 * may be authorized before joinSession has completed updating the context.
 * It re-fetches the context from the Map on each retry to get the latest state.
 */
async function requireSessionMember(
  ctx: ConnectionContext,
  sessionId: string,
  maxRetries = 5,
  retryDelayMs = 50
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    // Re-fetch context to get latest state (joinSession may have updated it)
    const latestCtx = getContext(ctx.connectionId);

    if (latestCtx?.sessionId === sessionId) {
      return; // Success - session matches
    }

    if (i < maxRetries - 1) {
      // Wait briefly for joinSession to complete
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  // Final check after all retries
  const finalCtx = getContext(ctx.connectionId);
  if (!finalCtx?.sessionId) {
    console.error(`[Auth] requireSessionMember failed after ${maxRetries} retries: not in any session. connectionId=${ctx.connectionId}, requested=${sessionId}`);
    throw new Error(`Unauthorized: not in any session (connectionId: ${ctx.connectionId}, requested: ${sessionId})`);
  }
  if (finalCtx.sessionId !== sessionId) {
    console.error(`[Auth] requireSessionMember failed: session mismatch. connectionId=${ctx.connectionId}, have=${finalCtx.sessionId}, requested=${sessionId}`);
    throw new Error(`Unauthorized: session mismatch (have: ${finalCtx.sessionId}, requested: ${sessionId})`);
  }
}

/**
 * Apply rate limiting to a connection.
 * @param ctx - Connection context
 * @param limit - Optional custom limit (default: 60 requests per minute)
 */
function applyRateLimit(ctx: ConnectionContext, limit?: number): void {
  checkRateLimit(ctx.connectionId, limit);
}

// Maximum queue size for subscriptions to prevent memory issues with slow clients
const MAX_SUBSCRIPTION_QUEUE_SIZE = 1000;

/**
 * Helper to create an async iterator from a callback-based subscription.
 * Used for GraphQL subscriptions.
 * Includes bounded queue to prevent memory issues with slow clients.
 */
function createAsyncIterator<T>(subscribe: (push: (value: T) => void) => () => void): AsyncIterable<T> {
  const queue: T[] = [];
  const pending: Array<(value: IteratorResult<T>) => void> = [];
  let done = false;
  let unsubscribe: (() => void) | null = null;

  return {
    [Symbol.asyncIterator]() {
      unsubscribe = subscribe((value: T) => {
        if (pending.length > 0) {
          pending.shift()!({ value, done: false });
        } else {
          // Bounded queue: drop oldest events if queue is full
          if (queue.length >= MAX_SUBSCRIPTION_QUEUE_SIZE) {
            queue.shift(); // Drop oldest
            console.warn('[Subscription] Queue full, dropping oldest event');
          }
          queue.push(value);
        }
      });

      return {
        async next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }
          if (done) {
            return { value: undefined as unknown as T, done: true };
          }
          return new Promise((resolve) => pending.push(resolve));
        },
        async return(): Promise<IteratorResult<T>> {
          done = true;
          unsubscribe?.();
          return { value: undefined as unknown as T, done: true };
        },
      };
    },
  };
}

/**
 * Helper to create an async iterator that subscribes IMMEDIATELY (eagerly).
 * Unlike createAsyncIterator which subscribes lazily when iteration starts,
 * this version subscribes right away to avoid missing events during setup.
 * This is critical for preventing race conditions where events could be
 * published between fetching initial state and starting to listen.
 */
function createEagerAsyncIterator<T>(subscribe: (push: (value: T) => void) => () => void): AsyncIterable<T> {
  const queue: T[] = [];
  const pending: Array<(value: IteratorResult<T>) => void> = [];
  let done = false;

  // Subscribe IMMEDIATELY, not lazily when iteration starts
  const unsubscribe = subscribe((value: T) => {
    if (pending.length > 0) {
      pending.shift()!({ value, done: false });
    } else {
      // Bounded queue: drop oldest events if queue is full
      if (queue.length >= MAX_SUBSCRIPTION_QUEUE_SIZE) {
        queue.shift(); // Drop oldest
        console.warn('[Subscription] Queue full, dropping oldest event');
      }
      queue.push(value);
    }
  });

  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }
          if (done) {
            return { value: undefined as unknown as T, done: true };
          }
          return new Promise((resolve) => pending.push(resolve));
        },
        async return(): Promise<IteratorResult<T>> {
          done = true;
          unsubscribe();
          return { value: undefined as unknown as T, done: true };
        },
      };
    },
  };
}

const resolvers = {
  // JSON scalar for litUpHoldsMap
  JSON: GraphQLJSON,

  Query: {
    session: async (_: unknown, { sessionId }: { sessionId: string }) => {
      const users = roomManager.getSessionUsers(sessionId);
      if (users.length === 0) return null;

      const queueState = await roomManager.getQueueState(sessionId);
      const sessionInfo = await roomManager.getSessionById(sessionId);

      return {
        id: sessionId,
        boardPath: sessionInfo?.boardPath || '',
        users,
        queueState,
        // These need connection context, but for Query we return defaults
        isLeader: false,
        clientId: '',
      };
    },

    nearbySessions: async (
      _: unknown,
      { latitude, longitude, radiusMeters }: { latitude: number; longitude: number; radiusMeters?: number }
    ): Promise<DiscoverableSession[]> => {
      // Validate GPS coordinates
      validateInput(LatitudeSchema, latitude, 'latitude');
      validateInput(LongitudeSchema, longitude, 'longitude');
      if (radiusMeters !== undefined) {
        validateInput(RadiusMetersSchema, radiusMeters, 'radiusMeters');
      }
      return roomManager.findNearbySessions(latitude, longitude, radiusMeters || undefined);
    },

    mySessions: async (_: unknown, __: unknown, ctx: ConnectionContext): Promise<DiscoverableSession[]> => {
      // For now, we use userId from context if available
      // In production, this should use authenticated user ID
      if (!ctx.userId) {
        return [];
      }

      const sessions = await roomManager.getUserSessions(ctx.userId);

      // Convert Session to DiscoverableSession format
      return sessions.map((s) => ({
        id: s.id,
        name: s.name,
        boardPath: s.boardPath,
        latitude: s.latitude || 0,
        longitude: s.longitude || 0,
        createdAt: s.createdAt,
        createdByUserId: s.createdByUserId,
        participantCount: roomManager.getSessionClients(s.id).length,
        distance: 0, // Not applicable for own sessions
      }));
    },
  },

  Mutation: {
    joinSession: async (
      _: unknown,
      { sessionId, boardPath, username, avatarUrl }: { sessionId: string; boardPath: string; username?: string; avatarUrl?: string },
      ctx: ConnectionContext
    ) => {
      console.log(`[joinSession] START - connectionId: ${ctx.connectionId}, sessionId: ${sessionId}, username: ${username}`);

      applyRateLimit(ctx, 10); // Limit session joins to prevent abuse

      // Validate inputs
      validateInput(SessionIdSchema, sessionId, 'sessionId');
      validateInput(BoardPathSchema, boardPath, 'boardPath');
      if (username) validateInput(UsernameSchema, username, 'username');
      if (avatarUrl) validateInput(AvatarUrlSchema, avatarUrl, 'avatarUrl');

      const result = await roomManager.joinSession(ctx.connectionId, sessionId, boardPath, username || undefined, avatarUrl || undefined);
      console.log(`[joinSession] roomManager.joinSession completed - clientId: ${result.clientId}, isLeader: ${result.isLeader}`);

      // Update context with session info
      console.log(`[joinSession] Before updateContext - ctx.sessionId: ${ctx.sessionId}`);
      updateContext(ctx.connectionId, { sessionId, userId: result.clientId });
      console.log(`[joinSession] After updateContext - ctx.sessionId: ${ctx.sessionId}`);

      // Notify session about new user
      const userJoinedEvent: SessionEvent = {
        __typename: 'UserJoined',
        user: {
          id: result.clientId,
          username: username || `User-${result.clientId.substring(0, 6)}`,
          isLeader: result.isLeader,
          avatarUrl: avatarUrl,
        },
      };
      pubsub.publishSessionEvent(sessionId, userJoinedEvent);

      return {
        id: sessionId,
        boardPath,
        users: result.users,
        queueState: {
          queue: result.queue,
          currentClimbQueueItem: result.currentClimbQueueItem,
        },
        isLeader: result.isLeader,
        clientId: result.clientId,
      };
    },

    createSession: async (
      _: unknown,
      { input }: { input: CreateSessionInput },
      ctx: ConnectionContext
    ) => {
      console.log(`[createSession] START - connectionId: ${ctx.connectionId}, boardPath: ${input.boardPath}`);

      applyRateLimit(ctx, 5); // Limit session creation to prevent abuse
      // Only authenticated users can create sessions
      requireAuthenticated(ctx);

      // Validate input
      validateInput(CreateSessionInputSchema, input, 'createSession input');

      // Generate a unique session ID
      const sessionId = uuidv4();
      console.log(`[createSession] Generated sessionId: ${sessionId}`);

      if (input.discoverable) {
        // Create a discoverable session with GPS coordinates
        // Use authenticated userId from context
        const userId = ctx.userId || ctx.connectionId;
        await roomManager.createDiscoverableSession(
          sessionId,
          input.boardPath,
          userId,
          input.latitude,
          input.longitude,
          input.name
        );
      }

      // Join the session as the creator
      const result = await roomManager.joinSession(
        ctx.connectionId,
        sessionId,
        input.boardPath,
        undefined, // username will be set later
        undefined  // avatarUrl will be set later
      );
      console.log(`[createSession] Joined session - clientId: ${result.clientId}, isLeader: ${result.isLeader}`);

      // Update context with session info
      console.log(`[createSession] Before updateContext - ctx.sessionId: ${ctx.sessionId}`);
      updateContext(ctx.connectionId, { sessionId, userId: result.clientId });
      console.log(`[createSession] After updateContext - ctx.sessionId: ${ctx.sessionId}`);

      return {
        id: sessionId,
        boardPath: input.boardPath,
        users: result.users,
        queueState: {
          queue: result.queue,
          currentClimbQueueItem: result.currentClimbQueueItem,
        },
        isLeader: result.isLeader,
        clientId: result.clientId,
      };
    },

    leaveSession: async (_: unknown, __: unknown, ctx: ConnectionContext) => {
      if (!ctx.sessionId) return false;

      const sessionId = ctx.sessionId;
      const userId = ctx.userId;
      const result = await roomManager.leaveSession(ctx.connectionId);

      if (result) {
        // Notify session about user leaving
        if (userId) {
          pubsub.publishSessionEvent(sessionId, {
            __typename: 'UserLeft',
            userId,
          });
        }

        // Notify about new leader if changed
        if (result.newLeaderId) {
          pubsub.publishSessionEvent(sessionId, {
            __typename: 'LeaderChanged',
            leaderId: result.newLeaderId,
          });
        }

        updateContext(ctx.connectionId, { sessionId: undefined, userId: undefined });
      }

      return true;
    },

    updateUsername: async (_: unknown, { username, avatarUrl }: { username: string; avatarUrl?: string }, ctx: ConnectionContext) => {
      // Validate inputs
      validateInput(UsernameSchema, username, 'username');
      if (avatarUrl) validateInput(AvatarUrlSchema, avatarUrl, 'avatarUrl');

      await roomManager.updateUsername(ctx.connectionId, username, avatarUrl);

      if (ctx.sessionId) {
        const client = roomManager.getClient(ctx.connectionId);
        if (client) {
          // Re-announce user with updated info
          pubsub.publishSessionEvent(ctx.sessionId, {
            __typename: 'UserJoined',
            user: {
              id: client.connectionId,
              username,
              isLeader: client.isLeader,
              avatarUrl: client.avatarUrl,
            },
          });
        }
      }

      return true;
    },

    addQueueItem: async (
      _: unknown,
      { item, position }: { item: ClimbQueueItem; position?: number },
      ctx: ConnectionContext
    ) => {
      applyRateLimit(ctx); // Apply default rate limit
      const sessionId = requireSession(ctx);
      console.log('[addQueueItem] Adding item:', item.climb?.name, 'by client:', ctx.connectionId, 'at position:', position);

      // Track the original queue length for position calculation
      let originalQueueLength = 0;

      // Retry loop for optimistic locking
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Get current state and update
        const currentState = await roomManager.getQueueState(sessionId);
        console.log('[addQueueItem] Current state - queue size:', currentState.queue.length, 'version:', currentState.version);
        let queue = currentState.queue;
        originalQueueLength = queue.length;

        // Only add if not already in queue
        if (queue.some((i) => i.uuid === item.uuid)) {
          // Item already in queue, just return it
          break;
        }

        if (position !== undefined && position >= 0 && position <= queue.length) {
          queue = [...queue.slice(0, position), item, ...queue.slice(position)];
        } else {
          queue = [...queue, item];
        }

        try {
          // Use updateQueueOnly with version check to avoid race conditions
          await roomManager.updateQueueOnly(sessionId, queue, currentState.version);
          break; // Success, exit retry loop
        } catch (error) {
          if (error instanceof VersionConflictError && attempt < MAX_RETRIES - 1) {
            console.log(`[addQueueItem] Version conflict, retrying (attempt ${attempt + 1}/${MAX_RETRIES})`);
            continue; // Retry
          }
          throw error; // Re-throw if not a version conflict or max retries exceeded
        }
      }

      // Calculate actual position where item was inserted
      // If position was valid, item is at that index; otherwise it was appended
      const actualPosition =
        position !== undefined && position >= 0 && position <= originalQueueLength
          ? position
          : originalQueueLength; // Item was appended at end of original queue

      // Broadcast to subscribers with the actual position
      pubsub.publishQueueEvent(sessionId, {
        __typename: 'QueueItemAdded',
        item: item,
        position: actualPosition,
      });

      return item;
    },

    removeQueueItem: async (_: unknown, { uuid }: { uuid: string }, ctx: ConnectionContext) => {
      applyRateLimit(ctx);
      const sessionId = requireSession(ctx);

      // Validate input
      validateInput(QueueItemIdSchema, uuid, 'uuid');

      const currentState = await roomManager.getQueueState(sessionId);
      const queue = currentState.queue.filter((i) => i.uuid !== uuid);
      let currentClimb = currentState.currentClimbQueueItem;

      // Clear current climb if it was removed
      if (currentClimb?.uuid === uuid) {
        currentClimb = null;
      }

      await roomManager.updateQueueState(sessionId, queue, currentClimb);

      pubsub.publishQueueEvent(sessionId, {
        __typename: 'QueueItemRemoved',
        uuid,
      });

      return true;
    },

    reorderQueueItem: async (
      _: unknown,
      { uuid, oldIndex, newIndex }: { uuid: string; oldIndex: number; newIndex: number },
      ctx: ConnectionContext
    ) => {
      applyRateLimit(ctx);
      const sessionId = requireSession(ctx);

      // Validate inputs
      validateInput(QueueItemIdSchema, uuid, 'uuid');
      validateInput(QueueIndexSchema, oldIndex, 'oldIndex');
      validateInput(QueueIndexSchema, newIndex, 'newIndex');

      const currentState = await roomManager.getQueueState(sessionId);
      const queue = [...currentState.queue];

      // Validate indices are within bounds
      if (oldIndex >= queue.length || newIndex >= queue.length) {
        throw new Error(`Invalid index: queue has ${queue.length} items`);
      }

      if (oldIndex >= 0 && oldIndex < queue.length && newIndex >= 0 && newIndex < queue.length) {
        const [movedItem] = queue.splice(oldIndex, 1);
        queue.splice(newIndex, 0, movedItem);
        // Use updateQueueOnly to avoid overwriting currentClimbQueueItem
        await roomManager.updateQueueOnly(sessionId, queue);
      }

      pubsub.publishQueueEvent(sessionId, {
        __typename: 'QueueReordered',
        uuid,
        oldIndex,
        newIndex,
      });

      return true;
    },

    setCurrentClimb: async (
      _: unknown,
      { item, shouldAddToQueue }: { item: ClimbQueueItem | null; shouldAddToQueue?: boolean },
      ctx: ConnectionContext
    ) => {
      applyRateLimit(ctx);
      const sessionId = requireSession(ctx);

      // Debug: track who's setting null
      if (item === null) {
        console.log('[setCurrentClimb] Setting current climb to NULL by client:', ctx.connectionId, 'session:', sessionId);
      } else {
        console.log('[setCurrentClimb] Setting current climb to:', item.climb?.name, 'by client:', ctx.connectionId);
      }

      // Retry loop for optimistic locking
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const currentState = await roomManager.getQueueState(sessionId);
        let queue = currentState.queue;

        // Optionally add to queue if not already present
        if (shouldAddToQueue && item && !queue.some((i) => i.uuid === item.uuid)) {
          queue = [...queue, item];
        }

        try {
          await roomManager.updateQueueState(sessionId, queue, item, currentState.version);
          break; // Success, exit retry loop
        } catch (error) {
          if (error instanceof VersionConflictError && attempt < MAX_RETRIES - 1) {
            console.log(`[setCurrentClimb] Version conflict, retrying (attempt ${attempt + 1}/${MAX_RETRIES})`);
            continue; // Retry
          }
          throw error; // Re-throw if not a version conflict or max retries exceeded
        }
      }

      pubsub.publishQueueEvent(sessionId, {
        __typename: 'CurrentClimbChanged',
        item: item,
      });

      return item;
    },

    mirrorCurrentClimb: async (_: unknown, { mirrored }: { mirrored: boolean }, ctx: ConnectionContext) => {
      applyRateLimit(ctx);
      const sessionId = requireSession(ctx);

      const currentState = await roomManager.getQueueState(sessionId);
      let currentClimb = currentState.currentClimbQueueItem;

      if (currentClimb) {
        // Update the mirrored state
        currentClimb = {
          ...currentClimb,
          climb: { ...currentClimb.climb, mirrored },
        };

        // Also update in queue if present
        const queue = currentState.queue.map((i) =>
          i.uuid === currentClimb!.uuid ? { ...i, climb: { ...i.climb, mirrored } } : i
        );

        await roomManager.updateQueueState(sessionId, queue, currentClimb);
      }

      pubsub.publishQueueEvent(sessionId, {
        __typename: 'ClimbMirrored',
        mirrored,
      });

      return currentClimb;
    },

    replaceQueueItem: async (
      _: unknown,
      { uuid, item }: { uuid: string; item: ClimbQueueItem },
      ctx: ConnectionContext
    ) => {
      applyRateLimit(ctx);
      const sessionId = requireSession(ctx);

      const currentState = await roomManager.getQueueState(sessionId);
      const queue = currentState.queue.map((i) => (i.uuid === uuid ? item : i));
      let currentClimb = currentState.currentClimbQueueItem;

      // Update current climb if it was the replaced item
      if (currentClimb?.uuid === uuid) {
        currentClimb = item;
      }

      await roomManager.updateQueueState(sessionId, queue, currentClimb);

      // Publish as FullSync since replace is less common
      pubsub.publishQueueEvent(sessionId, {
        __typename: 'FullSync',
        state: { queue, currentClimbQueueItem: currentClimb },
      });

      return item;
    },

    setQueue: async (
      _: unknown,
      { queue, currentClimbQueueItem }: { queue: ClimbQueueItem[]; currentClimbQueueItem?: ClimbQueueItem },
      ctx: ConnectionContext
    ) => {
      applyRateLimit(ctx, 30); // Lower limit for bulk operations
      const sessionId = requireSession(ctx);

      // Validate queue size to prevent memory exhaustion
      validateInput(QueueArraySchema, queue, 'queue');
      if (currentClimbQueueItem) {
        validateInput(ClimbQueueItemSchema, currentClimbQueueItem, 'currentClimbQueueItem');
      }

      await roomManager.updateQueueState(sessionId, queue, currentClimbQueueItem || null);

      const state: QueueState = {
        queue,
        currentClimbQueueItem: currentClimbQueueItem || null,
      };

      pubsub.publishQueueEvent(sessionId, {
        __typename: 'FullSync',
        state,
      });

      return state;
    },
  },

  Subscription: {
    queueUpdates: {
      subscribe: async function* (_: unknown, { sessionId }: { sessionId: string }, ctx: ConnectionContext) {
        // Verify user is a member of the session they're subscribing to
        // Uses retry logic to handle race conditions with joinSession
        await requireSessionMember(ctx, sessionId);

        // IMPORTANT: Subscribe to pubsub FIRST, before fetching state.
        // This prevents a race condition where events could be published
        // between fetching the queue state and starting to listen.
        // Events that arrive before we yield FullSync will be queued.
        const asyncIterator = createEagerAsyncIterator<QueueEvent>((push) => {
          return pubsub.subscribeQueue(sessionId, push);
        });

        // Now fetch the current state (any events during this time are queued)
        const queueState = await roomManager.getQueueState(sessionId);

        // Send initial FullSync
        yield {
          queueUpdates: {
            __typename: 'FullSync',
            state: queueState,
          } as QueueEvent,
        };

        // Continue with queued and new events
        // Note: The client's reducer handles duplicate events via UUID deduplication,
        // so any events that occurred before FullSync but are also in FullSync
        // will be safely ignored.
        for await (const event of asyncIterator) {
          yield { queueUpdates: event };
        }
      },
    },

    sessionUpdates: {
      subscribe: async function* (_: unknown, { sessionId }: { sessionId: string }, ctx: ConnectionContext) {
        // Verify user is a member of the session they're subscribing to
        // Uses retry logic to handle race conditions with joinSession
        await requireSessionMember(ctx, sessionId);

        // Create async iterator for subscription
        const asyncIterator = createAsyncIterator<SessionEvent>((push) => {
          return pubsub.subscribeSession(sessionId, push);
        });

        for await (const event of asyncIterator) {
          yield { sessionUpdates: event };
        }
      },
    },
  },

  // Union type resolvers - GraphQL needs to know which concrete type to return
  QueueEvent: {
    __resolveType(obj: QueueEvent) {
      return obj.__typename;
    },
  },

  SessionEvent: {
    __resolveType(obj: SessionEvent) {
      return obj.__typename;
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
