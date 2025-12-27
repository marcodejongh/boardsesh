import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Redis from 'ioredis';
import { createRedisPubSubAdapter, type RedisPubSubAdapter } from '../pubsub/redis-adapter.js';
import type { QueueEvent, SessionEvent } from '@boardsesh/shared-schema';

// Integration tests require Redis to be running
// Run with: docker-compose -f docker-compose.test.yml up redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

describe('Redis PubSub Adapter', () => {
  let publisher1: Redis;
  let subscriber1: Redis;
  let publisher2: Redis;
  let subscriber2: Redis;
  let adapter1: RedisPubSubAdapter;
  let adapter2: RedisPubSubAdapter;

  beforeAll(async () => {
    // Create two separate "instances" to simulate multi-instance deployment
    publisher1 = new Redis(REDIS_URL);
    subscriber1 = new Redis(REDIS_URL);
    publisher2 = new Redis(REDIS_URL);
    subscriber2 = new Redis(REDIS_URL);

    // Wait for all connections
    await Promise.all([
      new Promise<void>((resolve) => publisher1.once('ready', resolve)),
      new Promise<void>((resolve) => subscriber1.once('ready', resolve)),
      new Promise<void>((resolve) => publisher2.once('ready', resolve)),
      new Promise<void>((resolve) => subscriber2.once('ready', resolve)),
    ]);

    adapter1 = createRedisPubSubAdapter(publisher1, subscriber1);
    adapter2 = createRedisPubSubAdapter(publisher2, subscriber2);
  });

  afterAll(async () => {
    await Promise.all([
      publisher1.quit(),
      subscriber1.quit(),
      publisher2.quit(),
      subscriber2.quit(),
    ]);
  });

  describe('Cross-instance message delivery', () => {
    it('should deliver queue events from instance 1 to instance 2', async () => {
      const sessionId = 'test-session-1';
      const receivedEvents: QueueEvent[] = [];

      // Set up listener on adapter2
      adapter2.onQueueMessage((sid, event) => {
        if (sid === sessionId) {
          receivedEvents.push(event);
        }
      });

      // Subscribe adapter2 to the session
      await adapter2.subscribeQueueChannel(sessionId);

      // Small delay to ensure subscription is active
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Publish from adapter1
      const event: QueueEvent = {
        __typename: 'QueueItemAdded',
        item: {
          uuid: 'test-uuid',
          climb: {
            uuid: 'climb-uuid',
            name: 'Test Climb',
            difficulty: 'V5',
            qualityAverage: 4.5,
            ascensionistCount: 10,
            difficultyError: 0.5,
            isBenchmark: false,
            boardAngle: 40,
            mirrored: false,
            holdStateMap: {},
            litUpHoldsMap: {},
          },
          tickedBy: [],
          addedBy: null,
          isSuggestion: false,
        },
        position: 0,
      };

      await adapter1.publishQueueEvent(sessionId, event);

      // Wait for message to be delivered
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].__typename).toBe('QueueItemAdded');

      // Cleanup
      await adapter2.unsubscribeQueueChannel(sessionId);
    });

    it('should deliver session events from instance 1 to instance 2', async () => {
      const sessionId = 'test-session-2';
      const receivedEvents: SessionEvent[] = [];

      // Set up listener on adapter2
      adapter2.onSessionMessage((sid, event) => {
        if (sid === sessionId) {
          receivedEvents.push(event);
        }
      });

      // Subscribe adapter2 to the session
      await adapter2.subscribeSessionChannel(sessionId);

      // Small delay to ensure subscription is active
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Publish from adapter1
      const event: SessionEvent = {
        __typename: 'UserJoined',
        user: {
          id: 'user-123',
          username: 'TestUser',
          isLeader: true,
          avatarUrl: null,
        },
      };

      await adapter1.publishSessionEvent(sessionId, event);

      // Wait for message to be delivered
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].__typename).toBe('UserJoined');

      // Cleanup
      await adapter2.unsubscribeSessionChannel(sessionId);
    });

    it('should NOT deliver messages to the same instance that published them', async () => {
      const sessionId = 'test-session-3';
      const receivedEvents: QueueEvent[] = [];

      // Set up listener on adapter1 (same instance that will publish)
      adapter1.onQueueMessage((sid, event) => {
        if (sid === sessionId) {
          receivedEvents.push(event);
        }
      });

      // Subscribe adapter1 to the session
      await adapter1.subscribeQueueChannel(sessionId);

      // Small delay to ensure subscription is active
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Publish from adapter1 (same instance)
      const event: QueueEvent = {
        __typename: 'QueueItemRemoved',
        uuid: 'removed-uuid',
      };

      await adapter1.publishQueueEvent(sessionId, event);

      // Wait for any potential message delivery
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should NOT receive the message (same instance filtering)
      expect(receivedEvents.length).toBe(0);

      // Cleanup
      await adapter1.unsubscribeQueueChannel(sessionId);
    });
  });

  describe('Channel management', () => {
    it('should not subscribe to the same channel twice', async () => {
      const sessionId = 'test-session-4';

      // Subscribe twice
      await adapter1.subscribeQueueChannel(sessionId);
      await adapter1.subscribeQueueChannel(sessionId);

      // Should not throw and should only have one subscription
      // (we can't easily verify this without exposing internal state,
      // but the second call should be a no-op)

      // Cleanup
      await adapter1.unsubscribeQueueChannel(sessionId);
    });

    it('should handle unsubscribe for non-subscribed channel', async () => {
      const sessionId = 'test-session-never-subscribed';

      // Should not throw
      await adapter1.unsubscribeQueueChannel(sessionId);
    });
  });

  describe('Instance ID', () => {
    it('should generate unique instance IDs for each adapter', () => {
      const id1 = adapter1.getInstanceId();
      const id2 = adapter2.getInstanceId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });
});

describe('Redis PubSub Adapter - Unit Tests (mocked)', () => {
  it('should publish to correct channel format', async () => {
    const mockPublish = vi.fn().mockResolvedValue(1);
    const mockPublisher = { publish: mockPublish } as unknown as Redis;
    const mockSubscriber = {
      on: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    } as unknown as Redis;

    const adapter = createRedisPubSubAdapter(mockPublisher, mockSubscriber);

    const event: QueueEvent = {
      __typename: 'ClimbMirrored',
      mirrored: true,
    };

    await adapter.publishQueueEvent('session-123', event);

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish.mock.calls[0][0]).toBe('boardsesh:queue:session-123');

    const publishedMessage = JSON.parse(mockPublish.mock.calls[0][1]);
    expect(publishedMessage.event).toEqual(event);
    expect(publishedMessage.instanceId).toBe(adapter.getInstanceId());
    expect(publishedMessage.timestamp).toBeDefined();
  });

  it('should subscribe to correct channel format', async () => {
    const mockSubscribe = vi.fn().mockResolvedValue(undefined);
    const mockPublisher = { publish: vi.fn() } as unknown as Redis;
    const mockSubscriber = {
      on: vi.fn(),
      subscribe: mockSubscribe,
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    } as unknown as Redis;

    const adapter = createRedisPubSubAdapter(mockPublisher, mockSubscriber);

    await adapter.subscribeSessionChannel('session-456');

    expect(mockSubscribe).toHaveBeenCalledWith('boardsesh:session:session-456');
  });
});
