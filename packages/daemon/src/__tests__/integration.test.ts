import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createClient, Client } from 'graphql-ws';
import WebSocket from 'ws';
import { startServer } from '../server.js';
import type { ClimbQueueItem } from '@boardsesh/shared-schema';

// Test fixtures
const TEST_SESSION_ID = 'test-session-123';
const TEST_BOARD_PATH = '/kilter/1/2/3/40';
const TEST_PORT = 8082;

const createTestClimb = (uuid: string): ClimbQueueItem => ({
  uuid,
  climb: {
    uuid: `climb-${uuid}`,
    setter_username: 'test-setter',
    name: `Test Climb ${uuid}`,
    description: 'A test climb',
    frames: 'test-frames',
    angle: 40,
    ascensionist_count: 10,
    difficulty: 'V5',
    quality_average: '4.5',
    stars: 4.5,
    difficulty_error: '0.5',
    litUpHoldsMap: {
      42: { state: 'STARTING', color: '#00FF00', displayColor: '#00FF00' },
      43: { state: 'HAND', color: '#00FFFF', displayColor: '#00FFFF' },
    },
    mirrored: false,
    benchmark_difficulty: 'V5',
  },
  addedBy: 'test-user',
  tickedBy: [],
  suggested: false,
});

// Helper to execute GraphQL operations (mutations and queries)
async function execute<T>(
  client: Client,
  operation: { query: string; variables?: Record<string, unknown> }
): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    client.subscribe<T>(operation, {
      next: (data) => {
        if (data.errors) {
          console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
          reject(new Error(data.errors[0].message));
          return;
        }
        result = data.data as T;
      },
      error: (err) => {
        console.error('Subscription error:', err);
        reject(err);
      },
      complete: () => resolve(result),
    });
  });
}

// Helper to wait for a specific event from a subscription
function waitForEvent<T>(
  client: Client,
  query: string,
  predicate: (event: T) => boolean,
  timeout = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for event (${timeout}ms)`));
    }, timeout);

    const unsubscribe = client.subscribe(
      { query },
      {
        next: (data) => {
          const event = (data.data as any)?.queueUpdates || (data.data as any)?.sessionUpdates;
          if (event && predicate(event)) {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(event);
          }
        },
        error: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
        complete: () => {},
      }
    );
  });
}

// Helper to collect multiple events from a subscription
function collectEvents<T>(
  client: Client,
  query: string,
  count: number,
  timeout = 5000
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const events: T[] = [];
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout collecting events: got ${events.length}/${count}`));
    }, timeout);

    const unsubscribe = client.subscribe(
      { query },
      {
        next: (data) => {
          const event = (data.data as any)?.queueUpdates || (data.data as any)?.sessionUpdates;
          if (event) {
            events.push(event);
            if (events.length >= count) {
              clearTimeout(timeoutId);
              unsubscribe();
              resolve(events);
            }
          }
        },
        error: (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
        complete: () => {},
      }
    );
  });
}

describe('Daemon Integration Tests', () => {
  let server: ReturnType<typeof startServer>;
  const activeClients: Client[] = [];

  const createTestClient = () => {
    const client = createClient({
      url: `ws://localhost:${TEST_PORT}/graphql`,
      webSocketImpl: WebSocket,
      lazy: false,
      retryAttempts: 0,
    });
    activeClients.push(client);
    return client;
  };

  beforeAll(async () => {
    process.env.PORT = String(TEST_PORT);
    server = startServer();
    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    server.wss.close();
    server.httpServer.close();
  });

  afterEach(() => {
    // Dispose all clients created during the test
    activeClients.forEach((client) => client.dispose());
    activeClients.length = 0;
  });

  describe('Session Management', () => {
    it('should allow a client to join a session and receive initial state', async () => {
      const client = createTestClient();

      const result = await execute<{ joinSession: any }>(client, {
        query: `
          mutation JoinSession($sessionId: ID!, $boardPath: String!, $username: String) {
            joinSession(sessionId: $sessionId, boardPath: $boardPath, username: $username) {
              id
              boardPath
              isLeader
              clientId
              users { id username isLeader }
              queueState { queue { uuid } currentClimbQueueItem { uuid } }
            }
          }
        `,
        variables: {
          sessionId: TEST_SESSION_ID,
          boardPath: TEST_BOARD_PATH,
          username: 'TestUser1',
        },
      });

      expect(result.joinSession.id).toBe(TEST_SESSION_ID);
      expect(result.joinSession.boardPath).toBe(TEST_BOARD_PATH);
      expect(result.joinSession.isLeader).toBe(true);
      expect(result.joinSession.users).toHaveLength(1);
      expect(result.joinSession.users[0].username).toBe('TestUser1');
      expect(result.joinSession.queueState.queue).toEqual([]);
    });

    it('should assign first client as leader', async () => {
      const client = createTestClient();

      const result = await execute<{ joinSession: any }>(client, {
        query: `
          mutation {
            joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Leader") {
              isLeader
            }
          }
        `,
      });

      expect(result.joinSession.isLeader).toBe(true);
    });

    it('should assign second client as non-leader', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // First client joins
      const result1 = await execute<{ joinSession: any }>(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Leader") { isLeader clientId } }`,
      });

      // Second client joins
      const result2 = await execute<{ joinSession: any }>(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Follower") { isLeader clientId users { id isLeader } } }`,
      });

      expect(result1.joinSession.isLeader).toBe(true);
      expect(result2.joinSession.isLeader).toBe(false);
      expect(result2.joinSession.users).toHaveLength(2);

      // Verify one user is leader
      const leader = result2.joinSession.users.find((u: any) => u.isLeader);
      expect(leader).toBeDefined();
      expect(leader.id).toBe(result1.joinSession.clientId);
    });
  });

  describe('Queue Subscriptions', () => {
    it('should receive FullSync when subscribing to queueUpdates', async () => {
      const client = createTestClient();

      // Join session first
      await execute(client, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Subscribe and wait for initial FullSync
      const event = await waitForEvent<any>(
        client,
        `subscription { queueUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on FullSync { state { queue { uuid } } } } }`,
        (e) => e.__typename === 'FullSync'
      );

      expect(event.__typename).toBe('FullSync');
      expect(event.state.queue).toEqual([]);
    });
  });

  describe('Queue Operations', () => {
    it('should add a queue item successfully', async () => {
      const client = createTestClient();

      // Join session
      await execute(client, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Add a queue item
      const testClimb = createTestClimb('test-climb-1');
      const result = await execute<{ addQueueItem: any }>(client, {
        query: `
          mutation AddQueueItem($item: ClimbQueueItemInput!) {
            addQueueItem(item: $item) { uuid climb { name } }
          }
        `,
        variables: { item: testClimb },
      });

      expect(result.addQueueItem.uuid).toBe('test-climb-1');
      expect(result.addQueueItem.climb.name).toBe('Test Climb test-climb-1');
    });

    it('should set current climb successfully', async () => {
      const client = createTestClient();

      // Join session
      await execute(client, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Set current climb
      const testClimb = createTestClimb('current-test');
      const result = await execute<{ setCurrentClimb: any }>(client, {
        query: `
          mutation SetCurrentClimb($item: ClimbQueueItemInput) {
            setCurrentClimb(item: $item, shouldAddToQueue: true) { uuid climb { name } }
          }
        `,
        variables: { item: testClimb },
      });

      expect(result.setCurrentClimb.uuid).toBe('current-test');
    });

    it('should mirror current climb successfully', async () => {
      const client = createTestClient();

      // Join session
      await execute(client, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Set a current climb first
      const testClimb = createTestClimb('mirror-test');
      await execute(client, {
        query: `mutation SetCurrentClimb($item: ClimbQueueItemInput) { setCurrentClimb(item: $item) { uuid } }`,
        variables: { item: testClimb },
      });

      // Mirror the climb
      const result = await execute<{ mirrorCurrentClimb: any }>(client, {
        query: `mutation { mirrorCurrentClimb(mirrored: true) { uuid climb { mirrored } } }`,
      });

      expect(result.mirrorCurrentClimb.climb.mirrored).toBe(true);
    });

    it('should remove a queue item', async () => {
      const client = createTestClient();

      // Join session
      await execute(client, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Add an item first
      const testClimb = createTestClimb('to-remove');
      await execute(client, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: testClimb },
      });

      // Remove the item
      const result = await execute<{ removeQueueItem: boolean }>(client, {
        query: `mutation { removeQueueItem(uuid: "to-remove") }`,
      });

      expect(result.removeQueueItem).toBe(true);
    });

    it('should reorder queue items', async () => {
      const client = createTestClient();

      // Join session
      await execute(client, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Add multiple items
      await execute(client, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('item-0') },
      });
      await execute(client, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('item-1') },
      });
      await execute(client, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('item-2') },
      });

      // Reorder: move item-2 from index 2 to index 0
      const result = await execute<{ reorderQueueItem: boolean }>(client, {
        query: `mutation { reorderQueueItem(uuid: "item-2", oldIndex: 2, newIndex: 0) }`,
      });

      expect(result.reorderQueueItem).toBe(true);

      // Verify the order by querying the session
      const sessionResult = await execute<{ session: any }>(client, {
        query: `query { session(sessionId: "${TEST_SESSION_ID}") { queueState { queue { uuid } } } }`,
      });

      expect(sessionResult.session.queueState.queue[0].uuid).toBe('item-2');
      expect(sessionResult.session.queueState.queue[1].uuid).toBe('item-0');
      expect(sessionResult.session.queueState.queue[2].uuid).toBe('item-1');
    });
  });

  describe('Multi-Client Sync', () => {
    it('should sync queue additions across clients', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Both clients join session
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Client1") { id } }`,
      });
      await execute(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Client2") { id } }`,
      });

      // Client 2 subscribes to queue updates
      const eventPromise = collectEvents<any>(
        client2,
        `subscription { queueUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on FullSync { state { queue { uuid } } } ... on QueueItemAdded { item { uuid climb { name } } } } }`,
        2 // FullSync + QueueItemAdded
      );

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 1 adds an item
      await execute(client1, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('sync-test') },
      });

      const events = await eventPromise;

      // First event should be FullSync, second should be QueueItemAdded
      expect(events[0].__typename).toBe('FullSync');
      expect(events[1].__typename).toBe('QueueItemAdded');
      expect(events[1].item.uuid).toBe('sync-test');
    });

    it('should sync current climb changes across clients', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Both clients join session
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });
      await execute(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Client 2 subscribes to queue updates
      const eventPromise = collectEvents<any>(
        client2,
        `subscription { queueUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on FullSync { state { currentClimbQueueItem { uuid } } } ... on CurrentClimbChanged { item { uuid } } } }`,
        2 // FullSync + CurrentClimbChanged
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 1 sets current climb
      await execute(client1, {
        query: `mutation SetCurrentClimb($item: ClimbQueueItemInput) { setCurrentClimb(item: $item) { uuid } }`,
        variables: { item: createTestClimb('current-sync') },
      });

      const events = await eventPromise;

      expect(events[1].__typename).toBe('CurrentClimbChanged');
      expect(events[1].item.uuid).toBe('current-sync');
    });

    it('should sync queue reordering across clients', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Both clients join session
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });
      await execute(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });

      // Client 1 adds items
      await execute(client1, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('reorder-0') },
      });
      await execute(client1, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('reorder-1') },
      });

      // Client 2 subscribes
      const eventPromise = waitForEvent<any>(
        client2,
        `subscription { queueUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on FullSync { state { queue { uuid } } } ... on QueueReordered { uuid oldIndex newIndex } } }`,
        (e) => e.__typename === 'QueueReordered'
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 1 reorders
      await execute(client1, {
        query: `mutation { reorderQueueItem(uuid: "reorder-1", oldIndex: 1, newIndex: 0) }`,
      });

      const event = await eventPromise;

      expect(event.__typename).toBe('QueueReordered');
      expect(event.uuid).toBe('reorder-1');
      expect(event.oldIndex).toBe(1);
      expect(event.newIndex).toBe(0);
    });
  });

  describe('Leader Election', () => {
    it('should elect new leader when current leader disconnects', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Client 1 joins first (becomes leader)
      const result1 = await execute<{ joinSession: any }>(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Leader") { isLeader clientId } }`,
      });
      expect(result1.joinSession.isLeader).toBe(true);

      // Client 2 joins second (not leader)
      const result2 = await execute<{ joinSession: any }>(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Follower") { isLeader clientId } }`,
      });
      expect(result2.joinSession.isLeader).toBe(false);

      // Client 2 subscribes to session updates
      const eventPromise = waitForEvent<any>(
        client2,
        `subscription { sessionUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on LeaderChanged { leaderId } ... on UserLeft { userId } } }`,
        (e) => e.__typename === 'LeaderChanged'
      );

      // Client 1 disconnects
      client1.dispose();
      // Remove from activeClients so afterEach doesn't try to dispose again
      const idx = activeClients.indexOf(client1);
      if (idx > -1) activeClients.splice(idx, 1);

      const event = await eventPromise;

      expect(event.__typename).toBe('LeaderChanged');
      expect(event.leaderId).toBe(result2.joinSession.clientId);
    });

    it('should maintain leader when non-leader disconnects', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Client 1 joins first (becomes leader)
      const result1 = await execute<{ joinSession: any }>(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Leader") { isLeader clientId } }`,
      });
      expect(result1.joinSession.isLeader).toBe(true);

      // Client 2 joins second (not leader)
      await execute(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Follower") { isLeader } }`,
      });

      // Client 1 subscribes to session updates to detect UserLeft
      const eventPromise = waitForEvent<any>(
        client1,
        `subscription { sessionUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on UserLeft { userId } ... on LeaderChanged { leaderId } } }`,
        (e) => e.__typename === 'UserLeft'
      );

      // Client 2 disconnects
      client2.dispose();
      const idx = activeClients.indexOf(client2);
      if (idx > -1) activeClients.splice(idx, 1);

      const event = await eventPromise;

      // Should only get UserLeft, not LeaderChanged (leader is still client1)
      expect(event.__typename).toBe('UserLeft');
    });
  });

  describe('Session Events', () => {
    it('should emit UserJoined when client joins', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Client 1 joins and subscribes
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "First") { id } }`,
      });

      const eventPromise = waitForEvent<any>(
        client1,
        `subscription { sessionUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on UserJoined { user { id username } } } }`,
        (e) => e.__typename === 'UserJoined'
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 2 joins
      await execute(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Second") { id } }`,
      });

      const event = await eventPromise;

      expect(event.__typename).toBe('UserJoined');
      expect(event.user.username).toBe('Second');
    });

    it('should emit UserLeft when client disconnects', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Both clients join
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "First") { id } }`,
      });
      const result2 = await execute<{ joinSession: any }>(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Second") { clientId } }`,
      });

      // Client 1 subscribes to session updates
      const eventPromise = waitForEvent<any>(
        client1,
        `subscription { sessionUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on UserLeft { userId } } }`,
        (e) => e.__typename === 'UserLeft'
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 2 disconnects
      client2.dispose();
      const idx = activeClients.indexOf(client2);
      if (idx > -1) activeClients.splice(idx, 1);

      const event = await eventPromise;

      expect(event.__typename).toBe('UserLeft');
      expect(event.userId).toBe(result2.joinSession.clientId);
    });

    it('should emit LeaderChanged when leader leaves', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Client 1 joins first (becomes leader)
      const result1 = await execute<{ joinSession: any }>(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Leader") { clientId } }`,
      });

      // Client 2 joins second
      const result2 = await execute<{ joinSession: any }>(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "Follower") { clientId } }`,
      });

      // Client 2 subscribes to session updates
      const eventPromise = collectEvents<any>(
        client2,
        `subscription { sessionUpdates(sessionId: "${TEST_SESSION_ID}") { __typename ... on UserLeft { userId } ... on LeaderChanged { leaderId } } }`,
        2 // UserLeft + LeaderChanged
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client 1 disconnects (leader leaves)
      client1.dispose();
      const idx = activeClients.indexOf(client1);
      if (idx > -1) activeClients.splice(idx, 1);

      const events = await eventPromise;

      // Should get both UserLeft and LeaderChanged
      const userLeftEvent = events.find((e) => e.__typename === 'UserLeft');
      const leaderChangedEvent = events.find((e) => e.__typename === 'LeaderChanged');

      expect(userLeftEvent).toBeDefined();
      expect(userLeftEvent.userId).toBe(result1.joinSession.clientId);
      expect(leaderChangedEvent).toBeDefined();
      expect(leaderChangedEvent.leaderId).toBe(result2.joinSession.clientId);
    });
  });

  describe('Disconnect Handling', () => {
    it('should cleanup session when all clients disconnect', async () => {
      const client1 = createTestClient();

      // Join and add some state
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { id } }`,
      });
      await execute(client1, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('cleanup-test') },
      });

      // Disconnect
      client1.dispose();
      const idx = activeClients.indexOf(client1);
      if (idx > -1) activeClients.splice(idx, 1);

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      // New client joins same session - should get empty state (session was cleaned up)
      const client2 = createTestClient();
      const result = await execute<{ joinSession: any }>(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}") { isLeader users { id } queueState { queue { uuid } } } }`,
      });

      // New client should be leader (first in fresh session)
      expect(result.joinSession.isLeader).toBe(true);
      // Should be only user
      expect(result.joinSession.users).toHaveLength(1);
    });

    it('should continue session when one of multiple clients disconnects', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();

      // Both clients join
      await execute(client1, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "User1") { id } }`,
      });
      await execute(client2, {
        query: `mutation { joinSession(sessionId: "${TEST_SESSION_ID}", boardPath: "${TEST_BOARD_PATH}", username: "User2") { id } }`,
      });

      // Add queue item
      await execute(client1, {
        query: `mutation AddQueueItem($item: ClimbQueueItemInput!) { addQueueItem(item: $item) { uuid } }`,
        variables: { item: createTestClimb('persist-test') },
      });

      // Client 1 disconnects
      client1.dispose();
      const idx = activeClients.indexOf(client1);
      if (idx > -1) activeClients.splice(idx, 1);

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Client 2 should still see the queue item (query session state)
      const result = await execute<{ session: any }>(client2, {
        query: `query { session(sessionId: "${TEST_SESSION_ID}") { queueState { queue { uuid } } users { id } } }`,
      });

      expect(result.session.queueState.queue).toHaveLength(1);
      expect(result.session.queueState.queue[0].uuid).toBe('persist-test');
      expect(result.session.users).toHaveLength(1); // Only client2 remains
    });
  });
});
