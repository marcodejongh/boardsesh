import { v4 as uuidv4 } from 'uuid';
import type { ConnectionContext, SessionEvent } from '@boardsesh/shared-schema';
import { roomManager } from '../../../services/room-manager.js';
import { pubsub } from '../../../pubsub/index.js';
import { updateContext } from '../../context.js';
import { requireAuthenticated, applyRateLimit, validateInput } from '../shared/helpers.js';
import {
  SessionIdSchema,
  BoardPathSchema,
  UsernameSchema,
  AvatarUrlSchema,
  CreateSessionInputSchema,
} from '../../../validation/schemas.js';
import type { CreateSessionInput } from '../shared/types.js';

// Debug logging flag - only log in development
const DEBUG = process.env.NODE_ENV === 'development';

export const sessionMutations = {
  /**
   * Join an existing session
   * Creates or joins a session and updates connection context
   */
  joinSession: async (
    _: unknown,
    { sessionId, boardPath, username, avatarUrl }: { sessionId: string; boardPath: string; username?: string; avatarUrl?: string },
    ctx: ConnectionContext
  ) => {
    if (DEBUG) console.log(`[joinSession] START - connectionId: ${ctx.connectionId}, sessionId: ${sessionId}, username: ${username}`);

    applyRateLimit(ctx, 10); // Limit session joins to prevent abuse

    // Validate inputs
    validateInput(SessionIdSchema, sessionId, 'sessionId');
    validateInput(BoardPathSchema, boardPath, 'boardPath');
    if (username) validateInput(UsernameSchema, username, 'username');
    if (avatarUrl) validateInput(AvatarUrlSchema, avatarUrl, 'avatarUrl');

    const result = await roomManager.joinSession(ctx.connectionId, sessionId, boardPath, username || undefined, avatarUrl || undefined);
    if (DEBUG) console.log(`[joinSession] roomManager.joinSession completed - clientId: ${result.clientId}, isLeader: ${result.isLeader}`);

    // Update context with session info
    if (DEBUG) console.log(`[joinSession] Before updateContext - ctx.sessionId: ${ctx.sessionId}`);
    updateContext(ctx.connectionId, { sessionId, userId: result.clientId });
    if (DEBUG) console.log(`[joinSession] After updateContext - ctx.sessionId: ${ctx.sessionId}`);

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

  /**
   * Create a new session
   * Only authenticated users can create sessions
   * Optionally creates a discoverable session with GPS coordinates
   */
  createSession: async (
    _: unknown,
    { input }: { input: CreateSessionInput },
    ctx: ConnectionContext
  ) => {
    if (DEBUG) console.log(`[createSession] START - connectionId: ${ctx.connectionId}, boardPath: ${input.boardPath}`);

    applyRateLimit(ctx, 5); // Limit session creation to prevent abuse
    // Only authenticated users can create sessions
    requireAuthenticated(ctx);

    // Validate input
    validateInput(CreateSessionInputSchema, input, 'createSession input');

    // Generate a unique session ID
    const sessionId = uuidv4();
    if (DEBUG) console.log(`[createSession] Generated sessionId: ${sessionId}`);

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
    if (DEBUG) console.log(`[createSession] Joined session - clientId: ${result.clientId}, isLeader: ${result.isLeader}`);

    // Update context with session info
    if (DEBUG) console.log(`[createSession] Before updateContext - ctx.sessionId: ${ctx.sessionId}`);
    updateContext(ctx.connectionId, { sessionId, userId: result.clientId });
    if (DEBUG) console.log(`[createSession] After updateContext - ctx.sessionId: ${ctx.sessionId}`);

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

  /**
   * Leave the current session
   * Cleans up connection context and notifies other session members
   */
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

  /**
   * Update username and avatar for the current user in the session
   * Re-announces the user to all session members
   */
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
};
