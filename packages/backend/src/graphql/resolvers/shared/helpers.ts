import type { ConnectionContext } from '@boardsesh/shared-schema';
import { checkRateLimit } from '../../../utils/rate-limiter.js';
import { getContext } from '../../context.js';

// Re-export validateInput from validation schemas
export { validateInput } from '../../../validation/schemas.js';
// Re-export MAX_RETRIES from types
export { MAX_RETRIES } from './types.js';

/**
 * Helper to require a session context.
 * Throws if the user is not in a session.
 */
export function requireSession(ctx: ConnectionContext): string {
  if (!ctx.sessionId) {
    console.error(`[Auth] requireSession failed: connectionId=${ctx.connectionId}, sessionId=${ctx.sessionId}`);
    throw new Error(`Must be in a session to perform this operation (connectionId: ${ctx.connectionId})`);
  }
  return ctx.sessionId;
}

/**
 * Helper to require authentication.
 * Throws if the user is not authenticated.
 * Used for operations that require a logged-in user (e.g., creating sessions).
 */
export function requireAuthenticated(ctx: ConnectionContext): void {
  if (!ctx.isAuthenticated) {
    throw new Error('Authentication required to perform this operation');
  }
}

/**
 * Helper to verify user is a member of the session they're trying to access.
 * Used for subscription authorization.
 *
 * This function includes retry logic with exponential backoff to handle race conditions
 * where subscriptions may be authorized before joinSession has completed updating the context.
 * It re-fetches the context from the Map on each retry to get the latest state.
 */
export async function requireSessionMember(
  ctx: ConnectionContext,
  sessionId: string,
  maxRetries = 8,
  initialDelayMs = 50
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    // Re-fetch context to get latest state (joinSession may have updated it)
    const latestCtx = getContext(ctx.connectionId);

    if (latestCtx?.sessionId === sessionId) {
      return; // Success - session matches
    }

    if (i < maxRetries - 1) {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms
      // Total max wait: ~6.4 seconds
      const delay = initialDelayMs * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Final check after all retries
  const finalCtx = getContext(ctx.connectionId);
  if (!finalCtx?.sessionId) {
    console.error(`[Auth] requireSessionMember failed after ${maxRetries} retries: not in any session. connectionId=${ctx.connectionId}, requested=${sessionId}`);
    throw new Error(`Unauthorized: not in any session (connectionId: ${ctx.connectionId}, requested: ${sessionId})`);
  }
  if (finalCtx.sessionId !== sessionId) {
    console.error(`[Auth] requireSessionMember failed: session mismatch. connectionId=${ctx.connectionId}, have=${finalCtx.sessionId}, requested=${sessionId}`);
    throw new Error(`Unauthorized: session mismatch (have: ${finalCtx.sessionId}, requested: ${sessionId})`);
  }
}

/**
 * Apply rate limiting to a connection.
 * @param ctx - Connection context
 * @param limit - Optional custom limit (default: 60 requests per minute)
 */
export function applyRateLimit(ctx: ConnectionContext, limit?: number): void {
  checkRateLimit(ctx.connectionId, limit);
}
