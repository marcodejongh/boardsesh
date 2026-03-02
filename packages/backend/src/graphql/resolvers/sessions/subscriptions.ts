import type { ConnectionContext, SessionEvent } from '@boardsesh/shared-schema';
import { pubsub } from '../../../pubsub/index';
import { requireSessionMember, validateInput } from '../shared/helpers';
import { createAsyncIterator } from '../shared/async-iterators';
import { SessionIdSchema } from '../../../validation/schemas';
import { buildSessionStatsUpdatedEvent } from './live-session-stats';

export const sessionSubscriptions = {
  /**
   * Subscribe to real-time session events
   * Sends events when users join/leave or leadership changes
   * Requires user to be a member of the session
   */
  sessionUpdates: {
    subscribe: async function* (_: unknown, { sessionId }: { sessionId: string }, ctx: ConnectionContext) {
      // Verify user is a member of the session they're subscribing to
      // Uses retry logic to handle race conditions with joinSession
      await requireSessionMember(ctx, sessionId);

      // Create async iterator for subscription
      // NOTE: We await here to ensure Redis subscription is established
      // before proceeding - this is critical for multi-instance sync.
      const asyncIterator = await createAsyncIterator<SessionEvent>((push) => {
        return pubsub.subscribeSession(sessionId, push);
      });

      for await (const event of asyncIterator) {
        yield { sessionUpdates: event };
      }
    },
  },

  /**
   * Subscribe to read-only live session stats by session ID.
   * This is intentionally public for share-link viewers on /session/:id pages.
   */
  sessionStats: {
    subscribe: async function* (_: unknown, { sessionId }: { sessionId: string }) {
      validateInput(SessionIdSchema, sessionId, 'sessionId');

      // Send a snapshot immediately so viewers get up-to-date stats on first paint.
      const initial = await buildSessionStatsUpdatedEvent(sessionId);

      const asyncIterator = await createAsyncIterator<SessionEvent>((push) => {
        return pubsub.subscribeSession(sessionId, push);
      });

      if (initial) {
        yield { sessionStats: initial };
      }

      for await (const event of asyncIterator) {
        if (event.__typename === 'SessionStatsUpdated') {
          yield { sessionStats: event };
        }
      }
    },
  },
};
