import { createClient, Client, Sink } from 'graphql-ws';
import { connectionManager, KEEP_ALIVE_MS } from '../connection-manager/websocket-connection-manager';
import { context as otelContext, trace, SpanStatusCode } from '@opentelemetry/api';
import { injectTraceContext, extractTraceContext, mergeExtensions, type TraceCarrier } from '@boardsesh/shared-schema';

export type { Client };

const DEBUG = process.env.NODE_ENV === 'development';
const MUTATION_TIMEOUT_MS = 30_000; // 30 second timeout for mutations

import { INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS, BACKOFF_MULTIPLIER } from './retry-constants';

let clientCounter = 0;

// Cache for parsed operation names to avoid regex on every call
const operationNameCache = new WeakMap<{ query: string }, string>();
const tracer = trace.getTracer('boardsesh-web/graphql-ws');

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
  connectionName?: string;
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

  const { url, authToken, onReconnect: onReconnectCallback, connectionName } = options;
  const managerConnectionName = connectionName ?? 'primary';

  const clientId = ++clientCounter;

  if (DEBUG) console.log(`[GraphQL] Creating client #${clientId} for ${url} (authenticated: ${!!authToken})`);

  let hasConnectedOnce = false;

  const client = createClient({
    url,
    retryAttempts: 10, // More attempts with exponential backoff
    shouldRetry: () => true,
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
    keepAlive: KEEP_ALIVE_MS,
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
      },
      error: (error) => {
        if (DEBUG) console.log(`[GraphQL] Client #${clientId} error`, error);
      },
    },
  }) as ExtendedClient;

  // Register with the centralized connection manager for proactive reconnection/health checks
  if (typeof window !== 'undefined') {
    const unregister = connectionManager.registerClient(client, managerConnectionName);
    const originalDispose = client.dispose.bind(client);
    client.dispose = () => {
      unregister();
      originalDispose();
    };
  }

  return client;
}

type OperationInput<TVariables> = {
  query: string;
  variables?: TVariables;
  extensions?: Record<string, unknown>;
};

function pickTraceCarrier(obj: unknown): TraceCarrier | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  const traceparent = typeof record.traceparent === 'string' ? record.traceparent : undefined;
  const tracestate = typeof record.tracestate === 'string' ? record.tracestate : undefined;
  const baggage = typeof record.baggage === 'string' ? record.baggage : undefined;
  if (!traceparent && !tracestate && !baggage) return undefined;
  return { traceparent, tracestate, baggage };
}

/**
 * Execute a GraphQL mutation and return the result as a promise
 * Includes automatic cleanup and timeout handling
 */
export function execute<TData = unknown, TVariables = Record<string, unknown>>(
  client: Client,
  operation: OperationInput<TVariables>,
  timeoutMs: number = MUTATION_TIMEOUT_MS,
): Promise<TData> {
  const opName = getOperationName(operation, 'mutation');

  if (DEBUG) console.log(`[GraphQL] execute START: ${opName}`);

  const span = tracer.startSpan('graphql.ws.mutation', {
    attributes: { operation: opName },
  });
  const ctxWithSpan = trace.setSpan(otelContext.active(), span);

  const executionPromise = otelContext.with(ctxWithSpan, () => new Promise<TData>((resolve, reject) => {
    let result: TData | undefined;
    let hasResolved = false;

    const unsubscribe = client.subscribe<TData>(
      {
        query: operation.query,
        variables: operation.variables as Record<string, unknown>,
        extensions: mergeExtensions(operation.extensions, injectTraceContext(ctxWithSpan)),
      },
      {
        next: (data) => {
          if (DEBUG) console.log(`[GraphQL] execute NEXT: ${opName}`, data.data ? 'has data' : 'no data', data.errors ? 'has errors' : 'no errors');
          // GraphQL can return null data values; keep the latest payload when present.
          if ('data' in data) {
            result = data.data as TData;
          }
          if (data.errors) {
            if (!hasResolved) {
              hasResolved = true;
              unsubscribe();
              span.recordException(new Error(data.errors.map((e) => e.message).join(', ')));
              span.setStatus({ code: SpanStatusCode.ERROR });
              reject(new Error(data.errors.map((e) => e.message).join(', ')));
            }
          }
        },
        error: (err) => {
          if (DEBUG) console.log(`[GraphQL] execute ERROR: ${opName}`, err);
          if (!hasResolved) {
            hasResolved = true;
            unsubscribe();
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
            reject(err);
          }
        },
        complete: () => {
          if (DEBUG) console.log(`[GraphQL] execute COMPLETE: ${opName}`);
          if (!hasResolved) {
            hasResolved = true;
            unsubscribe();
            if (result === undefined) {
              span.setStatus({ code: SpanStatusCode.ERROR, message: 'completed without data' });
              reject(new Error(`GraphQL operation '${opName}' completed without data`));
              return;
            }
            resolve(result);
          }
        },
      },
    );
  }));

  // Add timeout to prevent mutations from hanging forever
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'timeout' });
      reject(new Error(`GraphQL mutation '${opName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([executionPromise, timeoutPromise]).finally(() => span.end());
}

/**
 * Subscribe to a GraphQL subscription and receive events via callback
 * Returns an unsubscribe function
 */
export function subscribe<TData = unknown, TVariables = Record<string, unknown>>(
  client: Client,
  operation: OperationInput<TVariables>,
  sink: Sink<TData>,
): () => void {
  const opName = getOperationName(operation, 'subscription');

  if (DEBUG) console.log(`[GraphQL] subscribe START: ${opName}`);

  return client.subscribe<TData>(
    {
      query: operation.query,
      variables: operation.variables as Record<string, unknown>,
      extensions: mergeExtensions(operation.extensions, injectTraceContext()),
    },
    {
      next: (data) => {
        const payload = data as Record<string, unknown>;
        const carrier =
          pickTraceCarrier(payload.extensions) ||
          pickTraceCarrier(
            typeof payload.data === 'object' && payload.data !== null
              ? Object.values(payload.data as Record<string, unknown>)[0] as Record<string, unknown>
              : undefined
          );
        const parentCtx = carrier ? extractTraceContext(carrier) : otelContext.active();
        const span = tracer.startSpan(
          'graphql.ws.message',
          {
            attributes: {
              operation: opName,
              typename: (data as { data?: { [key: string]: { __typename?: string } } }).data
                ? Object.values((data as { data: Record<string, { __typename?: string }> }).data)[0]?.__typename
                : undefined,
            },
          },
          parentCtx
        );

        otelContext.with(trace.setSpan(parentCtx, span), () => {
          if (DEBUG) console.log(`[GraphQL] subscribe NEXT: ${opName}`);
          if ((data as { data?: TData }).data) {
            sink.next?.((data as { data?: TData }).data!);
          }
          if ((data as { errors?: Error[] }).errors) {
            sink.error?.(new Error((data as { errors?: { message: string }[] }).errors!.map((e) => e.message).join(', ')));
          }
        });
        span.end();
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
