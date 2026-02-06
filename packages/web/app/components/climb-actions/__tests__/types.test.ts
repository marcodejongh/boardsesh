import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ACTION_ORDER,
  AUTH_REQUIRED_ACTIONS,
  AURORA_CREDENTIALS_REQUIRED_ACTIONS,
  ClimbActionType,
} from '../types';

describe('Climb Action Types & Constants', () => {
  describe('DEFAULT_ACTION_ORDER', () => {
    it('contains all 10 action types', () => {
      expect(DEFAULT_ACTION_ORDER).toHaveLength(10);
    });

    it('has correct ordering', () => {
      expect(DEFAULT_ACTION_ORDER[0]).toBe('viewDetails');
      expect(DEFAULT_ACTION_ORDER[DEFAULT_ACTION_ORDER.length - 1]).toBe('mirror');
    });

    it('contains all expected action types', () => {
      const expectedActions: ClimbActionType[] = [
        'viewDetails',
        'fork',
        'favorite',
        'setActive',
        'queue',
        'tick',
        'share',
        'playlist',
        'openInApp',
        'mirror',
      ];
      for (const action of expectedActions) {
        expect(DEFAULT_ACTION_ORDER).toContain(action);
      }
    });

    it('has no duplicates', () => {
      const unique = new Set(DEFAULT_ACTION_ORDER);
      expect(unique.size).toBe(DEFAULT_ACTION_ORDER.length);
    });
  });

  describe('AUTH_REQUIRED_ACTIONS', () => {
    it('contains exactly favorite and playlist', () => {
      expect(AUTH_REQUIRED_ACTIONS).toHaveLength(2);
      expect(AUTH_REQUIRED_ACTIONS).toContain('favorite');
      expect(AUTH_REQUIRED_ACTIONS).toContain('playlist');
    });

    it('does not contain actions that do not require auth', () => {
      expect(AUTH_REQUIRED_ACTIONS).not.toContain('viewDetails');
      expect(AUTH_REQUIRED_ACTIONS).not.toContain('fork');
      expect(AUTH_REQUIRED_ACTIONS).not.toContain('queue');
      expect(AUTH_REQUIRED_ACTIONS).not.toContain('tick');
      expect(AUTH_REQUIRED_ACTIONS).not.toContain('share');
    });
  });

  describe('AURORA_CREDENTIALS_REQUIRED_ACTIONS', () => {
    it('contains exactly tick', () => {
      expect(AURORA_CREDENTIALS_REQUIRED_ACTIONS).toHaveLength(1);
      expect(AURORA_CREDENTIALS_REQUIRED_ACTIONS).toContain('tick');
    });
  });
});
