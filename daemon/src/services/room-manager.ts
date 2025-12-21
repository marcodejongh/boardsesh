import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { sessions, sessionClients, sessionQueues } from '../db/schema.js';
import { eq, lt } from 'drizzle-orm';
import type { ClimbQueueItem, SessionUser } from '../types/messages.js';

interface ConnectedClient {
  ws: WebSocket;
  clientId: string;
  sessionId: string | null;
  username: string;
  isLeader: boolean;
  connectedAt: Date;
}

// Session TTL in milliseconds (24 hours)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
// Cleanup interval (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

class RoomManager {
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private sessions: Map<string, Set<WebSocket>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Reset all state (for testing purposes)
   */
  reset(): void {
    this.clients.clear();
    this.sessions.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  registerClient(ws: WebSocket): string {
    const clientId = uuidv4();
    this.clients.set(ws, {
      ws,
      clientId,
      sessionId: null,
      username: `User-${clientId.substring(0, 6)}`,
      isLeader: false,
      connectedAt: new Date(),
    });
    return clientId;
  }

  getClient(ws: WebSocket): ConnectedClient | undefined {
    return this.clients.get(ws);
  }

  getClientById(clientId: string): ConnectedClient | undefined {
    for (const client of this.clients.values()) {
      if (client.clientId === clientId) {
        return client;
      }
    }
    return undefined;
  }

  async joinSession(ws: WebSocket, sessionId: string, username?: string): Promise<{
    clientId: string;
    users: SessionUser[];
    queue: ClimbQueueItem[];
    currentClimbQueueItem: ClimbQueueItem | null;
    isLeader: boolean;
  }> {
    const client = this.clients.get(ws);
    if (!client) {
      throw new Error('Client not registered');
    }

    // Leave current session if in one
    if (client.sessionId) {
      await this.leaveSession(ws);
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
    const sessionClients = this.sessions.get(sessionId)!;

    // First client becomes leader
    const isLeader = sessionClients.size === 0;
    client.isLeader = isLeader;
    sessionClients.add(ws);

    // Persist to database
    await this.persistSessionJoin(sessionId, client.clientId, client.username, isLeader);

    // Get current session state
    const users = this.getSessionUsers(sessionId);
    const queueState = await this.getQueueState(sessionId);

    return {
      clientId: client.clientId,
      users,
      queue: queueState.queue,
      currentClimbQueueItem: queueState.currentClimbQueueItem,
      isLeader,
    };
  }

  async leaveSession(ws: WebSocket): Promise<{ sessionId: string; newLeaderId?: string } | null> {
    const client = this.clients.get(ws);
    if (!client || !client.sessionId) {
      return null;
    }

    const sessionId = client.sessionId;
    const wasLeader = client.isLeader;

    // Remove from session
    const sessionClients = this.sessions.get(sessionId);
    if (sessionClients) {
      sessionClients.delete(ws);

      // Clean up empty sessions
      if (sessionClients.size === 0) {
        this.sessions.delete(sessionId);
      }
    }

    // Reset client state
    client.sessionId = null;
    client.isLeader = false;

    // Remove from database
    await this.persistSessionLeave(client.clientId);

    // Elect new leader if needed (deterministic: pick earliest connected client)
    let newLeaderId: string | undefined;
    if (wasLeader && sessionClients && sessionClients.size > 0) {
      // Convert Set to array and sort by connectedAt for deterministic leader election
      const clientsArray = Array.from(sessionClients)
        .map((ws) => this.clients.get(ws))
        .filter((client): client is ConnectedClient => client !== undefined)
        .sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime());

      if (clientsArray.length > 0) {
        const newLeader = clientsArray[0];
        newLeader.isLeader = true;
        newLeaderId = newLeader.clientId;
        await this.persistLeaderChange(sessionId, newLeaderId);
      }
    }

    return { sessionId, newLeaderId };
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
  }

  getSessionUsers(sessionId: string): SessionUser[] {
    const sessionClients = this.sessions.get(sessionId);
    if (!sessionClients) return [];

    const users: SessionUser[] = [];
    for (const clientWs of sessionClients) {
      const client = this.clients.get(clientWs);
      if (client) {
        users.push({
          id: client.clientId,
          username: client.username,
          isLeader: client.isLeader,
        });
      }
    }
    return users;
  }

  getSessionClients(sessionId: string): WebSocket[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session) : [];
  }

  async updateUsername(ws: WebSocket, username: string): Promise<void> {
    const client = this.clients.get(ws);
    if (client) {
      client.username = username;
      // Persist to database
      await db
        .update(sessionClients)
        .set({ username })
        .where(eq(sessionClients.id, client.clientId));
    }
  }

  async updateQueueState(
    sessionId: string,
    queue: ClimbQueueItem[],
    currentClimbQueueItem: ClimbQueueItem | null
  ): Promise<void> {
    await db
      .insert(sessionQueues)
      .values({
        sessionId,
        queue,
        currentClimbQueueItem,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessionQueues.sessionId,
        set: {
          queue,
          currentClimbQueueItem,
          updatedAt: new Date(),
        },
      });
  }

  async getQueueState(sessionId: string): Promise<{
    queue: ClimbQueueItem[];
    currentClimbQueueItem: ClimbQueueItem | null;
  }> {
    const result = await db
      .select()
      .from(sessionQueues)
      .where(eq(sessionQueues.sessionId, sessionId))
      .limit(1);

    if (result.length === 0) {
      return { queue: [], currentClimbQueueItem: null };
    }

    return {
      queue: result[0].queue,
      currentClimbQueueItem: result[0].currentClimbQueueItem,
    };
  }

  private async persistSessionJoin(
    sessionId: string,
    clientId: string,
    username: string,
    isLeader: boolean
  ): Promise<void> {
    // Ensure session exists
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        lastActivity: new Date(),
      })
      .onConflictDoUpdate({
        target: sessions.id,
        set: { lastActivity: new Date() },
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
    await db
      .update(sessionClients)
      .set({ isLeader: false })
      .where(eq(sessionClients.sessionId, sessionId));

    // Set new leader
    await db
      .update(sessionClients)
      .set({ isLeader: true })
      .where(eq(sessionClients.id, newLeaderId));
  }

  /**
   * Start the periodic cleanup of inactive sessions
   */
  startCleanupInterval(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }

    console.log('Starting session cleanup interval (every 1 hour)');
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions().catch((error) => {
        console.error('Error during session cleanup:', error);
      });
    }, CLEANUP_INTERVAL_MS);

    // Run initial cleanup on startup
    this.cleanupInactiveSessions().catch((error) => {
      console.error('Error during initial session cleanup:', error);
    });
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Stopped session cleanup interval');
    }
  }

  /**
   * Clean up sessions that have been inactive beyond the TTL
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - SESSION_TTL_MS);

    try {
      // Get sessions older than TTL (lastActivity < cutoffTime)
      const oldSessions = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(lt(sessions.lastActivity, cutoffTime));

      if (oldSessions.length === 0) {
        return;
      }

      console.log(`Cleaning up ${oldSessions.length} inactive sessions`);

      for (const session of oldSessions) {
        // Remove from in-memory cache if present
        this.sessions.delete(session.id);

        // Delete from database (cascade will handle clients and queues)
        await db.delete(sessions).where(eq(sessions.id, session.id));
      }

      console.log(`Cleaned up ${oldSessions.length} inactive sessions`);
    } catch (error) {
      console.error('Failed to cleanup inactive sessions:', error);
    }
  }
}

export const roomManager = new RoomManager();
