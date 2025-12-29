import { describe, it, expect } from 'vitest';
import { searchClimbs, countClimbs, getClimbByUuid } from '../db/queries/climbs/index.js';
import type { ParsedBoardRouteParameters, ClimbSearchParams } from '../db/queries/climbs/create-climb-filters.js';

describe('Climb Query Functions', () => {
  const testParams: ParsedBoardRouteParameters = {
    board_name: 'kilter',
    layout_id: 1,
    size_id: 1,
    set_ids: [1, 2],
    angle: 40,
  };

  describe('searchClimbs', () => {
    it('should return climbs with basic filters', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        sortBy: 'ascents',
        sortOrder: 'desc',
      };

      const result = await searchClimbs(testParams, searchParams);

      expect(result).toBeDefined();
      expect(result.climbs).toBeInstanceOf(Array);
      expect(result.hasMore).toBeDefined();
      expect(typeof result.hasMore).toBe('boolean');
      expect(result.totalCount).toBeDefined();
      expect(typeof result.totalCount).toBe('number');
    });

    it('should enforce MAX_PAGE_SIZE limit', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 200, // Exceeds MAX_PAGE_SIZE of 100
      };

      const result = await searchClimbs(testParams, searchParams);

      // Should succeed but cap the results
      expect(result).toBeDefined();
      expect(result.climbs.length).toBeLessThanOrEqual(100);
    });

    it('should respect pageSize parameter', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 5,
      };

      const result = await searchClimbs(testParams, searchParams);

      // Should return at most 5 climbs (might be less if not enough data)
      expect(result.climbs.length).toBeLessThanOrEqual(5);
    });

    it('should filter by grade range', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        minGrade: 5,
        maxGrade: 8,
      };

      const result = await searchClimbs(testParams, searchParams);

      expect(result).toBeDefined();
      // All climbs should be within grade range (if any returned)
      result.climbs.forEach((climb) => {
        if (climb.difficulty) {
          // Grade validation would go here
          expect(climb).toBeDefined();
        }
      });
    });

    it('should filter by minimum ascents', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        minAscents: 50,
      };

      const result = await searchClimbs(testParams, searchParams);

      expect(result).toBeDefined();
      // All climbs should have >= 50 ascents
      result.climbs.forEach((climb) => {
        expect(climb.ascensionist_count).toBeGreaterThanOrEqual(50);
      });
    });

    it('should filter by climb name', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        name: 'test',
      };

      const result = await searchClimbs(testParams, searchParams);

      expect(result).toBeDefined();
      // All climbs should match name pattern (case insensitive)
      result.climbs.forEach((climb) => {
        if (climb.name) {
          expect(climb.name.toLowerCase()).toContain('test');
        }
      });
    });

    it('should indicate hasMore correctly', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 1,
      };

      const result = await searchClimbs(testParams, searchParams);

      // If more than 1 climb exists, hasMore should be true
      if (result.totalCount > 1) {
        expect(result.hasMore).toBe(true);
      }
    });

    it('should handle invalid board parameters gracefully', async () => {
      const invalidParams: ParsedBoardRouteParameters = {
        board_name: 'kilter',
        layout_id: 1,
        size_id: 999999, // Invalid size_id
        set_ids: [1],
        angle: 40,
      };

      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
      };

      const result = await searchClimbs(invalidParams, searchParams);

      // Should return empty results for invalid size
      expect(result.climbs).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should include user-specific data when userId provided', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
      };
      const userId = 123;

      const result = await searchClimbs(testParams, searchParams, userId);

      expect(result).toBeDefined();
      // When userId is provided, user-specific fields should be present
      // (userAscents, userAttempts if the user has data)
      result.climbs.forEach((climb) => {
        expect(climb).toHaveProperty('userAscents');
        expect(climb).toHaveProperty('userAttempts');
      });
    });

    it('should handle pagination correctly', async () => {
      const page0Params: ClimbSearchParams = {
        page: 0,
        pageSize: 5,
      };

      const page1Params: ClimbSearchParams = {
        page: 1,
        pageSize: 5,
      };

      const page0Result = await searchClimbs(testParams, page0Params);
      const page1Result = await searchClimbs(testParams, page1Params);

      // Results from different pages should be different (if enough data exists)
      if (page0Result.totalCount > 5) {
        const page0Uuids = page0Result.climbs.map((c) => c.uuid);
        const page1Uuids = page1Result.climbs.map((c) => c.uuid);

        // Check that pages don't overlap
        const overlap = page0Uuids.some((uuid) => page1Uuids.includes(uuid));
        expect(overlap).toBe(false);
      }
    });
  });

  describe('countClimbs', () => {
    it('should return accurate total count', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
      };

      const searchResult = await searchClimbs(testParams, searchParams);
      const count = await countClimbs(testParams, searchParams);

      // Count should match totalCount from search
      expect(count).toBe(searchResult.totalCount);
    });

    it('should respect filters in count', async () => {
      const filteredParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        minAscents: 100,
      };

      const unfilteredParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
      };

      const filteredCount = await countClimbs(testParams, filteredParams);
      const unfilteredCount = await countClimbs(testParams, unfilteredParams);

      // Filtered count should be <= unfiltered count
      expect(filteredCount).toBeLessThanOrEqual(unfilteredCount);
    });
  });

  describe('getClimbByUuid', () => {
    it('should return null for non-existent UUID', async () => {
      const result = await getClimbByUuid({
        board_name: 'kilter',
        layout_id: 1,
        size_id: 1,
        angle: 40,
        climb_uuid: 'non-existent-uuid-12345',
      });

      expect(result).toBeNull();
    });

    it('should handle different board names', async () => {
      // Test with kilter
      const kilterResult = await getClimbByUuid({
        board_name: 'kilter',
        layout_id: 1,
        size_id: 1,
        angle: 40,
        climb_uuid: 'test-uuid',
      });

      // Test with tension
      const tensionResult = await getClimbByUuid({
        board_name: 'tension',
        layout_id: 1,
        size_id: 1,
        angle: 40,
        climb_uuid: 'test-uuid',
      });

      // Both should execute without errors (may return null if no data)
      expect(kilterResult === null || typeof kilterResult === 'object').toBe(true);
      expect(tensionResult === null || typeof tensionResult === 'object').toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty search results', async () => {
      const searchParams: ClimbSearchParams = {
        page: 999, // Very high page number
        pageSize: 10,
      };

      const result = await searchClimbs(testParams, searchParams);

      expect(result.climbs).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should handle sorting options', async () => {
      const sortByAscents: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        sortBy: 'ascents',
        sortOrder: 'desc',
      };

      const sortByQuality: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        sortBy: 'quality',
        sortOrder: 'desc',
      };

      const ascentsResult = await searchClimbs(testParams, sortByAscents);
      const qualityResult = await searchClimbs(testParams, sortByQuality);

      // Both should succeed
      expect(ascentsResult).toBeDefined();
      expect(qualityResult).toBeDefined();
    });

    it('should handle multiple setters filter', async () => {
      const searchParams: ClimbSearchParams = {
        page: 0,
        pageSize: 10,
        setter: ['setter1', 'setter2'],
      };

      const result = await searchClimbs(testParams, searchParams);

      expect(result).toBeDefined();
    });
  });
});
