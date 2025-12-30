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
 * Create a stable cache key from GraphQL variables
 * Sorts object keys to ensure consistent key generation
 */
function createCacheKeyFromVariables(variables: Variables | undefined): string[] {
  if (!variables) return ['no-variables'];

  // Create a stable JSON representation by sorting keys
  const sortedJson = JSON.stringify(variables, Object.keys(variables).sort());
  return [sortedJson];
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
 * Pre-configured cached query for climb search
 *
 * @param document - GraphQL query document
 * @param variables - Query variables
 * @param isDefaultSearch - Whether this is a default/unfiltered search (caches longer)
 */
export async function cachedSearchClimbs<T = unknown>(
  document: RequestDocument,
  variables: Variables,
  isDefaultSearch: boolean = false,
): Promise<T> {
  const revalidate = isDefaultSearch
    ? CACHE_DURATION_DEFAULT_SEARCH
    : CACHE_DURATION_FILTERED_SEARCH;

  const cachedFn = unstable_cache(
    async () => executeGraphQLInternal<T>(document, variables),
    ['graphql', 'climb-search', ...createCacheKeyFromVariables(variables)],
    {
      revalidate,
      tags: ['climb-search'],
    }
  );

  return cachedFn();
}
