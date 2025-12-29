import { GraphQLClient, RequestDocument, Variables } from 'graphql-request';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Get the HTTP GraphQL endpoint URL
 * Converts WebSocket URL to HTTP URL if needed
 */
function getGraphQLHttpUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (!wsUrl) {
    throw new Error('NEXT_PUBLIC_WS_URL environment variable is not set');
  }

  // Convert ws:// to http:// and wss:// to https://
  return wsUrl.replace(/^ws(s?):\/\//, 'http$1://');
}

/**
 * Create a GraphQL HTTP client for queries and mutations
 * Uses graphql-request for simple HTTP transport
 */
export function createGraphQLHttpClient(authToken?: string | null): GraphQLClient {
  const url = getGraphQLHttpUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (DEBUG) {
    console.log(`[GraphQL HTTP] Creating client for ${url} (authenticated: ${!!authToken})`);
  }

  return new GraphQLClient(url, { headers });
}

/**
 * Execute a GraphQL query or mutation via HTTP
 * This is a convenience wrapper for one-off requests
 */
export async function executeGraphQL<T = unknown, V extends Variables = Variables>(
  document: RequestDocument,
  variables?: V,
  authToken?: string | null,
): Promise<T> {
  const client = createGraphQLHttpClient(authToken);

  if (DEBUG) {
    console.log('[GraphQL HTTP] Executing request');
  }

  return client.request<T>(document, variables);
}

/**
 * Get the base GraphQL HTTP URL for use with fetch or other clients
 */
export function getGraphQLUrl(): string {
  return getGraphQLHttpUrl();
}
