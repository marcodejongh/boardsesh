import type { ConnectionContext, SessionEvent } from '@boardsesh/shared-schema';
import { pubsub } from '../../../pubsub/index';
import { requireSessionMember } from '../shared/helpers';
import { createAsyncIterator } from '../shared/async-iterators';

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
};
