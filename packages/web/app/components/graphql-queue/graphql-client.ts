import { createClient, Client, Sink } from 'graphql-ws';

export type { Client };

/**
 * Creates a GraphQL-WS client for connecting to the BoardSesh daemon
 */
export function createGraphQLClient(url: string): Client {
  return createClient({
    url,
    retryAttempts: 5,
    shouldRetry: () => true,
    // Lazy connection - only connects when first subscription/mutation is made
    lazy: true,
    // Keep alive to detect disconnections
    keepAlive: 10_000,
  });
}

/**
 * Execute a GraphQL mutation and return the result as a promise
 */
export function execute<TData = unknown, TVariables = Record<string, unknown>>(
  client: Client,
  operation: { query: string; variables?: TVariables },
): Promise<TData> {
  return new Promise((resolve, reject) => {
    let result: TData;
    client.subscribe<TData>(
      { query: operation.query, variables: operation.variables as Record<string, unknown> },
      {
        next: (data) => {
          if (data.data) {
            result = data.data;
          }
          if (data.errors) {
            reject(new Error(data.errors.map((e) => e.message).join(', ')));
          }
        },
        error: reject,
        complete: () => resolve(result),
      },
    );
  });
}

/**
 * Subscribe to a GraphQL subscription and receive events via callback
 * Returns an unsubscribe function
 */
export function subscribe<TData = unknown, TVariables = Record<string, unknown>>(
  client: Client,
  operation: { query: string; variables?: TVariables },
  sink: Sink<TData>,
): () => void {
  return client.subscribe<TData>(
    { query: operation.query, variables: operation.variables as Record<string, unknown> },
    {
      next: (data) => {
        if (data.data) {
          sink.next?.(data.data);
        }
        if (data.errors) {
          sink.error?.(new Error(data.errors.map((e) => e.message).join(', ')));
        }
      },
      error: (error) => sink.error?.(error),
      complete: () => sink.complete?.(),
    },
  );
}
