import { v4 as uuidv4 } from 'uuid';
import type { ConnectionContext, SessionEvent, QueueEvent, ClimbQueueItem } from '@boardsesh/shared-schema';
import { SUPPORTED_BOARDS } from '@boardsesh/shared-schema';
import { roomManager } from '../../../services/room-manager';
import { pubsub } from '../../../pubsub/index';
import { updateContext } from '../../context';
import { requireAuthenticated, applyRateLimit, validateInput } from '../shared/helpers';
import {
  SessionIdSchema,
  BoardPathSchema,
  UsernameSchema,
  AvatarUrlSchema,
  SessionNameSchema,
  CreateSessionInputSchema,
  ClimbQueueItemSchema,
  QueueArraySchema,
} from '../../../validation/schemas';
import type { CreateSessionInput } from '../shared/types';
import { db } from '../../../db/client';
import { esp32Controllers } from '@boardsesh/db/schema/app';
import { eq } from 'drizzle-orm';
import { getClimbByUuid } from '../../../db/queries/climbs/get-climb';
import type { BoardName } from '../../../db/queries/util/table-select';

/**
 * Auto-authorize all controllers owned by a user for a session.
 * Called when user joins a session to allow their ESP32 devices to connect.
 */
async function authorizeUserControllersForSession(userId: string, sessionId: string): Promise<void> {
  try {
    // Update all controllers owned by this user to be authorized for this session
    const result = await db
      .update(esp32Controllers)
      .set({ authorizedSessionId: sessionId })
      .where(eq(esp32Controllers.userId, userId));

    console.log(`[Session] Auto-authorized user ${userId}'s controllers for session ${sessionId}`);
  } catch (error) {
    // Log but don't fail the join - controller auth is a bonus feature
    console.error('[Session] Failed to auto-authorize controllers:', error);
  }
}

// Debug logging flag - only log in development
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Parse a boardPath into its components.
 * boardPath format: board_name/layout_id/size_id/set_ids/angle
 */
function parseBoardPath(boardPath: string): {
  boardName: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
} | null {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length < 5) return null;

  const boardName = parts[0] as BoardName;
  if (!SUPPORTED_BOARDS.includes(boardName as typeof SUPPORTED_BOARDS[number])) {
    return null;
  }

  return {
    boardName,
    layoutId: parseInt(parts[1], 10),
    sizeId: parseInt(parts[2], 10),
    setIds: parts[3],
    angle: parseInt(parts[4], 10),
  };
}

/**
 * Update a queue item's climb data with stats at a new angle.
 * Returns the updated queue item, or the original if fetch fails.
 */
async function updateQueueItemForAngle(
  item: ClimbQueueItem,
  boardParams: { boardName: BoardName; layoutId: number; sizeId: number },
  newAngle: number
): Promise<ClimbQueueItem> {
  try {
    const updatedClimb = await getClimbByUuid({
      board_name: boardParams.boardName,
      layout_id: boardParams.layoutId,
      size_id: boardParams.sizeId,
      angle: newAngle,
      climb_uuid: item.climb.uuid,
    });

    if (updatedClimb) {
      return {
        ...item,
        climb: {
          ...item.climb,
          angle: updatedClimb.angle,
          difficulty: updatedClimb.difficulty,
          quality_average: updatedClimb.quality_average,
          ascensionist_count: updatedClimb.ascensionist_count,
          stars: updatedClimb.stars,
          difficulty_error: updatedClimb.difficulty_error,
          benchmark_difficulty: updatedClimb.benchmark_difficulty,
        },
      };
    }
  } catch (error) {
    console.error(`[Session] Failed to update climb ${item.climb.uuid} for angle ${newAngle}:`, error);
  }
  // Return original item if fetch fails
  return item;
}

export const sessionMutations = {
  /**
   * Join an existing session or create a new one
   * Creates or joins a session and updates connection context.
   * When creating a new session, initialQueue and initialCurrentClimb can be provided
   * to seed the session with existing queue items (e.g., when starting party mode with an existing local queue).
   * sessionName is only used when creating a new session - ignored when joining an existing one.
   */
  joinSession: async (
    _: unknown,
    { sessionId, boardPath, username, avatarUrl, initialQueue, initialCurrentClimb, sessionName }: {
      sessionId: string;
      boardPath: string;
      username?: string;
      avatarUrl?: string;
      initialQueue?: ClimbQueueItem[];
      initialCurrentClimb?: ClimbQueueItem;
      sessionName?: string;
    },
    ctx: ConnectionContext
  ) => {
    if (DEBUG) console.log(`[joinSession] START - connectionId: ${ctx.connectionId}, sessionId: ${sessionId}, username: ${username}, sessionName: ${sessionName}, initialQueueLength: ${initialQueue?.length || 0}`);

    applyRateLimit(ctx, 10); // Limit session joins to prevent abuse

    // Validate inputs
    validateInput(SessionIdSchema, sessionId, 'sessionId');
    validateInput(BoardPathSchema, boardPath, 'boardPath');
    if (username) validateInput(UsernameSchema, username, 'username');
    if (avatarUrl) validateInput(AvatarUrlSchema, avatarUrl, 'avatarUrl');
    if (sessionName) validateInput(SessionNameSchema, sessionName, 'sessionName');
    if (initialQueue) validateInput(QueueArraySchema, initialQueue, 'initialQueue');
    if (initialCurrentClimb) validateInput(ClimbQueueItemSchema, initialCurrentClimb, 'initialCurrentClimb');

    const result = await roomManager.joinSession(
      ctx.connectionId,
      sessionId,
      boardPath,
      username || undefined,
      avatarUrl || undefined,
      initialQueue,
      initialCurrentClimb || null,
      sessionName || undefined
    );
    if (DEBUG) console.log(`[joinSession] roomManager.joinSession completed - clientId: ${result.clientId}, isLeader: ${result.isLeader}`);

    // Update context with session info
    if (DEBUG) console.log(`[joinSession] Before updateContext - ctx.sessionId: ${ctx.sessionId}`);
    updateContext(ctx.connectionId, { sessionId, userId: result.clientId });
    if (DEBUG) console.log(`[joinSession] After updateContext - ctx.sessionId: ${ctx.sessionId}`);

    // Auto-authorize user's ESP32 controllers for this session (if authenticated)
    if (ctx.isAuthenticated && ctx.userId) {
      authorizeUserControllersForSession(ctx.userId, sessionId);
    }

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
      name: result.sessionName || null,
      boardPath,
      users: result.users,
      queueState: {
        sequence: result.sequence,
        stateHash: result.stateHash,
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
    // Pass session name for non-discoverable sessions (discoverable sessions already have name set)
    const result = await roomManager.joinSession(
      ctx.connectionId,
      sessionId,
      input.boardPath,
      undefined, // username will be set later
      undefined, // avatarUrl will be set later
      undefined, // initialQueue
      null,      // initialCurrentClimb
      input.discoverable ? undefined : input.name // Only pass name for non-discoverable (discoverable already set via createDiscoverableSession)
    );
    if (DEBUG) console.log(`[createSession] Joined session - clientId: ${result.clientId}, isLeader: ${result.isLeader}`);

    // Update context with session info
    if (DEBUG) console.log(`[createSession] Before updateContext - ctx.sessionId: ${ctx.sessionId}`);
    updateContext(ctx.connectionId, { sessionId, userId: result.clientId });
    if (DEBUG) console.log(`[createSession] After updateContext - ctx.sessionId: ${ctx.sessionId}`);

    return {
      id: sessionId,
      name: input.name || null,
      boardPath: input.boardPath,
      users: result.users,
      queueState: {
        sequence: result.sequence,
        stateHash: result.stateHash,
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

  /**
   * Update the board angle for the current session
   * Broadcasts angle change to all session members so they can update their UI
   * Also updates climb stats in the queue for the new angle
   */
  updateSessionAngle: async (_: unknown, { angle }: { angle: number }, ctx: ConnectionContext) => {
    if (!ctx.sessionId) {
      throw new Error('Not in a session');
    }

    // Validate angle is a reasonable number
    if (!Number.isInteger(angle) || angle < 0 || angle > 90) {
      throw new Error('Invalid angle: must be an integer between 0 and 90 degrees');
    }

    // Update the session angle in the database and Redis
    const result = await roomManager.updateSessionAngle(ctx.sessionId, angle);

    // Parse the new boardPath to get board parameters
    const boardParams = parseBoardPath(result.boardPath);

    // Get current queue state
    const queueState = await roomManager.getQueueState(ctx.sessionId);

    // Update queue items with new angle's climb stats if we have board params
    let updatedQueue = queueState.queue;
    let updatedCurrentClimb = queueState.currentClimbQueueItem;

    // Warn if we can't parse boardPath but have queue items that need updating
    if (!boardParams && (queueState.queue.length > 0 || queueState.currentClimbQueueItem)) {
      console.warn(`[updateSessionAngle] Could not parse boardPath "${result.boardPath}" - queue items will have stale stats`);
    }

    if (boardParams && (queueState.queue.length > 0 || queueState.currentClimbQueueItem)) {
      if (DEBUG) console.log(`[updateSessionAngle] Updating ${queueState.queue.length} queue items for angle ${angle}`);

      // Update all queue items in parallel
      updatedQueue = await Promise.all(
        queueState.queue.map((item) =>
          updateQueueItemForAngle(item, boardParams, angle)
        )
      );

      // Update current climb if present
      if (queueState.currentClimbQueueItem) {
        updatedCurrentClimb = await updateQueueItemForAngle(
          queueState.currentClimbQueueItem,
          boardParams,
          angle
        );
      }

      // Save the updated queue state
      const newQueueState = await roomManager.updateQueueState(
        ctx.sessionId,
        updatedQueue,
        updatedCurrentClimb,
        queueState.version
      );

      // Broadcast the angle change to all session members
      const angleChangedEvent: SessionEvent = {
        __typename: 'AngleChanged',
        angle: result.angle,
        boardPath: result.boardPath,
      };
      pubsub.publishSessionEvent(ctx.sessionId, angleChangedEvent);

      // Send a FullSync event with the updated queue so clients update their queue display
      const fullSyncEvent: QueueEvent = {
        __typename: 'FullSync',
        sequence: newQueueState.sequence,
        state: {
          sequence: newQueueState.sequence,
          stateHash: newQueueState.stateHash,
          queue: updatedQueue,
          currentClimbQueueItem: updatedCurrentClimb,
        },
      };
      pubsub.publishQueueEvent(ctx.sessionId, fullSyncEvent);
    } else {
      // No queue items to update, just broadcast the angle change
      const angleChangedEvent: SessionEvent = {
        __typename: 'AngleChanged',
        angle: result.angle,
        boardPath: result.boardPath,
      };
      pubsub.publishSessionEvent(ctx.sessionId, angleChangedEvent);
    }

    return true;
  },
};
