import { WebSocket } from 'ws';
import { roomManager } from './room-manager.js';
import type { DaemonMessage } from '../types/messages.js';

/**
 * Send a message to a specific client
 */
export function sendToClient(ws: WebSocket, message: DaemonMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast a message to all clients in a session except the sender
 */
export function broadcastToSession(
  sessionId: string,
  message: DaemonMessage,
  excludeWs?: WebSocket
): void {
  const clients = roomManager.getSessionClients(sessionId);

  for (const clientWs of clients) {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  }
}

/**
 * Broadcast a message to all clients in a session including the sender
 */
export function broadcastToSessionAll(sessionId: string, message: DaemonMessage): void {
  const clients = roomManager.getSessionClients(sessionId);

  for (const clientWs of clients) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  }
}
