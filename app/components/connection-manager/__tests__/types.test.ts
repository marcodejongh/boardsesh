import { describe, it, expect } from 'vitest';
import { isPeerData, ReceivedPeerData } from '../types';

describe('isPeerData', () => {
  describe('request-update-queue type', () => {
    it('should validate valid request-update-queue data', () => {
      const validData = {
        type: 'request-update-queue',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should reject request-update-queue without type', () => {
      const invalidData = {
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });
  });

  describe('send-peer-info type', () => {
    it('should validate valid send-peer-info data', () => {
      const validData = {
        type: 'send-peer-info',
        username: 'john_doe',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should reject send-peer-info without username', () => {
      const invalidData = {
        type: 'send-peer-info',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject send-peer-info with empty username', () => {
      const invalidData = {
        type: 'send-peer-info',
        username: '',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject send-peer-info with null username', () => {
      const invalidData = {
        type: 'send-peer-info',
        username: null,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });
  });

  describe('queue-related types', () => {
    const mockClimbQueueItem = {
      climb: {
        uuid: 'climb-123',
        name: 'Test Climb',
        difficulty: 7
      },
      addedBy: 'user-456',
      uuid: 'queue-item-789',
      suggested: false
    };

    it('should validate valid update-queue data', () => {
      const validData = {
        type: 'update-queue',
        queue: [mockClimbQueueItem],
        currentClimbQueueItem: mockClimbQueueItem,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should validate valid initial-queue-data', () => {
      const validData = {
        type: 'initial-queue-data',
        queue: [],
        currentClimbQueueItem: null,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should reject queue data without queue property', () => {
      const invalidData = {
        type: 'update-queue',
        currentClimbQueueItem: mockClimbQueueItem,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject queue data without currentClimbQueueItem property', () => {
      const invalidData = {
        type: 'update-queue',
        queue: [mockClimbQueueItem],
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });
  });

  describe('broadcast-other-peers type', () => {
    it('should validate valid broadcast-other-peers data', () => {
      const validData = {
        type: 'broadcast-other-peers',
        peers: ['peer-1', 'peer-2', 'peer-3'],
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should validate broadcast-other-peers with empty array', () => {
      const validData = {
        type: 'broadcast-other-peers',
        peers: [],
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should reject broadcast-other-peers without peers property', () => {
      const invalidData = {
        type: 'broadcast-other-peers',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject broadcast-other-peers with non-array peers', () => {
      const invalidData = {
        type: 'broadcast-other-peers',
        peers: 'not-an-array',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject broadcast-other-peers with null peers', () => {
      const invalidData = {
        type: 'broadcast-other-peers',
        peers: null,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should reject null data', () => {
      expect(isPeerData(null)).toBe(false);
    });

    it('should reject undefined data', () => {
      expect(isPeerData(undefined)).toBe(false);
    });

    it('should reject non-object data', () => {
      expect(isPeerData('string')).toBe(false);
      expect(isPeerData(123)).toBe(false);
      expect(isPeerData(true)).toBe(false);
      expect(isPeerData([])).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isPeerData({})).toBe(false);
    });

    it('should reject object without type property', () => {
      const invalidData = {
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject unknown message types', () => {
      const invalidData = {
        type: 'unknown-type',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });

    it('should reject messages with invalid type', () => {
      const invalidData = {
        type: null,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(invalidData)).toBe(false);
    });
  });

  describe('complex message validation', () => {
    it('should handle deeply nested queue data', () => {
      const complexClimbQueueItem = {
        climb: {
          uuid: 'climb-123',
          name: 'Complex Climb',
          difficulty: 7,
          frames: [
            { holds: [1, 2, 3] },
            { holds: [4, 5, 6] }
          ],
          metadata: {
            setter: 'John Doe',
            date: '2023-01-01'
          }
        },
        addedBy: 'user-456',
        uuid: 'queue-item-789',
        suggested: false,
        tickedBy: ['user-1', 'user-2']
      };

      const validData = {
        type: 'update-queue',
        queue: [complexClimbQueueItem],
        currentClimbQueueItem: complexClimbQueueItem,
        source: 'peer-123',
        messageId: 'msg-456'
      };

      expect(isPeerData(validData)).toBe(true);
    });

    it('should handle messages with extra properties', () => {
      const validData = {
        type: 'request-update-queue',
        source: 'peer-123',
        messageId: 'msg-456',
        extraProperty: 'should not affect validation',
        timestamp: Date.now()
      };

      expect(isPeerData(validData)).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should correctly type-guard ReceivedPeerData', () => {
      const data: unknown = {
        type: 'request-update-queue',
        source: 'peer-123',
        messageId: 'msg-456'
      };

      if (isPeerData(data)) {
        // TypeScript should know this is ReceivedPeerData
        expect(data.type).toBe('request-update-queue');
        expect(data.source).toBe('peer-123');
        expect(data.messageId).toBe('msg-456');
      } else {
        throw new Error('Data should be valid');
      }
    });

    it('should handle union types correctly', () => {
      const requestData: unknown = {
        type: 'request-update-queue',
        source: 'peer-123'
      };

      const queueData: unknown = {
        type: 'update-queue',
        queue: [],
        currentClimbQueueItem: null,
        source: 'peer-456'
      };

      const broadcastData: unknown = {
        type: 'broadcast-other-peers',
        peers: ['peer-1', 'peer-2'],
        source: 'peer-789'
      };

      expect(isPeerData(requestData)).toBe(true);
      expect(isPeerData(queueData)).toBe(true);
      expect(isPeerData(broadcastData)).toBe(true);

      if (isPeerData(requestData)) {
        expect(requestData.type).toBe('request-update-queue');
      }
      
      if (isPeerData(queueData)) {
        expect(queueData.type).toBe('update-queue');
        expect('queue' in queueData).toBe(true);
      }
      
      if (isPeerData(broadcastData)) {
        expect(broadcastData.type).toBe('broadcast-other-peers');
        expect('peers' in broadcastData).toBe(true);
      }
    });
  });
});