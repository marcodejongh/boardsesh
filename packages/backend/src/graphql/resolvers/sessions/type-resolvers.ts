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

/**
 * Session type resolver
 * Computes derived fields like angle from the boardPath
 */
export const sessionTypeResolver = {
  /**
   * Extract angle from boardPath
   * boardPath format: board_name/layout_id/size_id/set_ids/angle
   */
  angle: (session: { boardPath: string }) => {
    const pathParts = session.boardPath.split('/');
    const angleStr = pathParts[pathParts.length - 1];
    const angle = parseInt(angleStr, 10);
    return isNaN(angle) ? 40 : angle; // Default to 40 if parsing fails
  },
};
