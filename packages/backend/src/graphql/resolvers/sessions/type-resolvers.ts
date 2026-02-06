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
   * The angle is always the 5th segment (index 4 after filtering empty strings)
   */
  angle: (session: { boardPath: string }) => {
    const pathParts = session.boardPath.split('/').filter(Boolean);
    // Angle is at index 4: [board_name, layout_id, size_id, set_ids, angle]
    if (pathParts.length < 5) {
      return 40; // Default if path is malformed
    }
    const angle = parseInt(pathParts[4], 10);
    return isNaN(angle) ? 40 : angle; // Default to 40 if parsing fails
  },
};
