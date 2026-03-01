import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    execute: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb };
});

vi.mock('../db/client', () => ({
  db: mockDb,
}));

vi.mock('../events/index', () => ({
  publishSocialEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../utils/redis-rate-limiter', () => ({
  checkRateLimitRedis: vi.fn(),
}));

vi.mock('../db/queries/util/table-select', () => ({
  getBoardTables: vi.fn().mockReturnValue({
    climbs: { uuid: 'uuid', layoutId: 'layoutId', boardType: 'boardType', setterUsername: 'setterUsername', name: 'name', description: 'description', frames: 'frames', createdAt: 'createdAt', edgeLeft: 'edgeLeft', edgeRight: 'edgeRight', edgeBottom: 'edgeBottom', edgeTop: 'edgeTop' },
    climbStats: { climbUuid: 'climbUuid', boardType: 'boardType', angle: 'angle', ascensionistCount: 'ascensionistCount', qualityAverage: 'qualityAverage', difficultyAverage: 'difficultyAverage', displayDifficulty: 'displayDifficulty', benchmarkDifficulty: 'benchmarkDifficulty' },
    difficultyGrades: { boardType: 'boardType', difficulty: 'difficulty', boulderName: 'boulderName' },
  }),
  isValidBoardName: vi.fn().mockReturnValue(true),
}));

vi.mock('../db/queries/util/hold-state', () => ({
  convertLitUpHoldsStringToMap: vi.fn().mockReturnValue([{}]),
}));

vi.mock('../db/queries/util/product-sizes-data', () => ({
  getSizeEdges: vi.fn().mockReturnValue({ edgeLeft: 0, edgeRight: 100, edgeBottom: 0, edgeTop: 100 }),
}));

import type { ConnectionContext } from '@boardsesh/shared-schema';
import { playlistQueries } from '../graphql/resolvers/playlists/queries';

function makeCtx(overrides: Partial<ConnectionContext> = {}): ConnectionContext {
  return {
    connectionId: 'conn-1',
    isAuthenticated: false,
    userId: null,
    sessionId: null,
    boardPath: null,
    controllerId: null,
    controllerApiKey: null,
    ...overrides,
  } as ConnectionContext;
}

function createMockChain(resolveValue: unknown = []): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'where', 'leftJoin', 'innerJoin',
    'groupBy', 'orderBy', 'limit', 'offset',
    'insert', 'values', 'onConflictDoNothing', 'returning',
    'delete', 'update', 'set',
  ];

  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve);

  for (const method of methods) {
    chain[method] = vi.fn((..._args: unknown[]) => chain);
  }

  return chain;
}

const NOW = new Date('2026-01-15T12:00:00Z');

function makePlaylistRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(1),
    uuid: 'pl-1',
    boardType: 'kilter',
    layoutId: 1,
    name: 'Test Playlist',
    description: 'A test playlist',
    color: '#FF0000',
    icon: null,
    createdAt: NOW,
    updatedAt: NOW,
    creatorId: 'creator-1',
    creatorName: 'TestUser',
    climbCount: 5,
    ...overrides,
  };
}

describe('discoverPlaylists resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return playlists without boardType or layoutId filter', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 2 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Results query
    const resultsChain = createMockChain([
      makePlaylistRow({ uuid: 'pl-1', boardType: 'kilter', name: 'Kilter Playlist' }),
      makePlaylistRow({ uuid: 'pl-2', boardType: 'tension', name: 'Tension Playlist', id: BigInt(2) }),
    ]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: {} },
      ctx,
    );

    expect(result.totalCount).toBe(2);
    expect(result.playlists).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.playlists[0]).toMatchObject({ uuid: 'pl-1', boardType: 'kilter' });
    expect(result.playlists[1]).toMatchObject({ uuid: 'pl-2', boardType: 'tension' });
  });

  it('should filter by boardType when provided', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Results query
    const resultsChain = createMockChain([
      makePlaylistRow({ uuid: 'pl-1', boardType: 'kilter' }),
    ]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: { boardType: 'kilter' } },
      ctx,
    );

    expect(result.totalCount).toBe(1);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0]).toMatchObject({ boardType: 'kilter' });
  });

  it('should filter by boardType and layoutId when both provided', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Results query
    const resultsChain = createMockChain([
      makePlaylistRow({ uuid: 'pl-1', boardType: 'kilter', layoutId: 8 }),
    ]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: { boardType: 'kilter', layoutId: 8 } },
      ctx,
    );

    expect(result.totalCount).toBe(1);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0]).toMatchObject({ boardType: 'kilter', layoutId: 8 });
  });

  it('should paginate correctly with hasMore', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 25 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Return pageSize + 1 results to trigger hasMore
    const rows = Array.from({ length: 11 }, (_, i) =>
      makePlaylistRow({ uuid: `pl-${i}`, id: BigInt(i + 1), name: `Playlist ${i}` }),
    );
    const resultsChain = createMockChain(rows);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: { pageSize: 10, page: 0 } },
      ctx,
    );

    expect(result.hasMore).toBe(true);
    expect(result.playlists).toHaveLength(10); // Trimmed to pageSize
    expect(result.totalCount).toBe(25);
  });

  it('should return empty results when no playlists match', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 0 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Empty results
    const resultsChain = createMockChain([]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: { boardType: 'tension', layoutId: 99 } },
      ctx,
    );

    expect(result.totalCount).toBe(0);
    expect(result.playlists).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('should support name filter', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Results query
    const resultsChain = createMockChain([
      makePlaylistRow({ uuid: 'pl-1', name: 'Hard Boulders' }),
    ]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: { name: 'boulders' } },
      ctx,
    );

    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0]).toMatchObject({ name: 'Hard Boulders' });
  });

  it('should not require authentication', async () => {
    const ctx = makeCtx({ isAuthenticated: false, userId: null });

    // 1. Count query
    const countChain = createMockChain([{ count: 1 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Results query
    const resultsChain = createMockChain([
      makePlaylistRow(),
    ]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    // Should NOT throw — discoverPlaylists is public
    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: {} },
      ctx,
    );

    expect(result.playlists).toHaveLength(1);
  });

  it('should support sortBy popular', async () => {
    const ctx = makeCtx();

    // 1. Count query
    const countChain = createMockChain([{ count: 2 }]);
    mockDb.select.mockReturnValueOnce(countChain);

    // 2. Results query
    const resultsChain = createMockChain([
      makePlaylistRow({ uuid: 'pl-popular', climbCount: 50 }),
      makePlaylistRow({ uuid: 'pl-small', climbCount: 2, id: BigInt(2) }),
    ]);
    mockDb.select.mockReturnValueOnce(resultsChain);

    const result = await playlistQueries.discoverPlaylists(
      null,
      { input: { sortBy: 'popular' } },
      ctx,
    );

    expect(result.playlists).toHaveLength(2);
    // First result should be the popular one (mock returns in order)
    expect(result.playlists[0]).toMatchObject({ uuid: 'pl-popular' });
  });
});
