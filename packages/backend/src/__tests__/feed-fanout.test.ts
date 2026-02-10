import { describe, it, expect } from 'vitest';
import { buildFeedItemMetadata } from '../events/feed-metadata';
import type { SocialEvent } from '@boardsesh/shared-schema';

describe('buildFeedItemMetadata', () => {
  const baseEvent: SocialEvent = {
    type: 'ascent.logged',
    actorId: 'user-1',
    entityType: 'tick',
    entityId: 'tick-uuid-1',
    timestamp: Date.now(),
    metadata: {
      actorDisplayName: 'John Doe',
      actorAvatarUrl: 'https://example.com/avatar.jpg',
      climbName: 'Test Climb',
      climbUuid: 'climb-uuid-1',
      boardType: 'kilter',
      setterUsername: 'setter1',
      layoutId: '42',
      frames: 'frame-data',
      gradeName: 'V5',
      difficulty: '20',
      difficultyName: 'V5',
      status: 'flash',
      angle: '40',
      isMirror: 'false',
      isBenchmark: 'true',
      quality: '4',
      attemptCount: '1',
      comment: 'Nice climb!',
    },
  };

  it('should convert string metadata to correct types', () => {
    const meta = buildFeedItemMetadata(baseEvent);
    expect(meta.actorDisplayName).toBe('John Doe');
    expect(meta.layoutId).toBe(42);
    expect(meta.difficulty).toBe(20);
    expect(meta.angle).toBe(40);
    expect(meta.quality).toBe(4);
    expect(meta.attemptCount).toBe(1);
    expect(meta.isMirror).toBe(false);
    expect(meta.isBenchmark).toBe(true);
  });

  it('should handle empty string values as null for numeric fields', () => {
    const event: SocialEvent = {
      ...baseEvent,
      metadata: {
        ...baseEvent.metadata,
        layoutId: '',
        difficulty: '',
        angle: '',
        quality: '',
        attemptCount: '',
      },
    };
    const meta = buildFeedItemMetadata(event);
    expect(meta.layoutId).toBeNull();
    expect(meta.difficulty).toBeNull();
    expect(meta.angle).toBeNull();
    expect(meta.quality).toBeNull();
    expect(meta.attemptCount).toBeNull();
  });

  it('should preserve string fields as-is', () => {
    const meta = buildFeedItemMetadata(baseEvent);
    expect(meta.climbName).toBe('Test Climb');
    expect(meta.climbUuid).toBe('climb-uuid-1');
    expect(meta.boardType).toBe('kilter');
    expect(meta.setterUsername).toBe('setter1');
    expect(meta.frames).toBe('frame-data');
    expect(meta.gradeName).toBe('V5');
    expect(meta.difficultyName).toBe('V5');
    expect(meta.status).toBe('flash');
    expect(meta.comment).toBe('Nice climb!');
  });

  it('should handle isMirror=true correctly', () => {
    const event: SocialEvent = {
      ...baseEvent,
      metadata: {
        ...baseEvent.metadata,
        isMirror: 'true',
      },
    };
    const meta = buildFeedItemMetadata(event);
    expect(meta.isMirror).toBe(true);
  });
});
