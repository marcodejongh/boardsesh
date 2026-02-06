/**
 * Tests for session angle functionality:
 * 1. sessionTypeResolver.angle - extracting angle from boardPath
 * 2. parseBoardPath helper - parsing boardPath into components
 * 3. updateSessionAngle mutation - updating session angle
 */
import { describe, it, expect, vi } from 'vitest';
import { sessionTypeResolver } from '../graphql/resolvers/sessions/type-resolvers';
import { SUPPORTED_BOARDS } from '@boardsesh/shared-schema';

/**
 * Re-implementation of parseBoardPath for testing purposes.
 * This mirrors the logic in mutations.ts to test the parsing behavior.
 */
function parseBoardPath(boardPath: string): {
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
} | null {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length < 5) return null;

  const boardName = parts[0];
  if (!SUPPORTED_BOARDS.includes(boardName as typeof SUPPORTED_BOARDS[number])) {
    return null;
  }

  const layoutId = parseInt(parts[1], 10);
  const sizeId = parseInt(parts[2], 10);
  const angle = parseInt(parts[4], 10);

  if (isNaN(layoutId) || isNaN(sizeId) || isNaN(angle)) {
    return null;
  }

  return {
    boardName,
    layoutId,
    sizeId,
    setIds: parts[3],
    angle,
  };
}

describe('Session Angle', () => {
  describe('sessionTypeResolver.angle', () => {
    it('should extract angle from valid boardPath', () => {
      const session = { boardPath: 'kilter/1/10/1/40' };
      expect(sessionTypeResolver.angle(session)).toBe(40);
    });

    it('should extract angle from boardPath with different values', () => {
      expect(sessionTypeResolver.angle({ boardPath: 'tension/2/15/2,3/55' })).toBe(55);
      expect(sessionTypeResolver.angle({ boardPath: 'kilter/1/1/1/0' })).toBe(0);
      expect(sessionTypeResolver.angle({ boardPath: 'kilter/1/1/1/70' })).toBe(70);
    });

    it('should handle boardPath with leading slash', () => {
      const session = { boardPath: '/kilter/1/10/1/45' };
      // filter(Boolean) removes empty strings, so this should still work
      expect(sessionTypeResolver.angle(session)).toBe(45);
    });

    it('should return default 40 for malformed boardPath', () => {
      expect(sessionTypeResolver.angle({ boardPath: '' })).toBe(40);
      expect(sessionTypeResolver.angle({ boardPath: 'kilter' })).toBe(40);
      expect(sessionTypeResolver.angle({ boardPath: 'kilter/1/2/3' })).toBe(40);
    });

    it('should return default 40 for non-numeric angle', () => {
      const session = { boardPath: 'kilter/1/10/1/abc' };
      expect(sessionTypeResolver.angle(session)).toBe(40);
    });

    it('should handle boardPath with trailing segments', () => {
      // The resolver uses index 4 (5th segment), so trailing segments should not affect it
      const session = { boardPath: 'kilter/1/10/1/40/list' };
      expect(sessionTypeResolver.angle(session)).toBe(40);
    });
  });

  describe('parseBoardPath helper', () => {
    it('should parse valid boardPath', () => {
      const result = parseBoardPath('kilter/1/10/1,2/40');
      expect(result).toEqual({
        boardName: 'kilter',
        layoutId: 1,
        sizeId: 10,
        setIds: '1,2',
        angle: 40,
      });
    });

    it('should parse boardPath with leading slash', () => {
      const result = parseBoardPath('/kilter/1/10/1/45');
      expect(result).toEqual({
        boardName: 'kilter',
        layoutId: 1,
        sizeId: 10,
        setIds: '1',
        angle: 45,
      });
    });

    it('should return null for unsupported board', () => {
      expect(parseBoardPath('unknown/1/10/1/40')).toBeNull();
    });

    it('should return null for too few segments', () => {
      expect(parseBoardPath('')).toBeNull();
      expect(parseBoardPath('kilter')).toBeNull();
      expect(parseBoardPath('kilter/1/10/1')).toBeNull();
    });

    it('should return null for non-numeric layoutId', () => {
      expect(parseBoardPath('kilter/abc/10/1/40')).toBeNull();
    });

    it('should return null for non-numeric sizeId', () => {
      expect(parseBoardPath('kilter/1/abc/1/40')).toBeNull();
    });

    it('should return null for non-numeric angle', () => {
      expect(parseBoardPath('kilter/1/10/1/abc')).toBeNull();
    });

    it('should handle boardPath with trailing segments', () => {
      const result = parseBoardPath('tension/2/15/3/55/list');
      expect(result).toEqual({
        boardName: 'tension',
        layoutId: 2,
        sizeId: 15,
        setIds: '3',
        angle: 55,
      });
    });
  });

  describe('URL angle segment extraction', () => {
    // Test the logic used in persistent-session-context.tsx for URL manipulation

    it('should correctly split boardPath into 5 segments', () => {
      const boardPath = 'kilter/1/10/1/40';
      const segments = boardPath.split('/').filter(Boolean);
      expect(segments).toHaveLength(5);
      expect(segments).toEqual(['kilter', '1', '10', '1', '40']);
    });

    it('should correctly reconstruct URL with new angle', () => {
      const currentPathname = '/kilter/1/10/1/40/list';
      const newBoardPath = 'kilter/1/10/1/55';

      const newBoardPathSegments = newBoardPath.split('/').filter(Boolean);
      const currentPathSegments = currentPathname.split('/');

      // Reconstruct URL
      const trailingSegments = currentPathSegments.slice(6); // Everything after the angle
      const newPath = ['', ...newBoardPathSegments, ...trailingSegments].join('/');

      expect(newPath).toBe('/kilter/1/10/1/55/list');
    });

    it('should preserve trailing climb path', () => {
      const currentPathname = '/kilter/1/10/1/40/climb/abc-123';
      const newBoardPath = 'kilter/1/10/1/55';

      const newBoardPathSegments = newBoardPath.split('/').filter(Boolean);
      const currentPathSegments = currentPathname.split('/');

      const trailingSegments = currentPathSegments.slice(6);
      const newPath = ['', ...newBoardPathSegments, ...trailingSegments].join('/');

      expect(newPath).toBe('/kilter/1/10/1/55/climb/abc-123');
    });

    it('should handle path without trailing segments', () => {
      const currentPathname = '/kilter/1/10/1/40';
      const newBoardPath = 'kilter/1/10/1/55';

      const newBoardPathSegments = newBoardPath.split('/').filter(Boolean);
      const currentPathSegments = currentPathname.split('/');

      // For path without trailing, slice(6) returns empty array
      const trailingSegments = currentPathSegments.slice(6);
      const newPath = ['', ...newBoardPathSegments, ...trailingSegments].join('/');

      expect(newPath).toBe('/kilter/1/10/1/55');
    });

    it('should require at least 6 segments in pathname', () => {
      // pathname.split('/') for '/kilter/1/10/1/40' gives:
      // ['', 'kilter', '1', '10', '1', '40'] - 6 segments
      const currentPathname = '/kilter/1/10/1/40';
      const segments = currentPathname.split('/');
      expect(segments).toHaveLength(6);
      expect(segments.length >= 6).toBe(true);
    });
  });

  describe('updateSessionAngle mutation (integration)', () => {
    // These tests require database and Redis setup
    // They are marked as skipped/todo for now and should be implemented
    // when the test environment is properly configured

    it.todo('should update boardPath in Postgres');
    it.todo('should update boardPath in Redis');
    it.todo('should broadcast AngleChanged event to all session members');
    it.todo('should update queue item stats at the new angle');
    it.todo('should handle version conflicts with retry logic');
    it.todo('should respect rate limiting');
    it.todo('should require session membership');
  });
});
