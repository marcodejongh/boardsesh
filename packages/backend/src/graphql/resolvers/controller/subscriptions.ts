import type { ConnectionContext, ControllerEvent, LedCommand, BoardName } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import { esp32Controllers } from '@boardsesh/db/schema/app';
import { eq } from 'drizzle-orm';
import { pubsub } from '../../../pubsub/index';
import { roomManager } from '../../../services/room-manager';
import { createAsyncIterator } from '../shared/async-iterators';
import { getLedPlacements } from '../../../db/queries/util/led-placements-data';
import { requireControllerAuthorizedForSession } from '../shared/helpers';

// LED color mapping for hold states (matches web app colors)
const HOLD_STATE_COLORS: Record<string, { r: number; g: number; b: number }> = {
  STARTING: { r: 0, g: 255, b: 0 },     // Green
  FINISH: { r: 255, g: 0, b: 255 },     // Magenta/Pink
  HAND: { r: 0, g: 255, b: 255 },       // Cyan
  FOOT: { r: 255, g: 170, b: 0 },       // Orange
  OFF: { r: 0, g: 0, b: 0 },            // Off
};

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
      const { controllerId } = await requireControllerAuthorizedForSession(ctx, sessionId);

      // Get controller details
      const [controller] = await db
        .select()
        .from(esp32Controllers)
        .where(eq(esp32Controllers.id, controllerId))
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

      // Create subscription to queue events
      const asyncIterator = await createAsyncIterator<ControllerEvent>((push) => {
        // Subscribe to queue updates for this session
        return pubsub.subscribeQueue(sessionId, (queueEvent) => {
          console.log(`[Controller] Received queue event: ${queueEvent.__typename}`);

          // Only process current climb changes
          if (queueEvent.__typename === 'CurrentClimbChanged' || queueEvent.__typename === 'FullSync') {
            // Skip LedUpdate if this controller initiated the change
            // (LEDs are already set from BLE data, this would be redundant)
            if (queueEvent.__typename === 'CurrentClimbChanged') {
              console.log(`[Controller] CurrentClimbChanged event - clientId: ${queueEvent.clientId}, controllerId: ${controllerId}`);
              if (queueEvent.clientId === controllerId) {
                console.log(`[Controller] Skipping LedUpdate (originated from this controller)`);
                return;
              }
            }

            const climb = queueEvent.__typename === 'CurrentClimbChanged'
              ? queueEvent.item?.climb
              : queueEvent.state.currentClimbQueueItem?.climb;

            if (climb) {
              console.log(`[Controller] Sending LED update for climb: ${climb.name}`);

              // Get LED placements for this controller's configuration
              const ledPlacements = getLedPlacements(
                controller.boardName as BoardName,
                controller.layoutId,
                controller.sizeId
              );
              const commands = climbToLedCommands(climb, ledPlacements);

              const ledUpdate: ControllerEvent = {
                __typename: 'LedUpdate',
                commands,
                climbUuid: climb.uuid,
                climbName: climb.name,
                climbGrade: climb.difficulty,
                boardPath,
                angle: climb.angle,
              };
              push(ledUpdate);
            } else {
              console.log(`[Controller] Clearing LEDs (no current climb)`);
              // No current climb - clear LEDs
              const ledUpdate: ControllerEvent = {
                __typename: 'LedUpdate',
                commands: [],
                boardPath,
              };
              push(ledUpdate);
            }
          }
        });
      });

      // Send initial state
      const queueState = await roomManager.getQueueState(sessionId);
      if (queueState.currentClimbQueueItem?.climb) {
        const climb = queueState.currentClimbQueueItem.climb;
        const ledPlacements = getLedPlacements(
          controller.boardName as BoardName,
          controller.layoutId,
          controller.sizeId
        );
        const commands = climbToLedCommands(climb, ledPlacements);
        yield {
          controllerEvents: {
            __typename: 'LedUpdate',
            commands,
            climbUuid: climb.uuid,
            climbName: climb.name,
            climbGrade: climb.difficulty,
            boardPath,
            angle: climb.angle,
          },
        };
      }

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
    return null;
  },
};
