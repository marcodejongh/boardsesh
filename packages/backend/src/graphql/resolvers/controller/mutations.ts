import type {
  ConnectionContext,
  ControllerRegistration,
  RegisterControllerInput,
  LedCommand,
  ClimbMatchResult,
  ClimbQueueItem,
  BoardName,
  SendDeviceLogsInput,
  SendDeviceLogsResponse,
} from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import { esp32Controllers } from '@boardsesh/db/schema/app';
import { eq, and } from 'drizzle-orm';
import { requireAuthenticated, applyRateLimit, requireControllerAuth, requireControllerAuthorizedForSession } from '../shared/helpers';
import { randomBytes, randomUUID } from 'crypto';
import { matchClimbByFrames, getClimbByUuid } from '../../../db/queries/climbs';
import { roomManager } from '../../../services/room-manager';
import { pubsub } from '../../../pubsub';
import { buildFramesString } from '../../../db/queries/util/led-placements-data';
import { forwardLogs, type DeviceLog } from '../../../services/axiom';

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

export const controllerMutations = {
  /**
   * Register a new ESP32 controller
   * Generates a unique API key for the controller
   * Requires authentication
   */
  registerController: async (
    _: unknown,
    { input }: { input: RegisterControllerInput },
    ctx: ConnectionContext
  ): Promise<ControllerRegistration> => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx, 10); // Lower limit for controller registration

    if (!ctx.userId) {
      throw new Error('User ID not available');
    }

    const apiKey = generateApiKey();

    const [controller] = await db
      .insert(esp32Controllers)
      .values({
        userId: ctx.userId,
        apiKey,
        name: input.name ?? null,
        boardName: input.boardName,
        layoutId: input.layoutId,
        sizeId: input.sizeId,
        setIds: input.setIds,
      })
      .returning();

    return {
      apiKey,
      controllerId: controller.id,
    };
  },

  /**
   * Delete a registered controller
   * Only the owner can delete their controller
   * Requires authentication
   */
  deleteController: async (
    _: unknown,
    { controllerId }: { controllerId: string },
    ctx: ConnectionContext
  ): Promise<boolean> => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx);

    if (!ctx.userId) {
      throw new Error('User ID not available');
    }

    await db
      .delete(esp32Controllers)
      .where(
        and(
          eq(esp32Controllers.id, controllerId),
          eq(esp32Controllers.userId, ctx.userId)
        )
      );

    return true;
  },

  /**
   * ESP32 controller sends frames string (or LED positions) received from official app Bluetooth
   * Backend attempts to match against known climbs and sets as current climb if found
   * Uses controller API key authentication via connectionParams
   *
   * @param frames - Pre-built frames string from ESP32 (preferred method)
   * @param positions - Legacy LED positions array (for backwards compatibility)
   */
  setClimbFromLedPositions: async (
    _: unknown,
    {
      sessionId,
      frames,
      positions,
    }: {
      sessionId: string;
      frames?: string;
      positions?: LedCommand[];
    },
    ctx: ConnectionContext
  ): Promise<ClimbMatchResult> => {
    applyRateLimit(ctx, 30); // Moderate limit for LED position updates

    // Verify controller is authenticated and authorized for this session
    const { controllerId } = await requireControllerAuthorizedForSession(ctx, sessionId);

    // Get controller details
    const [controller] = await db
      .select()
      .from(esp32Controllers)
      .where(eq(esp32Controllers.id, controllerId))
      .limit(1);

    if (!controller) {
      throw new Error('Controller not found');
    }

    // Update lastSeenAt
    await db
      .update(esp32Controllers)
      .set({ lastSeenAt: new Date() })
      .where(eq(esp32Controllers.id, controller.id));

    // Require either frames or positions
    if (!frames && (!positions || positions.length === 0)) {
      console.log(`[Controller] No frames or positions provided for session ${sessionId}`);
      return {
        matched: false,
        climbUuid: null,
        climbName: null,
      };
    }

    // Get current session state to determine angle from current climb
    const currentState = await roomManager.getQueueState(sessionId);
    const angle = currentState.currentClimbQueueItem?.climb?.angle ?? 40;

    console.log(
      `[Controller] Matching climb for session ${sessionId} at angle ${angle}, frames: ${frames ? 'provided' : 'not provided'}, positions: ${positions?.length ?? 0}`
    );

    // Build frames string from positions if not provided directly
    let framesString = frames;
    if (!framesString && positions && positions.length > 0) {
      framesString = buildFramesString(
        positions.map((p) => ({
          position: p.position,
          r: p.r,
          g: p.g,
          b: p.b,
          role: p.role,
        })),
        controller.boardName as BoardName,
        controller.layoutId,
        controller.sizeId
      );
      console.log(`[Controller] Built frames string from ${positions.length} positions: ${framesString}`);
    }

    if (!framesString) {
      console.log(`[Controller] Could not build frames string for session ${sessionId}`);
      return {
        matched: false,
        climbUuid: null,
        climbName: null,
      };
    }

    // Find matching climb by frames string
    const match = await matchClimbByFrames(
      controller.boardName as BoardName,
      controller.layoutId,
      framesString,
      angle
    );

    if (!match) {
      console.log(`[Controller] No climb found matching frames for session ${sessionId}`);
      return {
        matched: false,
        climbUuid: null,
        climbName: null,
      };
    }

    // Get full climb data
    const climb = await getClimbByUuid({
      board_name: controller.boardName as BoardName,
      layout_id: controller.layoutId,
      size_id: controller.sizeId,
      angle,
      climb_uuid: match.uuid,
    });

    if (!climb) {
      console.log(`[Controller] Climb data not found for matched UUID: ${match.uuid}`);
      return {
        matched: false,
        climbUuid: null,
        climbName: null,
      };
    }

    // Create queue item and set as current climb
    const queueItem: ClimbQueueItem = {
      uuid: randomUUID(),
      climb,
      suggested: true,
    };

    // Insert the new climb after the current climb in the queue (matching double-click behavior)
    const currentIndex = currentState.currentClimbQueueItem
      ? currentState.queue.findIndex(({ uuid }) => uuid === currentState.currentClimbQueueItem?.uuid)
      : -1;

    // Insert after current climb, or at end if no current climb
    const updatedQueue =
      currentIndex === -1
        ? [...currentState.queue, queueItem]
        : [
            ...currentState.queue.slice(0, currentIndex + 1),
            queueItem,
            ...currentState.queue.slice(currentIndex + 1),
          ];

    // Calculate the position where the item was inserted
    const insertPosition = currentIndex === -1 ? currentState.queue.length : currentIndex + 1;

    const { sequence } = await roomManager.updateQueueState(
      sessionId,
      updatedQueue,
      queueItem
    );

    // Publish QueueItemAdded event for the new item
    pubsub.publishQueueEvent(sessionId, {
      __typename: 'QueueItemAdded',
      sequence,
      item: queueItem,
      position: insertPosition,
    });

    // Publish CurrentClimbChanged event with controllerId as clientId
    // This allows the controller subscription to skip sending LED updates back to this controller
    pubsub.publishQueueEvent(sessionId, {
      __typename: 'CurrentClimbChanged',
      sequence,
      item: queueItem,
      clientId: controllerId,
      correlationId: null,
    });

    console.log(`[Controller] Matched climb: ${match.name} (${match.uuid})`);
    return {
      matched: true,
      climbUuid: match.uuid,
      climbName: match.name,
    };
  },

  /**
   * ESP32 controller heartbeat to update lastSeenAt
   * Uses API key authentication via connectionParams
   */
  controllerHeartbeat: async (
    _: unknown,
    { sessionId }: { sessionId: string },
    ctx: ConnectionContext
  ): Promise<boolean> => {
    applyRateLimit(ctx, 120); // Allow frequent heartbeats

    // Validate API key authentication via context
    const { controllerId, controllerApiKey } = requireControllerAuth(ctx);

    // Update lastSeenAt
    await db
      .update(esp32Controllers)
      .set({ lastSeenAt: new Date() })
      .where(eq(esp32Controllers.apiKey, controllerApiKey));

    return true;
  },

  /**
   * Authorize a controller for a specific session
   * This allows the controller to subscribe to events and send LED data for this session
   * Requires user authentication - only the controller owner can authorize it
   */
  authorizeControllerForSession: async (
    _: unknown,
    { controllerId, sessionId }: { controllerId: string; sessionId: string },
    ctx: ConnectionContext
  ): Promise<boolean> => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx);

    if (!ctx.userId) {
      throw new Error('User ID not available');
    }

    // Verify the user owns this controller
    const [controller] = await db
      .select()
      .from(esp32Controllers)
      .where(
        and(
          eq(esp32Controllers.id, controllerId),
          eq(esp32Controllers.userId, ctx.userId)
        )
      )
      .limit(1);

    if (!controller) {
      throw new Error('Controller not found or not owned by user');
    }

    // Update the controller's authorized session
    await db
      .update(esp32Controllers)
      .set({ authorizedSessionId: sessionId })
      .where(eq(esp32Controllers.id, controllerId));

    console.log(`[Controller] Controller ${controllerId} authorized for session ${sessionId}`);
    return true;
  },

  /**
   * Receive device logs from ESP32 controller and forward to Axiom
   * Uses API key authentication via connectionParams
   */
  sendDeviceLogs: async (
    _: unknown,
    { input }: { input: SendDeviceLogsInput },
    ctx: ConnectionContext
  ): Promise<SendDeviceLogsResponse> => {
    applyRateLimit(ctx, 100); // Allow frequent log batches

    const { controllerId } = requireControllerAuth(ctx);

    // Enrich logs with controller ID and convert to Axiom format
    const enrichedLogs: DeviceLog[] = input.logs.map((log) => {
      let metadata: Record<string, unknown> = {};
      if (log.metadata) {
        try {
          metadata = JSON.parse(log.metadata);
        } catch {
          // Invalid JSON in metadata, ignore
        }
      }

      return {
        _time: new Date(log.ts).toISOString(),
        controller_id: controllerId,
        level: log.level,
        component: log.component,
        message: log.message,
        ...metadata,
      };
    });

    const success = await forwardLogs(enrichedLogs);

    return {
      success,
      accepted: input.logs.length,
    };
  },
};
