import type { ConnectionContext, ControllerEvent, LedUpdate, LedCommand, BoardName, QueueNavigationContext, ControllerQueueItem, ControllerQueueSync, ClimbQueueItem } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import { esp32Controllers } from '@boardsesh/db/schema/app';
import { eq } from 'drizzle-orm';
import { pubsub } from '../../../pubsub/index';
import { roomManager } from '../../../services/room-manager';
import { createAsyncIterator } from '../shared/async-iterators';
import { getLedPlacements } from '../../../db/queries/util/led-placements-data';
import { requireControllerAuthorizedForSession } from '../shared/helpers';
import { getGradeColor } from './grade-colors';
import { buildNavigationContext, findClimbIndex } from './navigation-helpers';

// LED color mapping for hold states (matches web app colors)
const HOLD_STATE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  STARTING: { r: 0, g: 255, b: 0 },     // Green
  FINISH: { r: 255, g: 0, b: 255 },     // Magenta/Pink
  HAND: { r: 0, g: 255, b: 255 },       // Cyan
  FOOT: { r: 255, g: 170, b: 0 },       // Orange
  OFF: { r: 0, g: 0, b: 0 },            // Off
};

/**
 * Build a minimal ControllerQueueItem from a full ClimbQueueItem
 */
function buildControllerQueueItem(item: ClimbQueueItem): ControllerQueueItem {
  return {
    uuid: item.uuid,
    climbUuid: item.climb.uuid,
    name: item.climb.name,
    grade: item.climb.difficulty,
    gradeColor: getGradeColor(item.climb.difficulty),
  };
}

/**
 * Build a ControllerQueueSync event from current queue state
 */
function buildControllerQueueSync(queue: ClimbQueueItem[], currentItemUuid: string | undefined): ControllerQueueSync {
  const currentIndex = currentItemUuid
    ? queue.findIndex((item) => item.uuid === currentItemUuid)
    : -1;

  return {
    __typename: 'ControllerQueueSync',
    queue: queue.map(buildControllerQueueItem),
    currentIndex,
  };
}

/**
 * Convert a climb's litUpHoldsMap to LED commands using LED placements data
 */
function climbToLedCommands(
  climb: { litUpHoldsMap: Record<number, { state: string }> },
  ledPlacements: Record<number, number>
): LedCommand[] {
  const commands: LedCommand[] = [];

  for (const [placementIdStr, holdInfo] of Object.entries(climb.litUpHoldsMap)) {
    const placementId = parseInt(placementIdStr, 10);
    const ledPosition = ledPlacements[placementId];

    if (ledPosition === undefined) {
      // This placement doesn't have an LED in this board configuration
      continue;
    }

    const color = HOLD_STATE_COLORS[holdInfo.state] || HOLD_STATE_COLORS.HAND;

    commands.push({
      position: ledPosition,
      r: color.r,
      g: color.g,
      b: color.b,
    });
  }

  console.log(`[Controller] Converted ${Object.keys(climb.litUpHoldsMap).length} holds to ${commands.length} LED commands`);
  return commands;
}

export const controllerSubscriptions = {
  /**
   * ESP32 controller subscribes to receive LED commands
   * Uses API key authentication via connectionParams
   *
   * Flow:
   * 1. Validate API key from connectionParams and verify session authorization
   * 2. Subscribe to session's current climb changes
   * 3. When climb changes, convert to LED commands and send to controller
   * 4. Send periodic pings to keep connection alive
   */
  controllerEvents: {
    subscribe: async function* (
      _: unknown,
      { sessionId }: { sessionId: string },
      ctx: ConnectionContext
    ): AsyncGenerator<{ controllerEvents: ControllerEvent }> {
      // Validate API key from context and verify session authorization
      // This throws if the controller is not authorized
      await requireControllerAuthorizedForSession(ctx, sessionId);

      // Get controller details using the controllerId from context (validated above)
      const [controller] = await db
        .select()
        .from(esp32Controllers)
        .where(eq(esp32Controllers.id, ctx.controllerId!))
        .limit(1);

      if (!controller) {
        throw new Error('Controller not registered. Register via web UI first.');
      }

      // Update lastSeenAt on connection
      await db
        .update(esp32Controllers)
        .set({ lastSeenAt: new Date() })
        .where(eq(esp32Controllers.id, controller.id));

      // Get session details to get boardPath
      const sessionData = await roomManager.getSessionById(sessionId);
      const boardPath = sessionData?.boardPath || '';

      console.log(
        `[Controller] Controller ${controller.id} subscribed to session ${sessionId} (boardPath: ${boardPath})`
      );

      // Helper to build LedUpdate with navigation context
      const buildLedUpdateWithNavigation = async (
        climb: { uuid: string; name: string; difficulty: string; angle: number; litUpHoldsMap: Record<number, { state: string }> } | null | undefined,
        currentItemUuid?: string,
        clientId?: string | null
      ): Promise<LedUpdate> => {
        // Get LED placements for this controller's configuration
        const ledPlacements = getLedPlacements(
          controller.boardName as BoardName,
          controller.layoutId,
          controller.sizeId
        );

        if (!climb) {
          // No current climb - could be clearing or unknown climb from BLE
          // Get queue state for navigation context so ESP32 can navigate back
          const queueState = await roomManager.getQueueState(sessionId);
          const navigation = buildNavigationContext(queueState.queue, -1);

          return {
            __typename: 'LedUpdate',
            commands: [],
            boardPath,
            clientId,
            // If clientId matches controller, this is an unknown BLE climb - show "Unknown Climb"
            climbName: clientId ? 'Unknown Climb' : undefined,
            climbGrade: clientId ? '?' : undefined,
            gradeColor: clientId ? '#888888' : undefined,
            navigation,
          };
        }

        const commands = climbToLedCommands(climb, ledPlacements);

        // Get queue state for navigation context
        const queueState = await roomManager.getQueueState(sessionId);
        const currentIndex = findClimbIndex(queueState.queue, currentItemUuid);
        const navigation = buildNavigationContext(queueState.queue, currentIndex);

        return {
          __typename: 'LedUpdate',
          commands,
          queueItemUuid: currentItemUuid,
          climbUuid: climb.uuid,
          climbName: climb.name,
          climbGrade: climb.difficulty,
          gradeColor: getGradeColor(climb.difficulty),
          boardPath,
          angle: climb.angle,
          navigation,
          clientId,
        };
      };

      // Create subscription to queue events
      const asyncIterator = await createAsyncIterator<ControllerEvent>((push) => {
        // Event queue to ensure events are processed and sent in order
        // This prevents race conditions where QueueSync and LedUpdate arrive out of order
        let eventQueue: Promise<void> = Promise.resolve();

        // Subscribe to queue updates for this session
        return pubsub.subscribeQueue(sessionId, (queueEvent) => {

          // Handle queue modification events - send ControllerQueueSync
          if (queueEvent.__typename === 'QueueItemAdded' ||
              queueEvent.__typename === 'QueueItemRemoved' ||
              queueEvent.__typename === 'QueueReordered') {
            // Queue the async work to ensure ordering
            eventQueue = eventQueue.then(async () => {
              try {
                const queueState = await roomManager.getQueueState(sessionId);
                const queueSync = buildControllerQueueSync(
                  queueState.queue,
                  queueState.currentClimbQueueItem?.uuid
                );
                push(queueSync);
              } catch (error) {
                console.error(`[Controller] Error building queue sync:`, error);
              }
            });
            return;
          }

          // Handle current climb changes and full sync
          // Always send LedUpdate with clientId - ESP32 uses clientId to decide whether to disconnect BLE client
          if (queueEvent.__typename === 'CurrentClimbChanged' || queueEvent.__typename === 'FullSync') {
            // Extract clientId from the event (null for FullSync or system-initiated changes)
            const eventClientId = queueEvent.__typename === 'CurrentClimbChanged'
              ? queueEvent.clientId
              : null;

            const currentItem = queueEvent.__typename === 'CurrentClimbChanged'
              ? queueEvent.item
              : queueEvent.state.currentClimbQueueItem;
            const climb = currentItem?.climb;

            // Queue the async work to ensure ordering
            eventQueue = eventQueue.then(async () => {
              try {
                if (climb) {
                  const ledUpdate = await buildLedUpdateWithNavigation(climb, currentItem?.uuid, eventClientId);
                  push(ledUpdate);
                } else {
                  // No climb - could be clearing or unknown climb
                  const ledUpdate = await buildLedUpdateWithNavigation(null, undefined, eventClientId);
                  push(ledUpdate);
                }
              } catch (error) {
                console.error(`[Controller] Error building LED update:`, error);
              }
            });
          }
        });
      });

      // Send initial queue sync first (so ESP32 has queue state before LED update)
      const initialQueueState = await roomManager.getQueueState(sessionId);
      const initialQueueSync = buildControllerQueueSync(
        initialQueueState.queue,
        initialQueueState.currentClimbQueueItem?.uuid
      );
      yield { controllerEvents: initialQueueSync };

      // Send initial LED state
      const initialClimb = initialQueueState.currentClimbQueueItem?.climb;
      const initialLedUpdate = await buildLedUpdateWithNavigation(
        initialClimb,
        initialQueueState.currentClimbQueueItem?.uuid
      );
      yield { controllerEvents: initialLedUpdate };

      // Yield events from subscription
      for await (const event of asyncIterator) {
        // Update lastSeenAt periodically (on each event)
        await db
          .update(esp32Controllers)
          .set({ lastSeenAt: new Date() })
          .where(eq(esp32Controllers.id, controller.id));

        yield { controllerEvents: event };
      }
    },
  },
};

/**
 * Type resolver for ControllerEvent union
 */
export const controllerEventResolver = {
  __resolveType(obj: ControllerEvent) {
    if ('commands' in obj) {
      return 'LedUpdate';
    }
    if ('timestamp' in obj) {
      return 'ControllerPing';
    }
    if ('queue' in obj && 'currentIndex' in obj) {
      return 'ControllerQueueSync';
    }
    return null;
  },
};
