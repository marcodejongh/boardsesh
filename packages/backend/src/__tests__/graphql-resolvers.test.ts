import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, Client } from 'graphql-ws';
import WebSocket from 'ws';
import { startServer } from '../server.js';

const TEST_PORT = 8084; // Different port to avoid conflicts

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

describe('GraphQL Resolver Input Validation', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  let client: Client;

  beforeAll(async () => {
    server = await startServer(TEST_PORT);
    client = createClient({
      url: `ws://localhost:${TEST_PORT}/graphql`,
      webSocketImpl: WebSocket,
    });
  });

  afterAll(async () => {
    client.dispose();
    await server.stop();
  });

  describe('Session Query Validation', () => {
    it('should reject invalid session ID with special characters', async () => {
      const query = `
        query TestSession($sessionId: String!) {
          session(sessionId: $sessionId) {
            id
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: { sessionId: 'test<script>alert(1)</script>' },
        },
        'Invalid sessionId',
      );
    });

    it('should reject empty session ID', async () => {
      const query = `
        query TestSession($sessionId: String!) {
          session(sessionId: $sessionId) {
            id
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: { sessionId: '' },
        },
        'Session ID cannot be empty',
      );
    });
  });

  describe('Climb Query Validation', () => {
    it('should reject invalid layoutId (negative)', async () => {
      const query = `
        query TestClimb(
          $boardName: String!
          $layoutId: Int!
          $sizeId: Int!
          $setIds: String!
          $angle: Int!
          $climbUuid: String!
        ) {
          climb(
            boardName: $boardName
            layoutId: $layoutId
            sizeId: $sizeId
            setIds: $setIds
            angle: $angle
            climbUuid: $climbUuid
          ) {
            uuid
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: {
            boardName: 'kilter',
            layoutId: -1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
            climbUuid: 'test-uuid',
          },
        },
        'Invalid layoutId',
      );
    });

    it('should reject invalid angle (> 90)', async () => {
      const query = `
        query TestClimb(
          $boardName: String!
          $layoutId: Int!
          $sizeId: Int!
          $setIds: String!
          $angle: Int!
          $climbUuid: String!
        ) {
          climb(
            boardName: $boardName
            layoutId: $layoutId
            sizeId: $sizeId
            setIds: $setIds
            angle: $angle
            climbUuid: $climbUuid
          ) {
            uuid
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: {
            boardName: 'kilter',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 100,
            climbUuid: 'test-uuid',
          },
        },
        'Invalid angle',
      );
    });

    it('should reject invalid board name', async () => {
      const query = `
        query TestClimb(
          $boardName: String!
          $layoutId: Int!
          $sizeId: Int!
          $setIds: String!
          $angle: Int!
          $climbUuid: String!
        ) {
          climb(
            boardName: $boardName
            layoutId: $layoutId
            sizeId: $sizeId
            setIds: $setIds
            angle: $angle
            climbUuid: $climbUuid
          ) {
            uuid
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: {
            boardName: 'invalid-board',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
            climbUuid: 'test-uuid',
          },
        },
        'Board name must be kilter or tension',
      );
    });
  });

  describe('Search Climbs Validation', () => {
    it('should reject pageSize exceeding MAX_PAGE_SIZE', async () => {
      const query = `
        mutation SearchClimbs($input: ClimbSearchInput!) {
          searchClimbs(input: $input) {
            climbs {
              uuid
            }
            hasMore
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: {
            input: {
              boardName: 'kilter',
              layoutId: 1,
              sizeId: 1,
              setIds: '1',
              angle: 40,
              page: 0,
              pageSize: 200, // Exceeds MAX_PAGE_SIZE of 100
            },
          },
        },
        'Page size cannot exceed 100',
      );
    });

    it('should accept valid pageSize', async () => {
      const query = `
        mutation SearchClimbs($input: ClimbSearchInput!) {
          searchClimbs(input: $input) {
            climbs {
              uuid
            }
            hasMore
          }
        }
      `;

      // This should succeed (not throw)
      const result = await execute<{ searchClimbs: { climbs: any[]; hasMore: boolean } }>(client, {
        query,
        variables: {
          input: {
            boardName: 'kilter',
            layoutId: 1,
            sizeId: 1,
            setIds: '1',
            angle: 40,
            page: 0,
            pageSize: 50, // Valid
          },
        },
      });

      expect(result.searchClimbs).toBeDefined();
      expect(result.searchClimbs.hasMore).toBeDefined();
    });
  });

  describe('Board Name Validation (SQL Injection Prevention)', () => {
    it('should reject SQL injection attempt in board name', async () => {
      const query = `
        mutation SearchClimbs($input: ClimbSearchInput!) {
          searchClimbs(input: $input) {
            climbs {
              uuid
            }
          }
        }
      `;

      await expectError(
        client,
        {
          query,
          variables: {
            input: {
              boardName: "kilter'; DROP TABLE users; --",
              layoutId: 1,
              sizeId: 1,
              setIds: '1',
              angle: 40,
            },
          },
        },
        'Board name must be kilter, tension',
      );
    });
  });
});
