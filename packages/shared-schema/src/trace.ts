import { context as otelContext, propagation, type Context, defaultTextMapGetter, defaultTextMapSetter } from '@opentelemetry/api';

// Lightweight carrier used in GraphQL-WS extensions or event metadata
export type TraceCarrier = {
  traceparent?: string;
  tracestate?: string;
  baggage?: string;
};

/**
 * Inject the current (or provided) context into a plain object that can be
 * attached to GraphQL-WS `extensions` or event metadata.
 */
export function injectTraceContext(parentContext?: Context): TraceCarrier {
  const carrier: Record<string, string> = {};
  propagation.inject(parentContext ?? otelContext.active(), carrier, defaultTextMapSetter);

  const traceparent = carrier['traceparent'];
  const tracestate = carrier['tracestate'];
  const baggage = carrier['baggage'];

  const result: TraceCarrier = {};
  if (traceparent) result.traceparent = traceparent;
  if (tracestate) result.tracestate = tracestate;
  if (baggage) result.baggage = baggage;
  return result;
}

/**
 * Extract a Context from a previously injected carrier. Falls back to the
 * current active context if the carrier is empty.
 */
export function extractTraceContext(carrier?: TraceCarrier): Context {
  const normalizedCarrier = carrier ?? {};
  return propagation.extract(otelContext.active(), normalizedCarrier, defaultTextMapGetter);
}

/**
 * Convenience helper to merge trace context into an extensions object without
 * mutating the original value.
 */
export function mergeExtensions<T extends Record<string, unknown>>(
  extensions: T | undefined,
  trace: TraceCarrier
): T & TraceCarrier {
  return { ...(extensions ?? ({} as T)), ...trace };
}
