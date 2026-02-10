import { describe, it, expect, vi } from 'vitest';

// Mock the db client to avoid DATABASE_URL requirement
vi.mock('../../db/client', () => ({ db: {} }));

import { resolveFollowRecipient } from '../recipient-resolution';

describe('resolveFollowRecipient', () => {
  it('returns recipient for valid follow metadata', () => {
    const result = resolveFollowRecipient({
      followedUserId: 'user-123',
    });

    expect(result).toEqual({
      recipientId: 'user-123',
      notificationType: 'new_follower',
    });
  });

  it('returns null when followedUserId is missing', () => {
    const result = resolveFollowRecipient({});
    expect(result).toBeNull();
  });

  it('returns null for empty string followedUserId', () => {
    const result = resolveFollowRecipient({ followedUserId: '' });
    expect(result).toBeNull();
  });

  it('ignores extra metadata fields', () => {
    const result = resolveFollowRecipient({
      followedUserId: 'user-456',
      extraField: 'ignored',
    });

    expect(result).toEqual({
      recipientId: 'user-456',
      notificationType: 'new_follower',
    });
  });
});
