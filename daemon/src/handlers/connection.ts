import { WebSocket } from 'ws';
import { roomManager } from '../services/room-manager.js';
import { broadcastToSession, sendToClient } from '../services/broadcast.js';
import type { UserLeftMessage, LeaderChangedMessage } from '../types/messages.js';

export function handleConnection(ws: WebSocket): string {
  const clientId = roomManager.registerClient(ws);
  console.log(`Client connected: ${clientId}`);
  return clientId;
}

export async function handleDisconnection(ws: WebSocket): Promise<void> {
  const client = roomManager.getClient(ws);
  if (!client) return;

  console.log(`Client disconnected: ${client.clientId}`);

  if (client.sessionId) {
    const result = await roomManager.leaveSession(ws);

    if (result) {
      // Notify other clients about the user leaving
      const userLeftMessage: UserLeftMessage = {
        type: 'user-left',
        clientId: client.clientId,
      };
      broadcastToSession(result.sessionId, userLeftMessage);

      // Notify about new leader if applicable
      if (result.newLeaderId) {
        const leaderChangedMessage: LeaderChangedMessage = {
          type: 'leader-changed',
          leaderId: result.newLeaderId,
        };
        broadcastToSession(result.sessionId, leaderChangedMessage);
      }
    }
  }

  roomManager.removeClient(ws);
}
