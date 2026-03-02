import { buildSessionStatsUpdatedEvent } from './live-session-stats';
import { pubsub } from '../../../pubsub/index';

const DEBOUNCE_MS = 2000;

const pending = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Debounced wrapper around buildSessionStatsUpdatedEvent + publish.
 *
 * When multiple ticks are saved in quick succession for the same session
 * (e.g. bulk imports, rapid logging) this collapses them into a single
 * stats fetch + broadcast, reducing database load and WS payload volume.
 */
export function publishDebouncedSessionStats(sessionId: string): void {
  const existing = pending.get(sessionId);
  if (existing) {
    clearTimeout(existing);
  }

  pending.set(
    sessionId,
    setTimeout(async () => {
      pending.delete(sessionId);
      try {
        const event = await buildSessionStatsUpdatedEvent(sessionId);
        if (event) {
          pubsub.publishSessionEvent(sessionId, event);
        }
      } catch (error) {
        console.error(
          `[debouncedStats] Failed to publish SessionStatsUpdated for session ${sessionId}:`,
          error,
        );
      }
    }, DEBOUNCE_MS),
  );
}
