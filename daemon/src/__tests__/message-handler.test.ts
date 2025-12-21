import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMockWebSocket, createMockClimbQueueItem } from './test-helpers.js';
import { WebSocket } from 'ws';

// Mock the room manager
vi.mock('../services/room-manager.js', () => {
  const mockClient = {
    clientId: 'test-client-id',
    sessionId: 'test-session',
    username: 'TestUser',
    isLeader: true,
    connectedAt: new Date(),
  };

  return {
    roomManager: {
      getClient: vi.fn(() => mockClient),
      joinSession: vi.fn(() =>
        Promise.resolve({
          clientId: 'test-client-id',
          users: [{ id: 'test-client-id', username: 'TestUser', isLeader: true }],
          queue: [],
          currentClimbQueueItem: null,
          isLeader: true,
        }),
      ),
      leaveSession: vi.fn(() => Promise.resolve({ sessionId: 'test-session' })),
      updateUsername: vi.fn(() => Promise.resolve()),
      getSessionClients: vi.fn(() => []),
      updateQueueState: vi.fn(() => Promise.resolve()),
      getQueueState: vi.fn(() =>
        Promise.resolve({
          queue: [],
          currentClimbQueueItem: null,
        }),
      ),
    },
  };
});

// Mock the broadcast module
vi.mock('../services/broadcast.js', () => ({
  broadcastToSession: vi.fn(),
  sendToClient: vi.fn(),
}));

// Import after mocking
import { handleMessage } from '../handlers/message.js';
import { roomManager } from '../services/room-manager.js';
import { broadcastToSession, sendToClient } from '../services/broadcast.js';

describe('handleMessage', () => {
  let mockWs: WebSocket;

  beforeEach(() => {
    mockWs = createMockWebSocket();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('join-session', () => {
    it('should handle join-session message', async () => {
      const message = JSON.stringify({
        type: 'join-session',
        sessionId: 'test-session',
        boardPath: '/kilter/1/2/3/40',
        username: 'TestUser',
      });

      await handleMessage(mockWs, message);

      expect(roomManager.joinSession).toHaveBeenCalledWith(mockWs, 'test-session', '/kilter/1/2/3/40', 'TestUser');
      expect(sendToClient).toHaveBeenCalled();
    });
  });

  describe('leave-session', () => {
    it('should handle leave-session message', async () => {
      const message = JSON.stringify({ type: 'leave-session' });

      await handleMessage(mockWs, message);

      expect(roomManager.leaveSession).toHaveBeenCalledWith(mockWs);
    });
  });

  describe('update-username', () => {
    it('should handle update-username message', async () => {
      const message = JSON.stringify({
        type: 'update-username',
        username: 'NewName',
      });

      await handleMessage(mockWs, message);

      expect(roomManager.updateUsername).toHaveBeenCalledWith(mockWs, 'NewName');
    });
  });

  describe('heartbeat', () => {
    it('should respond to heartbeat with heartbeat-response', async () => {
      const timestamp = Date.now();
      const message = JSON.stringify({
        type: 'heartbeat',
        timestamp,
      });

      await handleMessage(mockWs, message);

      expect(sendToClient).toHaveBeenCalledWith(
        mockWs,
        expect.objectContaining({
          type: 'heartbeat-response',
          originalTimestamp: timestamp,
        }),
      );
    });
  });

  describe('queue operations', () => {
    it('should broadcast add-queue-item to session', async () => {
      const item = createMockClimbQueueItem();
      const message = JSON.stringify({
        type: 'add-queue-item',
        item,
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalledWith('test-session', expect.any(Object), mockWs);
      expect(roomManager.updateQueueState).toHaveBeenCalled();
    });

    it('should broadcast remove-queue-item to session', async () => {
      const message = JSON.stringify({
        type: 'remove-queue-item',
        uuid: 'item-to-remove',
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalledWith('test-session', expect.any(Object), mockWs);
      expect(roomManager.updateQueueState).toHaveBeenCalled();
    });

    it('should broadcast update-queue to session and persist', async () => {
      const queue = [createMockClimbQueueItem()];
      const message = JSON.stringify({
        type: 'update-queue',
        queue,
        currentClimbQueueItem: queue[0],
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalledWith('test-session', expect.any(Object), mockWs);
      expect(roomManager.updateQueueState).toHaveBeenCalledWith(
        'test-session',
        expect.any(Array),
        expect.any(Object),
      );
    });

    it('should handle update-current-climb with shouldAddToQueue', async () => {
      const item = createMockClimbQueueItem();
      const message = JSON.stringify({
        type: 'update-current-climb',
        item,
        shouldAddToQueue: true,
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalled();
      expect(roomManager.updateQueueState).toHaveBeenCalled();
    });

    it('should handle reorder-queue-item', async () => {
      // Setup initial queue state
      const item1 = createMockClimbQueueItem({ uuid: 'item-1' });
      const item2 = createMockClimbQueueItem({ uuid: 'item-2' });
      vi.mocked(roomManager.getQueueState).mockResolvedValueOnce({
        queue: [item1, item2],
        currentClimbQueueItem: null,
      });

      const message = JSON.stringify({
        type: 'reorder-queue-item',
        uuid: 'item-1',
        oldIndex: 0,
        newIndex: 1,
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalled();
      expect(roomManager.updateQueueState).toHaveBeenCalled();
    });

    it('should handle mirror-current-climb', async () => {
      const item = createMockClimbQueueItem();
      vi.mocked(roomManager.getQueueState).mockResolvedValueOnce({
        queue: [item],
        currentClimbQueueItem: item,
      });

      const message = JSON.stringify({
        type: 'mirror-current-climb',
        mirrored: true,
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalled();
      expect(roomManager.updateQueueState).toHaveBeenCalled();
    });

    it('should handle replace-queue-item', async () => {
      const oldItem = createMockClimbQueueItem({ uuid: 'item-1' });
      const newItem = createMockClimbQueueItem({ uuid: 'item-1' });
      newItem.climb.name = 'Updated Climb';

      vi.mocked(roomManager.getQueueState).mockResolvedValueOnce({
        queue: [oldItem],
        currentClimbQueueItem: oldItem,
      });

      const message = JSON.stringify({
        type: 'replace-queue-item',
        uuid: 'item-1',
        item: newItem,
      });

      await handleMessage(mockWs, message);

      expect(broadcastToSession).toHaveBeenCalled();
      expect(roomManager.updateQueueState).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      await handleMessage(mockWs, 'not valid json');
      // Should not throw
    });

    it('should handle unknown message types', async () => {
      const message = JSON.stringify({ type: 'unknown-type' });
      await handleMessage(mockWs, message);
      // Should not throw
    });

    it('should send error when queue operation from non-session client', async () => {
      // Clear all mocks first
      vi.mocked(roomManager.getClient).mockReset();
      vi.mocked(sendToClient).mockReset();

      // Return a client that's not in a session
      vi.mocked(roomManager.getClient).mockReturnValue({
        clientId: 'test',
        sessionId: null, // Not in a session
        username: 'Test',
        isLeader: false,
        connectedAt: new Date(),
        ws: mockWs,
      });

      const message = JSON.stringify({
        type: 'add-queue-item',
        item: createMockClimbQueueItem(),
      });

      await handleMessage(mockWs, message);

      expect(sendToClient).toHaveBeenCalledWith(
        mockWs,
        expect.objectContaining({
          type: 'error',
          code: 'NOT_IN_SESSION',
        }),
      );
    });
  });
});
