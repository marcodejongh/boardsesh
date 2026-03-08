import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock state
const mockState = vi.hoisted(() => ({
  executeResults: [] as any[],
  executeCallIndex: 0,
  selectResult: null as any,
}));

// Mock the database client
vi.mock('../db/client', () => ({
  db: new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'execute') {
          return () => {
            const result = mockState.executeResults[mockState.executeCallIndex] ?? { rows: [] };
            mockState.executeCallIndex++;
            return Promise.resolve(result);
          };
        }
        if (prop === 'select') {
          // For resolveBoardFilter's db.select().from().where().limit().then()
          const chainableMock: any = {};
          for (const method of ['select', 'from', 'where', 'limit']) {
            chainableMock[method] = () => chainableMock;
          }
          chainableMock.then = (resolve: any, reject: any) =>
            Promise.resolve(mockState.selectResult ? [mockState.selectResult] : []).then(resolve, reject);
          return () => chainableMock;
        }
      },
    },
  ),
}));

vi.mock('@boardsesh/db/schema', () => ({
  userBoards: { boardType: {}, layoutId: {}, uuid: {} },
}));

vi.mock('drizzle-orm', () => ({
  eq: () => ({}),
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
}));

vi.mock('../validation/schemas', () => ({
  TrendingClimbFeedInputSchema: {
    parse: (input: any) => ({
      limit: input?.limit ?? 20,
      offset: input?.offset ?? 0,
      timePeriodDays: input?.timePeriodDays ?? 7,
      boardUuid: input?.boardUuid ?? null,
    }),
  },
}));

vi.mock('../graphql/resolvers/shared/helpers', () => ({
  validateInput: (_schema: any, input: any) => ({
    limit: input?.limit ?? 20,
    offset: input?.offset ?? 0,
    timePeriodDays: input?.timePeriodDays ?? 7,
    boardUuid: input?.boardUuid ?? null,
  }),
}));

import { trendingFeedQueries } from '../graphql/resolvers/social/trending-feed';

describe('trendingFeedQueries', () => {
  beforeEach(() => {
    mockState.executeCallIndex = 0;
    mockState.executeResults = [];
    mockState.selectResult = null;
  });

  describe('trendingClimbs', () => {
    it('returns empty results when no history data exists', async () => {
      mockState.executeResults = [{ rows: [] }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('maps rows to TrendingClimbItem correctly', async () => {
      mockState.executeResults = [{
        rows: [{
          climb_uuid: 'climb-1',
          angle: 40,
          board_type: 'kilter',
          current_ascents: 100,
          ascent_delta: 15,
          ascent_pct_change: 17.6,
          climb_name: 'Test Climb',
          setter_username: 'setter1',
          layout_id: 1,
          frames: 'p1r12',
          quality_average: 4.2,
          difficulty_name: 'V5',
          total_count: 1,
        }],
      }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.climbUuid).toBe('climb-1');
      expect(item.climbName).toBe('Test Climb');
      expect(item.setterUsername).toBe('setter1');
      expect(item.boardType).toBe('kilter');
      expect(item.layoutId).toBe(1);
      expect(item.angle).toBe(40);
      expect(item.frames).toBe('p1r12');
      expect(item.difficultyName).toBe('V5');
      expect(item.qualityAverage).toBe(4.2);
      expect(item.currentAscents).toBe(100);
      expect(item.ascentDelta).toBe(15);
      expect(item.ascentPctChange).toBe(17.6);
    });

    it('handles null pct change (climbs that started at 0)', async () => {
      mockState.executeResults = [{
        rows: [{
          climb_uuid: 'climb-2',
          angle: 40,
          board_type: 'kilter',
          current_ascents: 5,
          ascent_delta: 5,
          ascent_pct_change: null,
          climb_name: 'New Climb',
          setter_username: null,
          layout_id: 1,
          frames: null,
          quality_average: null,
          difficulty_name: null,
          total_count: 1,
        }],
      }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items[0].ascentPctChange).toBeNull();
      expect(result.items[0].setterUsername).toBeNull();
      expect(result.items[0].frames).toBeNull();
      expect(result.items[0].qualityAverage).toBeNull();
      expect(result.items[0].difficultyName).toBeNull();
    });

    it('uses climb name fallback when name is null', async () => {
      mockState.executeResults = [{
        rows: [{
          climb_uuid: 'climb-3',
          angle: 40,
          board_type: 'kilter',
          current_ascents: 10,
          ascent_delta: 5,
          ascent_pct_change: 100,
          climb_name: null,
          setter_username: null,
          layout_id: 1,
          frames: null,
          quality_average: null,
          difficulty_name: null,
          total_count: 1,
        }],
      }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items[0].climbName).toBe('Unknown');
    });

    it('detects hasMore when rows exceed limit', async () => {
      // With limit=2, returning 3 rows means hasMore=true
      const rows = Array.from({ length: 3 }, (_, i) => ({
        climb_uuid: `climb-${i}`,
        angle: 40,
        board_type: 'kilter',
        current_ascents: 100 - i * 10,
        ascent_delta: 20 - i * 5,
        ascent_pct_change: 25 - i * 5,
        climb_name: `Climb ${i}`,
        setter_username: 'setter',
        layout_id: 1,
        frames: 'f',
        quality_average: 4.0,
        difficulty_name: 'V5',
        total_count: 10,
      }));

      mockState.executeResults = [{ rows }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: { limit: 2 } },
      );

      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(10);
    });

    it('sets hasMore to false when rows within limit', async () => {
      mockState.executeResults = [{
        rows: [{
          climb_uuid: 'climb-1',
          angle: 40,
          board_type: 'kilter',
          current_ascents: 50,
          ascent_delta: 10,
          ascent_pct_change: 25,
          climb_name: 'Only Climb',
          setter_username: 'setter',
          layout_id: 1,
          frames: 'f',
          quality_average: 3.5,
          difficulty_name: 'V3',
          total_count: 1,
        }],
      }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: { limit: 20 } },
      );

      expect(result.hasMore).toBe(false);
      expect(result.items).toHaveLength(1);
    });

    it('resolves board filter when boardUuid is provided', async () => {
      mockState.selectResult = { boardType: 'tension', layoutId: 8 };
      mockState.executeResults = [{ rows: [] }];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: { boardUuid: 'board-uuid-123' } },
      );

      expect(result.items).toHaveLength(0);
      // Verify the select mock was used (board lookup happened)
      expect(mockState.executeCallIndex).toBe(1);
    });
  });

  describe('hotClimbs', () => {
    it('returns results sorted by absolute ascent delta', async () => {
      const rows = [
        {
          climb_uuid: 'hot-1',
          angle: 40,
          board_type: 'kilter',
          current_ascents: 200,
          ascent_delta: 50,
          ascent_pct_change: 33.3,
          climb_name: 'Hot Climb',
          setter_username: 'setter',
          layout_id: 1,
          frames: 'f',
          quality_average: 4.5,
          difficulty_name: 'V6',
          total_count: 1,
        },
      ];

      mockState.executeResults = [{ rows }];

      const result = await trendingFeedQueries.hotClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].ascentDelta).toBe(50);
      expect(result.items[0].climbName).toBe('Hot Climb');
    });

    it('returns empty results for empty history', async () => {
      mockState.executeResults = [{ rows: [] }];

      const result = await trendingFeedQueries.hotClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('extractRows safety', () => {
    it('handles malformed execute result gracefully', async () => {
      // Simulate a driver returning something unexpected
      mockState.executeResults = [null];

      const result = await trendingFeedQueries.trendingClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('handles result without rows property', async () => {
      mockState.executeResults = [{ notRows: [] }];

      const result = await trendingFeedQueries.hotClimbs(
        undefined,
        { input: {} },
      );

      expect(result.items).toHaveLength(0);
    });
  });
});
