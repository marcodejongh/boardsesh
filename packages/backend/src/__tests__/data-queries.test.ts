import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, Client } from 'graphql-ws';
import WebSocket from 'ws';
import { startServer } from '../server';

const TEST_PORT = 8085; // Different port from other test files

// Helper to execute GraphQL operations
async function execute<T>(
  client: Client,
  operation: { query: string; variables?: Record<string, unknown> },
): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    client.subscribe<T>(operation, {
      next: (data) => {
        if (data.errors) {
          reject(new Error(data.errors[0].message));
          return;
        }
        result = data.data as T;
      },
      error: (err) => reject(err),
      complete: () => resolve(result),
    });
  });
}

// Helper to expect GraphQL errors
async function expectError(
  client: Client,
  operation: { query: string; variables?: Record<string, unknown> },
  expectedMessage?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.subscribe(operation, {
      next: (data) => {
        if (data.errors && data.errors.length > 0) {
          if (expectedMessage) {
            expect(data.errors[0].message).toContain(expectedMessage);
          }
          resolve();
        } else {
          reject(new Error('Expected GraphQL error but got success'));
        }
      },
      error: () => resolve(), // Connection errors are also acceptable
      complete: () => reject(new Error('Expected error but query completed successfully')),
    });
  });
}

describe('Data Query Resolver Validation', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  let client: Client;

  beforeAll(async () => {
    process.env.PORT = TEST_PORT.toString();
    server = await startServer();
    client = createClient({
      url: `ws://localhost:${TEST_PORT}/graphql`,
      webSocketImpl: WebSocket,
    });
  });

  afterAll(async () => {
    client.dispose();
    await new Promise<void>((resolve) => {
      server.httpServer.close(() => {
        server.wss.close(() => {
          resolve();
        });
      });
    });
  });

  // ============================================
  // betaLinks
  // ============================================
  describe('betaLinks', () => {
    const BETA_LINKS_QUERY = `
      query BetaLinks($boardName: String!, $climbUuid: String!) {
        betaLinks(boardName: $boardName, climbUuid: $climbUuid) {
          climbUuid
          link
          foreignUsername
          angle
        }
      }
    `;

    it('should reject invalid board name', async () => {
      await expectError(
        client,
        {
          query: BETA_LINKS_QUERY,
          variables: { boardName: 'invalid-board', climbUuid: 'test-uuid' },
        },
        'Board name must be kilter, tension, or moonboard',
      );
    });

    it('should reject empty climbUuid', async () => {
      await expectError(
        client,
        {
          query: BETA_LINKS_QUERY,
          variables: { boardName: 'kilter', climbUuid: '' },
        },
        'UUID cannot be empty',
      );
    });

    it('should pass validation with valid input', async () => {
      // Valid input passes validation but may fail at DB level (tables not in test DB).
      // We verify validation passes by checking the error is a DB/query error, not a validation error.
      try {
        await execute<{ betaLinks: unknown[] }>(client, {
          query: BETA_LINKS_QUERY,
          variables: { boardName: 'kilter', climbUuid: 'some-climb-uuid' },
        });
      } catch (e: unknown) {
        // DB errors are acceptable — the important thing is no validation error
        const message = (e as Error).message;
        expect(message).not.toContain('Board name must be');
        expect(message).not.toContain('UUID cannot be empty');
      }
    });
  });

  // ============================================
  // climbStatsForAllAngles
  // ============================================
  describe('climbStatsForAllAngles', () => {
    const CLIMB_STATS_QUERY = `
      query ClimbStatsForAllAngles($boardName: String!, $climbUuid: String!) {
        climbStatsForAllAngles(boardName: $boardName, climbUuid: $climbUuid) {
          angle
          ascensionistCount
          qualityAverage
          difficulty
        }
      }
    `;

    it('should reject invalid board name', async () => {
      await expectError(
        client,
        {
          query: CLIMB_STATS_QUERY,
          variables: { boardName: 'notaboard', climbUuid: 'test-uuid' },
        },
        'Board name must be kilter, tension, or moonboard',
      );
    });

    it('should reject empty climbUuid', async () => {
      await expectError(
        client,
        {
          query: CLIMB_STATS_QUERY,
          variables: { boardName: 'kilter', climbUuid: '' },
        },
        'UUID cannot be empty',
      );
    });

    it('should pass validation with valid input', async () => {
      // Valid input passes validation but may fail at DB level (tables not in test DB).
      try {
        await execute<{ climbStatsForAllAngles: unknown[] }>(client, {
          query: CLIMB_STATS_QUERY,
          variables: { boardName: 'kilter', climbUuid: 'some-climb-uuid' },
        });
      } catch (e: unknown) {
        const message = (e as Error).message;
        expect(message).not.toContain('Board name must be');
        expect(message).not.toContain('UUID cannot be empty');
      }
    });
  });

  // ============================================
  // holdClassifications (requires auth)
  // ============================================
  describe('holdClassifications', () => {
    const HOLD_CLASSIFICATIONS_QUERY = `
      query HoldClassifications($input: GetHoldClassificationsInput!) {
        holdClassifications(input: $input) {
          id
          holdId
          holdType
        }
      }
    `;

    it('should reject unauthenticated request', async () => {
      await expectError(
        client,
        {
          query: HOLD_CLASSIFICATIONS_QUERY,
          variables: {
            input: { boardType: 'kilter', layoutId: 1, sizeId: 1 },
          },
        },
        'Authentication required',
      );
    });

    it('should reject invalid board type', async () => {
      await expectError(
        client,
        {
          query: HOLD_CLASSIFICATIONS_QUERY,
          variables: {
            input: { boardType: 'invalid', layoutId: 1, sizeId: 1 },
          },
        },
      );
    });

    it('should reject non-positive layoutId', async () => {
      await expectError(
        client,
        {
          query: HOLD_CLASSIFICATIONS_QUERY,
          variables: {
            input: { boardType: 'kilter', layoutId: 0, sizeId: 1 },
          },
        },
      );
    });
  });

  // ============================================
  // userBoardMappings (requires auth)
  // ============================================
  describe('userBoardMappings', () => {
    const USER_BOARD_MAPPINGS_QUERY = `
      query UserBoardMappings {
        userBoardMappings {
          id
          boardType
          boardUserId
        }
      }
    `;

    it('should reject unauthenticated request', async () => {
      await expectError(
        client,
        { query: USER_BOARD_MAPPINGS_QUERY },
        'Authentication required',
      );
    });
  });

  // ============================================
  // unsyncedCounts (requires auth)
  // ============================================
  describe('unsyncedCounts', () => {
    const UNSYNCED_COUNTS_QUERY = `
      query UnsyncedCounts {
        unsyncedCounts {
          kilter { ascents climbs }
          tension { ascents climbs }
        }
      }
    `;

    it('should reject unauthenticated request', async () => {
      await expectError(
        client,
        { query: UNSYNCED_COUNTS_QUERY },
        'Authentication required',
      );
    });
  });

  // ============================================
  // setterStats
  // ============================================
  describe('setterStats', () => {
    const SETTER_STATS_QUERY = `
      query SetterStats($input: SetterStatsInput!) {
        setterStats(input: $input) {
          setterUsername
          climbCount
        }
      }
    `;

    it('should reject invalid board name', async () => {
      await expectError(
        client,
        {
          query: SETTER_STATS_QUERY,
          variables: {
            input: {
              boardName: 'invalid-board',
              layoutId: 1,
              sizeId: 1,
              setIds: '1',
              angle: 40,
            },
          },
        },
        'Board name must be kilter, tension, or moonboard',
      );
    });

    it('should reject non-positive layoutId', async () => {
      await expectError(
        client,
        {
          query: SETTER_STATS_QUERY,
          variables: {
            input: {
              boardName: 'kilter',
              layoutId: -1,
              sizeId: 1,
              setIds: '1',
              angle: 40,
            },
          },
        },
      );
    });

    it('should reject empty setIds', async () => {
      await expectError(
        client,
        {
          query: SETTER_STATS_QUERY,
          variables: {
            input: {
              boardName: 'kilter',
              layoutId: 1,
              sizeId: 1,
              setIds: '',
              angle: 40,
            },
          },
        },
      );
    });

    it('should accept valid input with search parameter', async () => {
      const result = await execute<{ setterStats: unknown[] }>(client, {
        query: SETTER_STATS_QUERY,
        variables: {
          input: {
            boardName: 'kilter',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
            search: 'testuser',
          },
        },
      });

      expect(result.setterStats).toBeDefined();
      expect(Array.isArray(result.setterStats)).toBe(true);
    });

    it('should handle LIKE wildcard characters in search safely', async () => {
      // Searching for literal % and _ should not cause unexpected behavior
      const result = await execute<{ setterStats: unknown[] }>(client, {
        query: SETTER_STATS_QUERY,
        variables: {
          input: {
            boardName: 'kilter',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
            search: '100%_user',
          },
        },
      });

      expect(result.setterStats).toBeDefined();
      expect(Array.isArray(result.setterStats)).toBe(true);
    });

    it('should return empty array for moonboard', async () => {
      const result = await execute<{ setterStats: unknown[] }>(client, {
        query: SETTER_STATS_QUERY,
        variables: {
          input: {
            boardName: 'moonboard',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
          },
        },
      });

      expect(result.setterStats).toEqual([]);
    });
  });

  // ============================================
  // holdHeatmap
  // ============================================
  describe('holdHeatmap', () => {
    const HOLD_HEATMAP_QUERY = `
      query HoldHeatmap($input: HoldHeatmapInput!) {
        holdHeatmap(input: $input) {
          holdId
          totalUses
          startingUses
          totalAscents
        }
      }
    `;

    it('should reject invalid board name', async () => {
      await expectError(
        client,
        {
          query: HOLD_HEATMAP_QUERY,
          variables: {
            input: {
              boardName: 'fake-board',
              layoutId: 1,
              sizeId: 1,
              setIds: '1',
              angle: 40,
            },
          },
        },
        'Board name must be kilter, tension, or moonboard',
      );
    });

    it('should reject non-positive layoutId', async () => {
      await expectError(
        client,
        {
          query: HOLD_HEATMAP_QUERY,
          variables: {
            input: {
              boardName: 'kilter',
              layoutId: 0,
              sizeId: 1,
              setIds: '1',
              angle: 40,
            },
          },
        },
      );
    });

    it('should return empty array for moonboard', async () => {
      const result = await execute<{ holdHeatmap: unknown[] }>(client, {
        query: HOLD_HEATMAP_QUERY,
        variables: {
          input: {
            boardName: 'moonboard',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
          },
        },
      });

      expect(result.holdHeatmap).toEqual([]);
    });
  });

  // ============================================
  // saveHoldClassification (requires auth)
  // ============================================
  describe('saveHoldClassification', () => {
    const SAVE_HOLD_CLASSIFICATION_MUTATION = `
      mutation SaveHoldClassification($input: SaveHoldClassificationInput!) {
        saveHoldClassification(input: $input) {
          id
          holdId
          holdType
        }
      }
    `;

    it('should reject unauthenticated request', async () => {
      await expectError(
        client,
        {
          query: SAVE_HOLD_CLASSIFICATION_MUTATION,
          variables: {
            input: {
              boardType: 'kilter',
              layoutId: 1,
              sizeId: 1,
              holdId: 42,
              holdType: 'crimp',
            },
          },
        },
        'Authentication required',
      );
    });

    it('should reject invalid board type', async () => {
      await expectError(
        client,
        {
          query: SAVE_HOLD_CLASSIFICATION_MUTATION,
          variables: {
            input: {
              boardType: 'invalid',
              layoutId: 1,
              sizeId: 1,
              holdId: 42,
            },
          },
        },
      );
    });

    it('should reject non-positive holdId', async () => {
      await expectError(
        client,
        {
          query: SAVE_HOLD_CLASSIFICATION_MUTATION,
          variables: {
            input: {
              boardType: 'kilter',
              layoutId: 1,
              sizeId: 1,
              holdId: -1,
            },
          },
        },
      );
    });
  });

  // ============================================
  // saveUserBoardMapping (requires auth)
  // ============================================
  describe('saveUserBoardMapping', () => {
    const SAVE_USER_BOARD_MAPPING_MUTATION = `
      mutation SaveUserBoardMapping($input: SaveUserBoardMappingInput!) {
        saveUserBoardMapping(input: $input)
      }
    `;

    it('should reject unauthenticated request', async () => {
      await expectError(
        client,
        {
          query: SAVE_USER_BOARD_MAPPING_MUTATION,
          variables: {
            input: {
              boardType: 'kilter',
              boardUserId: 12345,
              boardUsername: 'climber1',
            },
          },
        },
        'Authentication required',
      );
    });

    it('should reject invalid board type (moonboard not allowed)', async () => {
      await expectError(
        client,
        {
          query: SAVE_USER_BOARD_MAPPING_MUTATION,
          variables: {
            input: {
              boardType: 'moonboard',
              boardUserId: 12345,
            },
          },
        },
        'Board type must be kilter or tension',
      );
    });

    it('should reject non-positive boardUserId', async () => {
      await expectError(
        client,
        {
          query: SAVE_USER_BOARD_MAPPING_MUTATION,
          variables: {
            input: {
              boardType: 'kilter',
              boardUserId: 0,
            },
          },
        },
      );
    });
  });
});
