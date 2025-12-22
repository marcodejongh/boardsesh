import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { sessions, sessionClients, sessionQueues } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import type { ClimbQueueItem, SessionUser } from '@boardsesh/shared-schema';

// Custom error for version conflicts
export class VersionConflictError extends Error {
  constructor(sessionId: string, expectedVersion: number) {
    super(`Version conflict for session ${sessionId}. Expected version ${expectedVersion} but it was updated by another operation.`);
    this.name = 'VersionConflictError';
  }
}

interface ConnectedClient {
  connectionId: string;
  sessionId: string | null;
  username: string;
  isLeader: boolean;
  connectedAt: Date;
}

class RoomManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private sessions: Map<string, Set<string>> = new Map();
  private activeSessionId: string | null = null;
  private activeSessionBoardPath: string | null = null;

  /**
   * Reset all state (for testing purposes)
   */
  reset(): void {
    this.clients.clear();
    this.sessions.clear();
    this.activeSessionId = null;
    this.activeSessionBoardPath = null;
  }

  registerClient(connectionId: string): string {
    this.clients.set(connectionId, {
      connectionId,
      sessionId: null,
      username: `User-${connectionId.substring(0, 6)}`,
      isLeader: false,
      connectedAt: new Date(),
    });
    return connectionId;
  }

  getClient(connectionId: string): ConnectedClient | undefined {
    return this.clients.get(connectionId);
  }

  getClientById(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  async joinSession(
    connectionId: string,
    sessionId: string,
    boardPath: string,
    username?: string
  ): Promise<{
    clientId: string;
    users: SessionUser[];
    queue: ClimbQueueItem[];
    currentClimbQueueItem: ClimbQueueItem | null;
    isLeader: boolean;
    sessionSwitched: boolean;
    previousSessionClientIds: string[];
  }> {
    const client = this.clients.get(connectionId);
    if (!client) {
      throw new Error('Client not registered');
    }

    // Leave current session if in one
    if (client.sessionId) {
      await this.leaveSession(connectionId);
    }

    // Check if we need to switch sessions (different board path)
    let sessionSwitched = false;
    let previousSessionClientIds: string[] = [];

    if (this.activeSessionId && this.activeSessionBoardPath !== boardPath) {
      // Session switching: get clients to notify and clear old session
      previousSessionClientIds = this.getSessionClients(this.activeSessionId);

      // Clear old session from memory
      this.sessions.delete(this.activeSessionId);

      // Mark all clients in old session as not in a session
      for (const oldClientId of previousSessionClientIds) {
        const oldClient = this.clients.get(oldClientId);
        if (oldClient && oldClientId !== connectionId) {
          oldClient.sessionId = null;
          oldClient.isLeader = false;
        }
      }

      sessionSwitched = true;
      console.log(`Session switched from ${this.activeSessionBoardPath} to ${boardPath}`);
    }

    // Update client info
    client.sessionId = sessionId;
    if (username) {
      client.username = username;
    }

    // Create or get session in memory
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    const sessionClientIds = this.sessions.get(sessionId)!;

    // First client becomes leader
    const isLeader = sessionClientIds.size === 0;
    client.isLeader = isLeader;
    sessionClientIds.add(connectionId);

    // Update active session tracking
    this.activeSessionId = sessionId;
    this.activeSessionBoardPath = boardPath;

    // Persist to database
    await this.persistSessionJoin(sessionId, boardPath, connectionId, client.username, isLeader);

    // Get current session state
    const users = this.getSessionUsers(sessionId);
    const queueState = await this.getQueueState(sessionId);

    return {
      clientId: connectionId,
      users,
      queue: queueState.queue,
      currentClimbQueueItem: queueState.currentClimbQueueItem,
      isLeader,
      sessionSwitched,
      previousSessionClientIds: previousSessionClientIds.filter((c) => c !== connectionId),
    };
  }

  async leaveSession(connectionId: string): Promise<{ sessionId: string; newLeaderId?: string } | null> {
    const client = this.clients.get(connectionId);
    if (!client || !client.sessionId) {
      return null;
    }

    const sessionId = client.sessionId;
    const wasLeader = client.isLeader;

    // Remove from session
    const sessionClientIds = this.sessions.get(sessionId);
    if (sessionClientIds) {
      sessionClientIds.delete(connectionId);

      // Clean up empty sessions
      if (sessionClientIds.size === 0) {
        this.sessions.delete(sessionId);
        // Clear active session tracking if this was the active session
        if (this.activeSessionId === sessionId) {
          this.activeSessionId = null;
          this.activeSessionBoardPath = null;
        }
      }
    }

    // Reset client state
    client.sessionId = null;
    client.isLeader = false;

    // Remove from database
    await this.persistSessionLeave(connectionId);

    // Elect new leader if needed (deterministic: pick earliest connected client)
    let newLeaderId: string | undefined;
    if (wasLeader && sessionClientIds && sessionClientIds.size > 0) {
      // Convert Set to array and sort by connectedAt for deterministic leader election
      const clientsArray = Array.from(sessionClientIds)
        .map((id) => this.clients.get(id))
        .filter((client): client is ConnectedClient => client !== undefined)
        .sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime());

      if (clientsArray.length > 0) {
        const newLeader = clientsArray[0];
        newLeader.isLeader = true;
        newLeaderId = newLeader.connectionId;
        await this.persistLeaderChange(sessionId, newLeaderId);
      }
    }

    return { sessionId, newLeaderId };
  }

  removeClient(connectionId: string): void {
    this.clients.delete(connectionId);
  }

  getSessionUsers(sessionId: string): SessionUser[] {
    const sessionClientIds = this.sessions.get(sessionId);
    if (!sessionClientIds) return [];

    const users: SessionUser[] = [];
    for (const clientId of sessionClientIds) {
      const client = this.clients.get(clientId);
      if (client) {
        users.push({
          id: client.connectionId,
          username: client.username,
          isLeader: client.isLeader,
        });
      }
    }
    return users;
  }

  getSessionClients(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session) : [];
  }

  async updateUsername(connectionId: string, username: string): Promise<void> {
    const client = this.clients.get(connectionId);
    if (client) {
      client.username = username;
      // Persist to database
      await db.update(sessionClients).set({ username }).where(eq(sessionClients.id, connectionId));
    }
  }

  async updateQueueState(
    sessionId: string,
    queue: ClimbQueueItem[],
    currentClimbQueueItem: ClimbQueueItem | null,
    expectedVersion?: number
  ): Promise<number> {
    if (expectedVersion !== undefined) {
      if (expectedVersion === 0) {
        // Version 0 means no row exists yet - use insert with conflict handling
        const result = await db
          .insert(sessionQueues)
          .values({
            sessionId,
            queue,
            currentClimbQueueItem,
            version: 1,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: sessionQueues.sessionId,
            set: {
              queue,
              currentClimbQueueItem,
              version: sql`${sessionQueues.version} + 1`,
              updatedAt: new Date(),
            },
            // Only update if version is still 0
            setWhere: eq(sessionQueues.version, 0),
          })
          .returning({ version: sessionQueues.version });

        if (result.length === 0) {
          throw new VersionConflictError(sessionId, expectedVersion);
        }
        return result[0].version;
      }

      // Optimistic locking: only update if version matches
      const result = await db
        .update(sessionQueues)
        .set({
          queue,
          currentClimbQueueItem,
          version: sql`${sessionQueues.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessionQueues.sessionId, sessionId),
          eq(sessionQueues.version, expectedVersion)
        ))
        .returning({ version: sessionQueues.version });

      if (result.length === 0) {
        throw new VersionConflictError(sessionId, expectedVersion);
      }
      return result[0].version;
    }

    // No version check - insert or update
    const result = await db
      .insert(sessionQueues)
      .values({
        sessionId,
        queue,
        currentClimbQueueItem,
        version: 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessionQueues.sessionId,
        set: {
          queue,
          currentClimbQueueItem,
          version: sql`${sessionQueues.version} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ version: sessionQueues.version });

    return result[0]?.version ?? 1;
  }

  /**
   * Update only the queue without touching currentClimbQueueItem.
   * This avoids race conditions when other operations are modifying currentClimbQueueItem.
   */
  async updateQueueOnly(sessionId: string, queue: ClimbQueueItem[], expectedVersion?: number): Promise<number> {
    if (expectedVersion !== undefined) {
      if (expectedVersion === 0) {
        // Version 0 means no row exists yet - use insert with conflict handling
        // If a row was created between our read and this insert, the conflict will update
        // only if the version is still 0 (which would mean another insert just happened)
        const result = await db
          .insert(sessionQueues)
          .values({
            sessionId,
            queue,
            currentClimbQueueItem: null,
            version: 1,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: sessionQueues.sessionId,
            set: {
              queue,
              version: sql`${sessionQueues.version} + 1`,
              updatedAt: new Date(),
            },
            // Only update if version is still 0 (i.e., the row was just created by another concurrent insert)
            setWhere: eq(sessionQueues.version, 0),
          })
          .returning({ version: sessionQueues.version });

        if (result.length === 0) {
          throw new VersionConflictError(sessionId, expectedVersion);
        }
        return result[0].version;
      }

      // Optimistic locking: only update if version matches
      const result = await db
        .update(sessionQueues)
        .set({
          queue,
          version: sql`${sessionQueues.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessionQueues.sessionId, sessionId),
          eq(sessionQueues.version, expectedVersion)
        ))
        .returning({ version: sessionQueues.version });

      if (result.length === 0) {
        throw new VersionConflictError(sessionId, expectedVersion);
      }
      return result[0].version;
    }

    // No version check
    const result = await db
      .update(sessionQueues)
      .set({
        queue,
        version: sql`${sessionQueues.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(sessionQueues.sessionId, sessionId))
      .returning({ version: sessionQueues.version });

    return result[0]?.version ?? 1;
  }

  async getQueueState(sessionId: string): Promise<{
    queue: ClimbQueueItem[];
    currentClimbQueueItem: ClimbQueueItem | null;
    version: number;
  }> {
    const result = await db.select().from(sessionQueues).where(eq(sessionQueues.sessionId, sessionId)).limit(1);

    if (result.length === 0) {
      return { queue: [], currentClimbQueueItem: null, version: 0 };
    }

    return {
      queue: result[0].queue,
      currentClimbQueueItem: result[0].currentClimbQueueItem,
      version: result[0].version,
    };
  }

  /**
   * Get the active session info for the /join route
   */
  getActiveSession(): { sessionId: string; boardPath: string } | null {
    if (!this.activeSessionId || !this.activeSessionBoardPath) {
      return null;
    }

    // Verify session still has clients
    const sessionClientIds = this.sessions.get(this.activeSessionId);
    if (!sessionClientIds || sessionClientIds.size === 0) {
      this.activeSessionId = null;
      this.activeSessionBoardPath = null;
      return null;
    }

    return {
      sessionId: this.activeSessionId,
      boardPath: this.activeSessionBoardPath,
    };
  }

  private async persistSessionJoin(
    sessionId: string,
    boardPath: string,
    clientId: string,
    username: string,
    isLeader: boolean
  ): Promise<void> {
    // Ensure session exists
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        boardPath,
        lastActivity: new Date(),
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: { boardPath, lastActivity: new Date() },
      });

    // Add client to session
    await db
      .insert(sessionClients)
      .values({
        id: clientId,
        sessionId,
        username,
        isLeader,
      })
      .onConflictDoUpdate({
        target: sessionClients.id,
        set: { sessionId, username, isLeader },
      });
  }

  private async persistSessionLeave(clientId: string): Promise<void> {
    await db.delete(sessionClients).where(eq(sessionClients.id, clientId));
  }

  private async persistLeaderChange(sessionId: string, newLeaderId: string): Promise<void> {
    // Remove leader status from all clients in session
    await db.update(sessionClients).set({ isLeader: false }).where(eq(sessionClients.sessionId, sessionId));

    // Set new leader
    await db.update(sessionClients).set({ isLeader: true }).where(eq(sessionClients.id, newLeaderId));
  }
}

export const roomManager = new RoomManager();
