import { createClient, Client, Sink } from 'graphql-ws';

export type { Client };

const DEBUG = process.env.NODE_ENV === 'development';
const MUTATION_TIMEOUT_MS = 30_000; // 30 second timeout for mutations

// Exponential backoff configuration for reconnection
const INITIAL_RETRY_DELAY_MS = 1000; // Start with 1 second
const MAX_RETRY_DELAY_MS = 30_000; // Cap at 30 seconds
const BACKOFF_MULTIPLIER = 2; // Double the delay each retry

let clientCounter = 0;

/**
 * Known WebSocket connection error messages that indicate origin/CORS issues.
 * These are browser-specific error messages that can occur during WebSocket handshake.
 */
const ORIGIN_ERROR_PATTERNS = [
  'invalid origin',
  'origin not allowed',
  'cors',
  'cross-origin',
];

/**
 * Check if an error message indicates an origin/CORS issue
 */
function isOriginError(errorMessage: string): boolean {
  const lowerMessage = errorMessage.toLowerCase();
  return ORIGIN_ERROR_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Create a wrapped WebSocket class that provides better error handling
 * for connection failures, especially origin/CORS related issues.
 *
 * This is needed because some browsers (especially Safari/WebKit on iOS)
 * throw cryptic "invalid origin" errors during WebSocket handshake that
 * can become unhandled rejections.
 */
function createWrappedWebSocket(clientId: number): typeof WebSocket {
  return class WrappedWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      try {
        super(url, protocols);

        // Add an early error handler to catch connection failures
        // before graphql-ws sets up its handlers
        const earlyErrorHandler = (event: Event) => {
          const errorEvent = event as ErrorEvent;
          const errorMessage = errorEvent.message || 'Unknown WebSocket error';

          if (DEBUG) {
            console.log(`[GraphQL] Client #${clientId} early WebSocket error:`, errorMessage);
          }

          // Log origin-related errors with more context
          if (isOriginError(errorMessage)) {
            console.warn(
              `[GraphQL] Client #${clientId} WebSocket connection failed due to origin validation. ` +
              `This may be caused by browser privacy settings, network issues, or CORS configuration. ` +
              `Error: ${errorMessage}`
            );
          }

          // Remove this handler after it fires once - graphql-ws will handle subsequent errors
          this.removeEventListener('error', earlyErrorHandler);
        };

        this.addEventListener('error', earlyErrorHandler);

        // Also handle immediate close with reason
        const earlyCloseHandler = (event: CloseEvent) => {
          if (event.code !== 1000 && event.reason) {
            if (DEBUG) {
              console.log(`[GraphQL] Client #${clientId} early WebSocket close:`, event.code, event.reason);
            }

            if (isOriginError(event.reason)) {
              console.warn(
                `[GraphQL] Client #${clientId} WebSocket connection rejected. ` +
                `Reason: ${event.reason} (code: ${event.code})`
              );
            }
          }
          this.removeEventListener('close', earlyCloseHandler);
        };

        this.addEventListener('close', earlyCloseHandler);
      } catch (error) {
        // WebSocket constructor can throw for invalid URLs
        console.error(`[GraphQL] Client #${clientId} WebSocket construction failed:`, error);
        throw error;
      }
    }
  };
}

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

export interface GraphQLClientOptions {
  url: string;
  authToken?: string | null;
  onReconnect?: () => void;
}

/**
 * Creates a GraphQL-WS client for connecting to the Boardsesh backend
 * @param options - Client configuration including URL and optional auth token
 */
export function createGraphQLClient(options: GraphQLClientOptions): ExtendedClient;
/**
 * @deprecated Use options object instead. This signature will be removed in a future version.
 */
export function createGraphQLClient(url: string, onReconnect?: () => void): ExtendedClient;
export function createGraphQLClient(
  urlOrOptions: string | GraphQLClientOptions,
  onReconnect?: () => void,
): ExtendedClient {
  // Handle both signatures for backwards compatibility
  const options: GraphQLClientOptions = typeof urlOrOptions === 'string'
    ? { url: urlOrOptions, onReconnect }
    : urlOrOptions;

  const { url, authToken, onReconnect: onReconnectCallback } = options;

  const clientId = ++clientCounter;

  if (DEBUG) console.log(`[GraphQL] Creating client #${clientId} for ${url} (authenticated: ${!!authToken})`);

  let hasConnectedOnce = false;

  // Create wrapped WebSocket for better error handling
  const WrappedWebSocket = createWrappedWebSocket(clientId);

  const client = createClient({
    url,
    // Use our wrapped WebSocket for better error handling
    webSocketImpl: WrappedWebSocket,
    retryAttempts: 10, // More attempts with exponential backoff
    shouldRetry: (errOrCloseEvent) => {
      // Don't retry on origin/CORS errors - these won't resolve without config changes
      if (errOrCloseEvent instanceof Error && isOriginError(errOrCloseEvent.message)) {
        console.warn(`[GraphQL] Client #${clientId} not retrying due to origin error`);
        return false;
      }
      if (errOrCloseEvent instanceof CloseEvent && errOrCloseEvent.reason && isOriginError(errOrCloseEvent.reason)) {
        console.warn(`[GraphQL] Client #${clientId} not retrying due to origin rejection`);
        return false;
      }
      return true;
    },
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
    retryWait: async (retryCount) => {
      const delay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount),
        MAX_RETRY_DELAY_MS,
      );
      if (DEBUG) console.log(`[GraphQL] Client #${clientId} retry #${retryCount + 1}, waiting ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    },
    // Lazy connection - only connects when first subscription/mutation is made
    lazy: true,
    // Keep alive to detect disconnections
    keepAlive: 10_000,
    // Pass auth token in connection params for backend validation
    connectionParams: authToken ? { authToken } : undefined,
    on: {
      connected: () => {
        if (DEBUG) console.log(`[GraphQL] Client #${clientId} connected (first: ${!hasConnectedOnce})`);
        if (hasConnectedOnce && onReconnectCallback) {
          if (DEBUG) console.log(`[GraphQL] Client #${clientId} reconnected, calling onReconnect`);
          onReconnectCallback();
        }
        hasConnectedOnce = true;
      },
      closed: (event) => {
        if (DEBUG) console.log(`[GraphQL] Client #${clientId} closed`, event);

        // Log meaningful close events
        if (event && typeof event === 'object') {
          const closeEvent = event as CloseEvent;
          if (closeEvent.code !== 1000 && closeEvent.reason) {
            if (isOriginError(closeEvent.reason)) {
              console.error(
                `[GraphQL] Client #${clientId} connection closed due to origin validation failure. ` +
                `This usually indicates a CORS configuration issue or browser privacy settings blocking the connection.`
              );
            }
          }
        }
      },
      error: (error) => {
        // Extract error message for better logging
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isOriginError(errorMessage)) {
          // Provide more context for origin-related errors
          console.error(
            `[GraphQL] Client #${clientId} origin validation error: ${errorMessage}. ` +
            `This can be caused by:\n` +
            `  1. Browser privacy/tracking protection blocking the WebSocket connection\n` +
            `  2. Network issues during the WebSocket handshake\n` +
            `  3. Server CORS configuration not allowing this origin\n` +
            `Please try refreshing the page or check your browser settings.`
          );
        } else if (DEBUG) {
          console.log(`[GraphQL] Client #${clientId} error`, error);
        }
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
