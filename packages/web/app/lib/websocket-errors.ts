/**
 * WebSocket error detection utilities
 *
 * Shared utilities for detecting and handling WebSocket connection errors,
 * particularly origin/CORS related issues that occur on some browsers.
 */

/**
 * Known WebSocket connection error messages that indicate origin/CORS issues.
 * These are browser-specific error messages that can occur during WebSocket handshake.
 */
export const ORIGIN_ERROR_PATTERNS = [
  'invalid origin',
  'origin not allowed',
] as const;

/**
 * Check if an error message indicates an origin/CORS issue.
 * These errors are typically caused by:
 * - Browser privacy/tracking protection blocking WebSocket connections
 * - Server CORS configuration not allowing the origin
 * - Network issues during WebSocket handshake on some browsers
 *
 * Returns false for empty/null/undefined input to handle edge cases safely.
 */
export function isOriginError(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }
  const lowerMessage = errorMessage.toLowerCase();
  return ORIGIN_ERROR_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Additional patterns that indicate WebSocket-specific connection errors
 * that are expected during normal operation and shouldn't be reported to Sentry.
 *
 * These patterns are intentionally specific to avoid filtering legitimate errors:
 * - 'websocket is already in closing' - WebSocket state transition (not an error)
 * - 'graphql subscription' - Expected subscription lifecycle events
 *
 * Note: We intentionally do NOT include generic patterns like:
 * - 'websocket connection to' - too broad, would match legitimate connection failures
 * - 'connection closed' - too generic, could be API or other connection errors
 * - 'failed to fetch' - too generic, would hide real API failures
 */
export const WEBSOCKET_LIFECYCLE_PATTERNS = [
  'websocket is already in closing',
  'graphql subscription',
] as const;

/**
 * Check if an error is a known WebSocket lifecycle error that shouldn't be
 * reported to Sentry. This is more specific than isOriginError and only
 * matches errors that are clearly WebSocket-related lifecycle events.
 *
 * Returns false for empty/null/undefined input to handle edge cases safely.
 */
export function isWebSocketLifecycleError(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }
  const lowerMessage = errorMessage.toLowerCase();
  return WEBSOCKET_LIFECYCLE_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Combined check for errors that should be filtered from Sentry.
 * Only filters errors that are clearly WebSocket/origin related,
 * not generic network errors.
 *
 * Returns false for empty/null/undefined input to handle edge cases safely.
 */
export function shouldFilterFromSentry(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }
  return isOriginError(errorMessage) || isWebSocketLifecycleError(errorMessage);
}
