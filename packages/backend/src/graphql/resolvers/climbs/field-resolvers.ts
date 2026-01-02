import type { Climb } from '@boardsesh/shared-schema';
import { searchClimbs as searchClimbsQuery, countClimbs } from '../../../db/queries/climbs/index';
import type { ClimbSearchContext } from '../shared/types';

/**
 * Field-level resolvers for ClimbSearchResult
 * These resolve individual fields from the context returned by searchClimbs query
 */
export const climbFieldResolvers = {
  /**
   * Resolve the climbs array
   * Uses caching to avoid duplicate queries when multiple fields are requested
   */
  climbs: async (parent: ClimbSearchContext): Promise<Climb[]> => {
    // Return cached result if already fetched (e.g., if hasMore was requested first)
    if (parent._cachedClimbs !== undefined) {
      return parent._cachedClimbs;
    }

    const result = await searchClimbsQuery(parent.params, parent.searchParams, parent.userId);

    // Cache results for other field resolvers
    parent._cachedClimbs = result.climbs;
    parent._cachedHasMore = result.hasMore;

    return result.climbs;
  },

  /**
   * Resolve the total count of climbs matching the search criteria
   */
  totalCount: async (parent: ClimbSearchContext): Promise<number> => {
    // Return cached result if already fetched
    if (parent._cachedTotalCount !== undefined) {
      return parent._cachedTotalCount;
    }

    const count = await countClimbs(parent.params, parent.searchParams, parent.sizeEdges, parent.userId);

    // Cache result
    parent._cachedTotalCount = count;

    return count;
  },

  /**
   * Resolve whether there are more pages of results
   */
  hasMore: async (parent: ClimbSearchContext): Promise<boolean> => {
    // Return cached result if already fetched (e.g., if climbs was requested first)
    if (parent._cachedHasMore !== undefined) {
      return parent._cachedHasMore;
    }

    // hasMore comes from the search query, not the count query
    const result = await searchClimbsQuery(parent.params, parent.searchParams, parent.userId);

    // Cache results for other field resolvers
    parent._cachedClimbs = result.climbs;
    parent._cachedHasMore = result.hasMore;

    return result.hasMore;
  },
};
