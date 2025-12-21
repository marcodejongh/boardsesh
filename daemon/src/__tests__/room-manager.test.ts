import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createMockWebSocket, createMockClimbQueueItem } from './test-helpers.js';

// Mock the database module
vi.mock('../db/client.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Import after mocking
import { roomManager } from '../services/room-manager.js';

describe('RoomManager', () => {
  let mockWs1: WebSocket;
  let mockWs2: WebSocket;
  let mockWs3: WebSocket;

  beforeEach(() => {
    // Reset room manager state for each test
    roomManager.reset();
    // Create fresh mock websockets for each test
    mockWs1 = createMockWebSocket();
    mockWs2 = createMockWebSocket();
    mockWs3 = createMockWebSocket();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerClient', () => {
    it('should register a client and return a unique client ID', () => {
      const clientId = roomManager.registerClient(mockWs1);
      expect(clientId).toBeDefined();
      expect(typeof clientId).toBe('string');
      expect(clientId.length).toBeGreaterThan(0);
    });

    it('should register multiple clients with different IDs', () => {
      const clientId1 = roomManager.registerClient(mockWs1);
      const clientId2 = roomManager.registerClient(mockWs2);
      expect(clientId1).not.toBe(clientId2);
    });
  });

  describe('getClient', () => {
    it('should return the client after registration', () => {
      const clientId = roomManager.registerClient(mockWs1);
      const client = roomManager.getClient(mockWs1);
      expect(client).toBeDefined();
      expect(client?.clientId).toBe(clientId);
    });

    it('should return undefined for unregistered WebSocket', () => {
      const client = roomManager.getClient(mockWs1);
      expect(client).toBeUndefined();
    });
  });

  describe('getClientById', () => {
    it('should return the client by ID', () => {
      const clientId = roomManager.registerClient(mockWs1);
      const client = roomManager.getClientById(clientId);
      expect(client).toBeDefined();
      expect(client?.clientId).toBe(clientId);
    });

    it('should return undefined for unknown ID', () => {
      roomManager.registerClient(mockWs1);
      const client = roomManager.getClientById('unknown-id');
      expect(client).toBeUndefined();
    });
  });

  describe('joinSession', () => {
    it('should allow a client to join a session', async () => {
      roomManager.registerClient(mockWs1);
      const result = await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'User1');

      expect(result.clientId).toBeDefined();
      expect(result.isLeader).toBe(true); // First client is leader
      expect(result.users.length).toBe(1);
      expect(result.users[0].username).toBe('User1');
    });

    it('should make first client the leader', async () => {
      roomManager.registerClient(mockWs1);
      roomManager.registerClient(mockWs2);

      const result1 = await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'User1');
      const result2 = await roomManager.joinSession(mockWs2, 'session-1', '/kilter/1/2/3/25/list', 'User2');

      expect(result1.isLeader).toBe(true);
      expect(result2.isLeader).toBe(false);
    });

    it('should track all users in session', async () => {
      roomManager.registerClient(mockWs1);
      roomManager.registerClient(mockWs2);

      await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'User1');
      const result2 = await roomManager.joinSession(mockWs2, 'session-1', '/kilter/1/2/3/25/list', 'User2');

      expect(result2.users.length).toBe(2);
      expect(result2.users.map((u) => u.username).sort()).toEqual(['User1', 'User2']);
    });

    it('should use default username if not provided', async () => {
      const clientId = roomManager.registerClient(mockWs1);
      const result = await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list');

      expect(result.users[0].username).toContain('User-');
    });

    it('should throw error for unregistered client', async () => {
      await expect(roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list')).rejects.toThrow(
        'Client not registered',
      );
    });
  });

  describe('leaveSession', () => {
    it('should remove client from session', async () => {
      roomManager.registerClient(mockWs1);
      roomManager.registerClient(mockWs2);

      await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'User1');
      await roomManager.joinSession(mockWs2, 'session-1', '/kilter/1/2/3/25/list', 'User2');

      await roomManager.leaveSession(mockWs1);

      const users = roomManager.getSessionUsers('session-1');
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('User2');
    });

    it('should elect new leader when leader leaves (deterministic: earliest connected)', async () => {
      roomManager.registerClient(mockWs1);
      roomManager.registerClient(mockWs2);
      roomManager.registerClient(mockWs3);

      await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'User1');
      // Small delay to ensure different connectedAt times
      await new Promise((resolve) => setTimeout(resolve, 10));
      await roomManager.joinSession(mockWs2, 'session-1', '/kilter/1/2/3/25/list', 'User2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await roomManager.joinSession(mockWs3, 'session-1', '/kilter/1/2/3/25/list', 'User3');

      // User1 is leader and leaves
      const result = await roomManager.leaveSession(mockWs1);

      expect(result?.newLeaderId).toBeDefined();

      // User2 should be new leader (earliest connected after User1)
      const users = roomManager.getSessionUsers('session-1');
      const newLeader = users.find((u) => u.isLeader);
      expect(newLeader?.username).toBe('User2');
    });

    it('should return null if client not in session', async () => {
      roomManager.registerClient(mockWs1);
      const result = await roomManager.leaveSession(mockWs1);
      expect(result).toBeNull();
    });
  });

  describe('getSessionUsers', () => {
    it('should return all users in a session', async () => {
      roomManager.registerClient(mockWs1);
      roomManager.registerClient(mockWs2);

      await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'User1');
      await roomManager.joinSession(mockWs2, 'session-1', '/kilter/1/2/3/25/list', 'User2');

      const users = roomManager.getSessionUsers('session-1');
      expect(users.length).toBe(2);
    });

    it('should return empty array for unknown session', () => {
      const users = roomManager.getSessionUsers('unknown-session');
      expect(users).toEqual([]);
    });
  });

  describe('getSessionClients', () => {
    it('should return all WebSocket clients in a session', async () => {
      roomManager.registerClient(mockWs1);
      roomManager.registerClient(mockWs2);

      await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list');
      await roomManager.joinSession(mockWs2, 'session-1', '/kilter/1/2/3/25/list');

      const clients = roomManager.getSessionClients('session-1');
      expect(clients.length).toBe(2);
      expect(clients).toContain(mockWs1);
      expect(clients).toContain(mockWs2);
    });
  });

  describe('updateUsername', () => {
    it('should update the username of a client', async () => {
      roomManager.registerClient(mockWs1);
      await roomManager.joinSession(mockWs1, 'session-1', '/kilter/1/2/3/25/list', 'OldName');

      await roomManager.updateUsername(mockWs1, 'NewName');

      const users = roomManager.getSessionUsers('session-1');
      expect(users[0].username).toBe('NewName');
    });
  });

  describe('updateQueueState', () => {
    it('should persist queue state', async () => {
      const queueItem = createMockClimbQueueItem();
      await roomManager.updateQueueState('session-1', [queueItem], queueItem);
      // If no error thrown, test passes (mock doesn't actually persist)
    });
  });

  describe('removeClient', () => {
    it('should remove client from manager', () => {
      roomManager.registerClient(mockWs1);
      expect(roomManager.getClient(mockWs1)).toBeDefined();

      roomManager.removeClient(mockWs1);
      expect(roomManager.getClient(mockWs1)).toBeUndefined();
    });
  });
});
