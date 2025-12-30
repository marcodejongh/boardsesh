import 'server-only';
import { unstable_cache } from 'next/cache';
import { GraphQLClient, RequestDocument, Variables } from 'graphql-request';

/**
 * Cache durations for climb search queries (in seconds)
 */
const CACHE_DURATION_DEFAULT_SEARCH = 30 * 24 * 60 * 60; // 30 days for default searches
const CACHE_DURATION_FILTERED_SEARCH = 60 * 60; // 1 hour for filtered searches

/**
 * Get the HTTP GraphQL endpoint URL
 */
function getGraphQLHttpUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (!wsUrl) {
    throw new Error('NEXT_PUBLIC_WS_URL environment variable is not set');
  }

  return wsUrl.replace(/^ws(s?):\/\//, 'http$1://');
}

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
 * Recursively sort object keys for consistent JSON serialization
 */
function sortObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as T;
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }

  return sortedObj as T;
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
