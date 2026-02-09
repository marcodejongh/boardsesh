import type { ConnectionContext, CommentEvent } from '@boardsesh/shared-schema';
import { pubsub } from '../../../pubsub/index';
import { createAsyncIterator } from '../shared/async-iterators';

export const socialCommentSubscriptions = {
  commentUpdates: {
    subscribe: async function* (
      _: unknown,
      { entityType, entityId }: { entityType: string; entityId: string },
      _ctx: ConnectionContext,
    ) {
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
