import type { QueueEvent } from '@boardsesh/shared-schema';

/**
 * Union type resolver for QueueEvent
 * GraphQL needs to know which concrete type to return
 */
export const queueEventResolver = {
  __resolveType(obj: QueueEvent) {
    return obj.__typename;
  },
};
