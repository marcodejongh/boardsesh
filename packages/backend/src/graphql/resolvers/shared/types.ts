import type { Climb } from '@boardsesh/shared-schema';
import type { ParsedBoardRouteParameters, ClimbSearchParams } from '../../../db/queries/climbs/index';
import type { SizeEdges } from '../../../db/queries/util/product-sizes-data';

/**
 * Context object passed from searchClimbs query to ClimbSearchResult field resolvers.
 * This allows each field (climbs, totalCount, hasMore) to be resolved independently.
 */
export type ClimbSearchContext = {
  params: ParsedBoardRouteParameters;
  searchParams: ClimbSearchParams;
  sizeEdges: SizeEdges;
  userId: number | undefined;
  // Cached results to avoid duplicate queries when multiple fields are requested
  _cachedClimbs?: Climb[];
  _cachedHasMore?: boolean;
  _cachedTotalCount?: number;
};

/**
 * Input type for createSession mutation
 */
export type CreateSessionInput = {
  boardPath: string;
  latitude: number;
  longitude: number;
  name?: string;
  discoverable: boolean;
};

/**
 * Maximum retries for version conflicts in queue operations
 */
export const MAX_RETRIES = 3;
