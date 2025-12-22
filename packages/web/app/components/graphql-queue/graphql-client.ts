import { createClient, Client, Sink } from 'graphql-ws';

export type { Client };

const DEBUG = process.env.NODE_ENV === 'development';
const MUTATION_TIMEOUT_MS = 30_000; // 30 second timeout for mutations

let clientCounter = 0;

// Cache for parsed operation names to avoid regex on every call
const operationNameCache = new WeakMap<{ query: string }, string>();

function getOperationName(operation: { query: string }, type: 'mutation' | 'query' | 'subscription'): string {
  const cached = operationNameCache.get(operation);
  if (cached) return cached;

  const pattern = type === 'subscription'
    ? /subscription\s+(\w+)/
    : /(?:mutation|query)\s+(\w+)/;
  const match = operation.query.match(pattern);
  const name = match ? match[1] : 'unknown';
  operationNameCache.set(operation, name);
  return name;
}

export interface ExtendedClient extends Client {
  onReconnect?: (callback: () => void) => void;
}

/**
 * Creates a GraphQL-WS client for connecting to the BoardSesh backend
 */
export function createGraphQLClient(
  url: string,
  onReconnect?: () => void,
): ExtendedClient {
  const clientId = ++clientCounter;

  if (DEBUG) console.log(`[GraphQL] Creating client #${clientId} for ${url}`);

  let hasConnectedOnce = false;

  const client = createClient({
    url,
    retryAttempts: 5,
    shouldRetry: () => true,
    // Lazy connection - only connects when first subscription/mutation is made
    lazy: true,
    // Keep alive to detect disconnections
    keepAlive: 10_000,
    on: {
      connected: () => {
        if (DEBUG) console.log(`[GraphQL] Client #${clientId} connected (first: ${!hasConnectedOnce})`);
        if (hasConnectedOnce && onReconnect) {
          if (DEBUG) console.log(`[GraphQL] Client #${clientId} reconnected, calling onReconnect`);
          onReconnect();
        }
        hasConnectedOnce = true;
      },
      closed: (event) => {
        if (DEBUG) console.log(`[GraphQL] Client #${clientId} closed`, event);
      },
      error: (error) => {
        if (DEBUG) console.log(`[GraphQL] Client #${clientId} error`, error);
      },
    },
  }) as ExtendedClient;

  return client;
}

/**
 * Execute a GraphQL mutation and return the result as a promise
 * Includes automatic cleanup and timeout handling
 */
export function execute<TData = unknown, TVariables = Record<string, unknown>>(
  client: Client,
  operation: { query: string; variables?: TVariables },
  timeoutMs: number = MUTATION_TIMEOUT_MS,
): Promise<TData> {
  const opName = getOperationName(operation, 'mutation');

  if (DEBUG) console.log(`[GraphQL] execute START: ${opName}`);

  const executionPromise = new Promise<TData>((resolve, reject) => {
    let result: TData;
    let hasResolved = false;

    const unsubscribe = client.subscribe<TData>(
      { query: operation.query, variables: operation.variables as Record<string, unknown> },
      {
        next: (data) => {
          if (DEBUG) console.log(`[GraphQL] execute NEXT: ${opName}`, data.data ? 'has data' : 'no data', data.errors ? 'has errors' : 'no errors');
          if (data.data) {
            result = data.data;
          }
          if (data.errors) {
            if (!hasResolved) {
              hasResolved = true;
              unsubscribe();
              reject(new Error(data.errors.map((e) => e.message).join(', ')));
            }
          }
        },
        error: (err) => {
          if (DEBUG) console.log(`[GraphQL] execute ERROR: ${opName}`, err);
          if (!hasResolved) {
            hasResolved = true;
            unsubscribe();
            reject(err);
          }
        },
        complete: () => {
          if (DEBUG) console.log(`[GraphQL] execute COMPLETE: ${opName}`);
          if (!hasResolved) {
            hasResolved = true;
            unsubscribe();
            resolve(result);
          }
        },
      },
    );
  });

  // Add timeout to prevent mutations from hanging forever
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`GraphQL mutation '${opName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([executionPromise, timeoutPromise]);
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
  const opName = getOperationName(operation, 'subscription');

  if (DEBUG) console.log(`[GraphQL] subscribe START: ${opName}`);

  return client.subscribe<TData>(
    { query: operation.query, variables: operation.variables as Record<string, unknown> },
    {
      next: (data) => {
        if (DEBUG) console.log(`[GraphQL] subscribe NEXT: ${opName}`);
        if (data.data) {
          sink.next?.(data.data);
        }
        if (data.errors) {
          sink.error?.(new Error(data.errors.map((e) => e.message).join(', ')));
        }
      },
      error: (error) => {
        if (DEBUG) console.log(`[GraphQL] subscribe ERROR: ${opName}`, error);
        sink.error?.(error);
      },
      complete: () => {
        if (DEBUG) console.log(`[GraphQL] subscribe COMPLETE: ${opName}`);
        sink.complete?.();
      },
    },
  );
}
