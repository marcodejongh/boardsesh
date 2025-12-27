import { v4 as uuidv4 } from 'uuid';
import type { ConnectionContext } from '@boardsesh/shared-schema';

/**
 * Module-level map to track connection contexts.
 * This allows us to look up session info by connectionId.
 */
const connections = new Map<string, ConnectionContext>();

/**
 * Create a new connection context.
 * Called when a WebSocket connection is established.
 */
export function createContext(connectionId?: string, isAuthenticated?: boolean, userId?: string): ConnectionContext {
  const id = connectionId || uuidv4();
  const context: ConnectionContext = {
    connectionId: id,
    sessionId: undefined,
    userId: userId,
    isAuthenticated: isAuthenticated || false,
  };
  connections.set(id, context);
  console.log(`[Context] createContext: ${id} (authenticated: ${isAuthenticated}, userId: ${userId}). Total connections: ${connections.size}`);
  return context;
}

/**
 * Get an existing connection context by ID.
 */
export function getContext(connectionId: string): ConnectionContext | undefined {
  return connections.get(connectionId);
}

/**
 * Update an existing connection context.
 * Used when a user joins/leaves a session.
 * Throws an error if the context doesn't exist (prevents silent failures).
 */
export function updateContext(
  connectionId: string,
  updates: Partial<Omit<ConnectionContext, 'connectionId'>>
): void {
  const context = connections.get(connectionId);
  if (!context) {
    console.error(`[Context] updateContext FAILED: connection ${connectionId} not found. Map has ${connections.size} entries.`);
    console.error('[Context] Known connections:', Array.from(connections.keys()));
    throw new Error(`Cannot update context: connection ${connectionId} not found`);
  }

  console.log(`[Context] updateContext: ${connectionId} -> sessionId=${updates.sessionId}, userId=${updates.userId}`);

  if (updates.sessionId !== undefined) {
    context.sessionId = updates.sessionId;
  }
  if (updates.userId !== undefined) {
    context.userId = updates.userId;
  }
  if (updates.isAuthenticated !== undefined) {
    context.isAuthenticated = updates.isAuthenticated;
  }
}

/**
 * Remove a connection context.
 * Called when a WebSocket connection is closed.
 * @returns The removed context, or undefined if not found
 */
export function removeContext(connectionId: string): ConnectionContext | undefined {
  const context = connections.get(connectionId);
  connections.delete(connectionId);
  return context;
}

/**
 * Get all connection IDs for a given session.
 * Useful for broadcasting to all users in a session.
 */
export function getConnectionsForSession(sessionId: string): string[] {
  const result: string[] = [];
  for (const [connId, ctx] of connections) {
    if (ctx.sessionId === sessionId) {
      result.push(connId);
    }
  }
  return result;
}

/**
 * Get total count of active connections.
 * Useful for debugging.
 */
export function getConnectionCount(): number {
  return connections.size;
}
