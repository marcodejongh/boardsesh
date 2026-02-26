import 'server-only';
import { unstable_cache } from 'next/cache';
import { GraphQLClient, RequestDocument, Variables } from 'graphql-request';
import { sortObjectKeys } from '@/app/lib/cache-utils';
import { getGraphQLHttpUrl } from './client';

/**
 * Cache durations for climb search queries (in seconds)
 */
const CACHE_DURATION_DEFAULT_SEARCH = 30 * 24 * 60 * 60; // 30 days for default searches
const CACHE_DURATION_FILTERED_SEARCH = 60 * 60; // 1 hour for filtered searches

/**
 * Execute a GraphQL query via HTTP (non-cached version for internal use)
 */
async function executeGraphQLInternal<T = unknown, V extends Variables = Variables>(
  document: RequestDocument,
  variables?: V,
): Promise<T> {
  const url = getGraphQLHttpUrl();
  const client = new GraphQLClient(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return client.request<T>(document, variables);
}

/**
 * Create a stable cache key from GraphQL variables
 * Recursively sorts all object keys to ensure consistent key generation
 */
function createCacheKeyFromVariables(variables: Variables | undefined): string[] {
  if (!variables) return ['no-variables'];

  // Recursively sort all keys for stable JSON representation
  const sortedVariables = sortObjectKeys(variables);
  return [JSON.stringify(sortedVariables)];
}

/**
 * Execute a cached GraphQL query for server-side rendering
 *
 * Uses Next.js unstable_cache to cache results at the data cache layer.
 * This ensures repeated requests with the same parameters return cached data.
 *
 * @param document - GraphQL query document
 * @param variables - Query variables
 * @param cacheTag - Tag for cache invalidation (e.g., 'climb-search')
 * @param revalidate - Cache duration in seconds
 */
export function createCachedGraphQLQuery<T = unknown, V extends Variables = Variables>(
  document: RequestDocument,
  cacheTag: string,
  revalidate: number,
) {
  return async (variables?: V): Promise<T> => {
    const cachedFn = unstable_cache(
      async () => executeGraphQLInternal<T, V>(document, variables),
      ['graphql', cacheTag, ...createCacheKeyFromVariables(variables)],
      {
        revalidate,
        tags: [cacheTag],
      }
    );

    return cachedFn();
  };
}

/**
 * Search input type for climb search queries
 */
interface ClimbSearchInput {
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  page?: number;
  pageSize?: number;
  gradeAccuracy?: string;
  minGrade?: number;
  maxGrade?: number;
  minAscents?: number;
  sortBy?: string;
  sortOrder?: string;
  name?: string;
  setter?: string | string[];
}

/**
 * Pre-configured cached query for climb search
 *
 * @param document - GraphQL query document
 * @param variables - Query variables containing { input: ClimbSearchInput }
 * @param isDefaultSearch - Whether this is a default/unfiltered search (caches longer)
 */
export async function cachedSearchClimbs<T = unknown>(
  document: RequestDocument,
  variables: { input: ClimbSearchInput },
  isDefaultSearch: boolean = false,
): Promise<T> {
  const revalidate = isDefaultSearch
    ? CACHE_DURATION_DEFAULT_SEARCH
    : CACHE_DURATION_FILTERED_SEARCH;

  const { input } = variables;

  // Build explicit cache key with board identifiers as separate segments
  // This ensures cache hits/misses are correctly differentiated by board configuration
  const cacheKey = [
    'graphql',
    'climb-search',
    input.boardName,
    String(input.layoutId),
    String(input.sizeId),
    input.setIds,
    String(input.angle),
    // Include filter params as a sorted JSON string
    JSON.stringify(sortObjectKeys({
      page: input.page,
      pageSize: input.pageSize,
      gradeAccuracy: input.gradeAccuracy,
      minGrade: input.minGrade,
      maxGrade: input.maxGrade,
      minAscents: input.minAscents,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      name: input.name,
      setter: input.setter,
    })),
  ];

  const cachedFn = unstable_cache(
    async () => executeGraphQLInternal<T>(document, variables),
    cacheKey,
    {
      revalidate,
      tags: ['climb-search'],
    }
  );

  return cachedFn();
}

/**
 * Execute a GraphQL query with an auth token (non-cached, per-user data)
 */
async function executeAuthenticatedGraphQL<T = unknown, V extends Variables = Variables>(
  document: RequestDocument,
  variables?: V,
  authToken?: string,
): Promise<T> {
  const url = getGraphQLHttpUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const client = new GraphQLClient(url, { headers });
  return client.request<T>(document, variables);
}

type ActivityFeedResult = { items: import('@boardsesh/shared-schema').ActivityFeedItem[]; cursor: string | null; hasMore: boolean };

/**
 * Cached server-side trending feed query.
 * Used for SSR on the home page for unauthenticated users.
 */
export async function cachedTrendingFeed(
  sortBy: string = 'new',
  boardUuid?: string,
) {
  const { GET_TRENDING_FEED } = await import('@/app/lib/graphql/operations/activity-feed');

  const query = createCachedGraphQLQuery<{ trendingFeed: ActivityFeedResult }>(
    GET_TRENDING_FEED,
    'trending-feed',
    300, // 5 min cache
  );

  const result = await query({ input: { sortBy, boardUuid, limit: 20 } });
  return result.trendingFeed;
}

/**
 * Server-side activity feed for authenticated users.
 * Probes personalized feed first; falls back to trending if empty.
 * NOT cached — personalized data is per-user.
 */
export async function serverActivityFeed(
  authToken: string,
  sortBy: string = 'new',
  boardUuid?: string,
): Promise<{ result: ActivityFeedResult; source: 'personalized' | 'trending' }> {
  const { GET_ACTIVITY_FEED } = await import('@/app/lib/graphql/operations/activity-feed');

  const input = { sortBy, boardUuid, limit: 20 };

  try {
    const response = await executeAuthenticatedGraphQL<{ activityFeed: ActivityFeedResult }>(
      GET_ACTIVITY_FEED,
      { input },
      authToken,
    );

    if (response.activityFeed.items.length > 0) {
      return { result: response.activityFeed, source: 'personalized' };
    }
  } catch {
    // Personalized feed failed, fall through to trending
  }

  // Fall back to trending
  const trendingResult = await cachedTrendingFeed(sortBy, boardUuid);
  return { result: trendingResult, source: 'trending' };
}
