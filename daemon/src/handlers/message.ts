import { WebSocket } from 'ws';
import { roomManager } from '../services/room-manager.js';
import { broadcastToSession, sendToClient } from '../services/broadcast.js';
import { handleJoinSession, handleLeaveSession, handleUpdateUsername, handleRequestQueueState } from './room.js';
import type {
  ClientMessage,
  AddQueueItemMessage,
  RemoveQueueItemMessage,
  ReorderQueueItemMessage,
  UpdateQueueMessage,
  UpdateCurrentClimbMessage,
  MirrorCurrentClimbMessage,
  ReplaceQueueItemMessage,
  HeartbeatMessage,
  HeartbeatResponseMessage,
  ErrorMessage,
} from '../types/messages.js';
import { isClientMessage } from '../types/messages.js';

export async function handleMessage(ws: WebSocket, data: string): Promise<void> {
  let message: ClientMessage;

  try {
    const parsed = JSON.parse(data);
    console.log('[DEBUG] Received message:', parsed.type, JSON.stringify(parsed).slice(0, 200));

    if (!isClientMessage(parsed)) {
      console.warn('[DEBUG] Invalid message format - type not recognized:', parsed.type);
      console.warn('Invalid message format:', data);
      return;
    }
    message = parsed;
  } catch (error) {
    console.error('Failed to parse message:', error);
    return;
  }

  const client = roomManager.getClient(ws);
  if (!client) {
    console.warn('Message from unregistered client');
    return;
  }

  console.log('[DEBUG] Processing message:', message.type, 'from client:', client.clientId, 'session:', client.sessionId);

  switch (message.type) {
    case 'join-session':
      await handleJoinSession(ws, message);
      break;

    case 'leave-session':
      await handleLeaveSession(ws);
      break;

    case 'update-username':
      await handleUpdateUsername(ws, message);
      break;

    case 'request-queue-state':
      await handleRequestQueueState(ws);
      break;

    case 'heartbeat':
      handleHeartbeat(ws, message);
      break;

    // Queue operations - relay to other session members
    case 'add-queue-item':
    case 'remove-queue-item':
    case 'reorder-queue-item':
    case 'update-queue':
    case 'update-current-climb':
    case 'mirror-current-climb':
    case 'replace-queue-item':
      await handleQueueOperation(ws, message);
      break;

    default:
      console.warn('Unknown message type:', (message as { type: string }).type);
  }
}

function handleHeartbeat(ws: WebSocket, message: HeartbeatMessage): void {
  const response: HeartbeatResponseMessage = {
    type: 'heartbeat-response',
    originalTimestamp: message.timestamp,
    responseTimestamp: Date.now(),
  };
  sendToClient(ws, response);
}

async function handleQueueOperation(
  ws: WebSocket,
  message:
    | AddQueueItemMessage
    | RemoveQueueItemMessage
    | ReorderQueueItemMessage
    | UpdateQueueMessage
    | UpdateCurrentClimbMessage
    | MirrorCurrentClimbMessage
    | ReplaceQueueItemMessage
): Promise<void> {
  const client = roomManager.getClient(ws);
  if (!client || !client.sessionId) {
    const errorMessage: ErrorMessage = {
      type: 'error',
      message: 'Must be in a session to perform queue operations',
      code: 'NOT_IN_SESSION',
    };
    sendToClient(ws, errorMessage);
    return;
  }

  // Broadcast to other session members
  broadcastToSession(client.sessionId, message, ws);

  // Persist all queue operations to database
  const currentState = await roomManager.getQueueState(client.sessionId);
  let queue = currentState.queue;
  let currentClimbQueueItem = currentState.currentClimbQueueItem;

  switch (message.type) {
    case 'update-queue':
      queue = message.queue;
      currentClimbQueueItem = message.currentClimbQueueItem;
      break;

    case 'update-current-climb':
      // Add to queue if needed
      if (message.shouldAddToQueue && message.item) {
        const exists = queue.some((item) => item.uuid === message.item!.uuid);
        if (!exists) {
          queue = [...queue, message.item];
        }
      }
      currentClimbQueueItem = message.item;
      break;

    case 'add-queue-item':
      // Check if item already exists
      if (!queue.some((item) => item.uuid === message.item.uuid)) {
        if (message.position !== undefined && message.position >= 0) {
          queue = [...queue.slice(0, message.position), message.item, ...queue.slice(message.position)];
        } else {
          queue = [...queue, message.item];
        }
      }
      break;

    case 'remove-queue-item':
      queue = queue.filter((item) => item.uuid !== message.uuid);
      // Clear current climb if it was removed
      if (currentClimbQueueItem?.uuid === message.uuid) {
        currentClimbQueueItem = null;
      }
      break;

    case 'reorder-queue-item': {
      const { oldIndex, newIndex } = message;
      if (oldIndex >= 0 && oldIndex < queue.length && newIndex >= 0 && newIndex < queue.length) {
        const newQueue = [...queue];
        const [movedItem] = newQueue.splice(oldIndex, 1);
        newQueue.splice(newIndex, 0, movedItem);
        queue = newQueue;
      }
      break;
    }

    case 'mirror-current-climb':
      if (currentClimbQueueItem) {
        currentClimbQueueItem = {
          ...currentClimbQueueItem,
          climb: {
            ...currentClimbQueueItem.climb,
            mirrored: message.mirrored,
          },
        };
        // Also update in queue if present
        queue = queue.map((item) =>
          item.uuid === currentClimbQueueItem!.uuid
            ? { ...item, climb: { ...item.climb, mirrored: message.mirrored } }
            : item
        );
      }
      break;

    case 'replace-queue-item':
      queue = queue.map((item) => (item.uuid === message.uuid ? message.item : item));
      // Update current climb if it was replaced
      if (currentClimbQueueItem?.uuid === message.uuid) {
        currentClimbQueueItem = message.item;
      }
      break;
  }

  await roomManager.updateQueueState(client.sessionId, queue, currentClimbQueueItem);
}
