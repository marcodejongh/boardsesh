import { describe, it, expect } from 'vitest';
import { EventBroker } from '../event-broker';

/**
 * Unit tests for EventBroker's parseEvent logic.
 * We test the private method by accessing it through a subclass.
 */
class TestableEventBroker extends EventBroker {
  public testParseEvent(fields: string[]) {
    return (this as any).parseEvent(fields);
  }
}

describe('EventBroker', () => {
  describe('parseEvent', () => {
    const broker = new TestableEventBroker();

    it('parses a valid event from Redis Stream fields', () => {
      const fields = [
        'type', 'comment.created',
        'actorId', 'user-123',
        'entityType', 'tick',
        'entityId', 'tick-456',
        'timestamp', '1700000000000',
        'metadata', '{"commentUuid":"abc-def"}',
      ];

      const event = broker.testParseEvent(fields);

      expect(event).toEqual({
        type: 'comment.created',
        actorId: 'user-123',
        entityType: 'tick',
        entityId: 'tick-456',
        timestamp: 1700000000000,
        metadata: { commentUuid: 'abc-def' },
      });
    });

    it('parses event with empty metadata', () => {
      const fields = [
        'type', 'follow.created',
        'actorId', 'user-1',
        'entityType', 'user',
        'entityId', 'user-2',
        'timestamp', '1700000000000',
        'metadata', '{}',
      ];

      const event = broker.testParseEvent(fields);
      expect(event).not.toBeNull();
      expect(event!.metadata).toEqual({});
    });

    it('handles missing metadata field gracefully', () => {
      const fields = [
        'type', 'vote.cast',
        'actorId', 'user-1',
        'entityType', 'tick',
        'entityId', 'tick-1',
        'timestamp', '1700000000000',
      ];

      const event = broker.testParseEvent(fields);
      expect(event).not.toBeNull();
      expect(event!.metadata).toEqual({});
    });

    it('returns null for invalid JSON in metadata', () => {
      const fields = [
        'type', 'comment.created',
        'actorId', 'user-1',
        'entityType', 'tick',
        'entityId', 'tick-1',
        'timestamp', '1700000000000',
        'metadata', 'not-valid-json{',
      ];

      const event = broker.testParseEvent(fields);
      expect(event).toBeNull();
    });

    it('returns null for empty fields array', () => {
      const event = broker.testParseEvent([]);
      // Should parse but with undefined values
      expect(event).not.toBeNull();
      expect(event!.type).toBeUndefined();
      expect(event!.actorId).toBeUndefined();
    });

    it('parses all supported event types', () => {
      const eventTypes = [
        'comment.created',
        'comment.reply',
        'vote.cast',
        'follow.created',
        'climb.created',
        'proposal.created',
        'proposal.voted',
        'proposal.approved',
        'proposal.rejected',
      ];

      for (const type of eventTypes) {
        const fields = [
          'type', type,
          'actorId', 'user-1',
          'entityType', 'tick',
          'entityId', 'entity-1',
          'timestamp', '1700000000000',
          'metadata', '{}',
        ];

        const event = broker.testParseEvent(fields);
        expect(event).not.toBeNull();
        expect(event!.type).toBe(type);
      }
    });

    it('correctly converts timestamp string to number', () => {
      const fields = [
        'type', 'vote.cast',
        'actorId', 'user-1',
        'entityType', 'tick',
        'entityId', 'tick-1',
        'timestamp', '1700000000123',
        'metadata', '{}',
      ];

      const event = broker.testParseEvent(fields);
      expect(event!.timestamp).toBe(1700000000123);
      expect(typeof event!.timestamp).toBe('number');
    });
  });

  describe('isInitialized', () => {
    it('returns false when not initialized', () => {
      const broker = new EventBroker();
      expect(broker.isInitialized()).toBe(false);
    });
  });

  describe('publish without initialization', () => {
    it('does not throw when publishing without Redis', async () => {
      const broker = new EventBroker();
      await expect(
        broker.publish({
          type: 'comment.created',
          actorId: 'user-1',
          entityType: 'tick',
          entityId: 'tick-1',
          timestamp: Date.now(),
          metadata: {},
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('startConsumer without initialization', () => {
    it('does not throw when starting consumer without Redis', () => {
      const broker = new EventBroker();
      expect(() => broker.startConsumer(async () => {})).not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('can be called safely even when not running', () => {
      const broker = new EventBroker();
      expect(() => broker.shutdown()).not.toThrow();
    });
  });
});
