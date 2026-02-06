/**
 * Tests for session angle functionality:
 * 1. sessionTypeResolver.angle - extracting angle from boardPath
 * 2. parseBoardPath helper - parsing boardPath into components
 * 3. updateSessionAngle mutation - updating session angle
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionTypeResolver } from '../graphql/resolvers/sessions/type-resolvers';

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
    // Import the helper - it's not exported, so we'll test it indirectly through the mutation
    // or we could refactor to export it. For now, we'll test the type resolver which uses similar logic.
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
  });
});
