import { WebSocket } from 'ws';
import { roomManager } from '../services/room-manager.js';
import { broadcastToSession, sendToClient } from '../services/broadcast.js';
import type {
  JoinSessionMessage,
  SessionJoinedMessage,
  SessionEndedMessage,
  UserJoinedMessage,
  UserLeftMessage,
  LeaderChangedMessage,
  UpdateUsernameMessage,
  ErrorMessage,
} from '../types/messages.js';

export async function handleJoinSession(
  ws: WebSocket,
  message: JoinSessionMessage
): Promise<void> {
  try {
    const result = await roomManager.joinSession(ws, message.sessionId, message.boardPath, message.username);

    // If session was switched, notify old clients
    if (result.sessionSwitched && result.previousSessionClients.length > 0) {
      const sessionEndedMessage: SessionEndedMessage = {
        type: 'session-ended',
        reason: 'session-switched',
        newPath: message.boardPath,
      };
      for (const oldWs of result.previousSessionClients) {
        sendToClient(oldWs, sessionEndedMessage);
      }
      console.log(`Session switched, notified ${result.previousSessionClients.length} clients`);
    }

    // Send session info to the joining client
    const sessionJoinedMessage: SessionJoinedMessage = {
      type: 'session-joined',
      clientId: result.clientId,
      sessionId: message.sessionId,
      users: result.users,
      queue: result.queue,
      currentClimbQueueItem: result.currentClimbQueueItem,
      isLeader: result.isLeader,
    };
    console.log(`[Daemon] Sending session-joined to ${result.clientId}:`, {
      sessionId: message.sessionId,
      queueLength: result.queue?.length ?? 0,
      currentClimb: result.currentClimbQueueItem?.climb?.name ?? null,
      isLeader: result.isLeader,
    });
    sendToClient(ws, sessionJoinedMessage);

    // Notify other clients about the new user
    const client = roomManager.getClient(ws);
    if (client) {
      const userJoinedMessage: UserJoinedMessage = {
        type: 'user-joined',
        user: {
          id: result.clientId,
          username: client.username,
          isLeader: result.isLeader,
        },
      };
      broadcastToSession(message.sessionId, userJoinedMessage, ws);
    }

    console.log(`Client ${result.clientId} joined session ${message.sessionId} (path: ${message.boardPath})`);
  } catch (error) {
    const errorMessage: ErrorMessage = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to join session',
      code: 'JOIN_FAILED',
    };
    sendToClient(ws, errorMessage);
  }
}

export async function handleLeaveSession(ws: WebSocket): Promise<void> {
  const client = roomManager.getClient(ws);
  if (!client || !client.sessionId) return;

  const sessionId = client.sessionId;
  const result = await roomManager.leaveSession(ws);

  if (result) {
    // Notify other clients about the user leaving
    const userLeftMessage: UserLeftMessage = {
      type: 'user-left',
      clientId: client.clientId,
    };
    broadcastToSession(sessionId, userLeftMessage);

    // Notify about new leader if applicable
    if (result.newLeaderId) {
      const leaderChangedMessage: LeaderChangedMessage = {
        type: 'leader-changed',
        leaderId: result.newLeaderId,
      };
      broadcastToSession(sessionId, leaderChangedMessage);
    }

    console.log(`Client ${client.clientId} left session ${sessionId}`);
  }
}

export async function handleUpdateUsername(ws: WebSocket, message: UpdateUsernameMessage): Promise<void> {
  const client = roomManager.getClient(ws);
  if (!client) return;

  await roomManager.updateUsername(ws, message.username);

  // If in a session, notify other clients
  if (client.sessionId) {
    // Re-broadcast user info to session members
    const userJoinedMessage: UserJoinedMessage = {
      type: 'user-joined',
      user: {
        id: client.clientId,
        username: message.username,
        isLeader: client.isLeader,
      },
    };
    broadcastToSession(client.sessionId, userJoinedMessage, ws);
  }
}
