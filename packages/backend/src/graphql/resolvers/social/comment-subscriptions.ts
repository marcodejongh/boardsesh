import type { ConnectionContext, CommentEvent } from '@boardsesh/shared-schema';
import { pubsub } from '../../../pubsub/index';
import { createAsyncIterator } from '../shared/async-iterators';

const VALID_ENTITY_TYPES = new Set(['playlist_climb', 'climb', 'tick', 'comment', 'proposal', 'board']);

export const socialCommentSubscriptions = {
  commentUpdates: {
    subscribe: async function* (
      _: unknown,
      { entityType, entityId }: { entityType: string; entityId: string },
      _ctx: ConnectionContext,
    ) {
      // Validate inputs to prevent channel injection
      if (!VALID_ENTITY_TYPES.has(entityType)) {
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      if (!entityId || entityId.length > 500) {
        throw new Error('Invalid entity ID');
      }

      const entityKey = `${entityType}:${entityId}`;

      const asyncIterator = await createAsyncIterator<CommentEvent>((push) => {
        return pubsub.subscribeComments(entityKey, push);
      });

      for await (const event of asyncIterator) {
        yield { commentUpdates: event };
      }
    },
  },
};
