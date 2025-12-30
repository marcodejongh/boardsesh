import type { SessionEvent } from '@boardsesh/shared-schema';

/**
 * Union type resolver for SessionEvent
 * GraphQL needs to know which concrete type to return
 */
export const sessionEventResolver = {
  __resolveType(obj: SessionEvent) {
    return obj.__typename;
  },
};
