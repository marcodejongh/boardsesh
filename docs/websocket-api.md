# WebSocket API Reference

This document provides a complete API reference for the Boardsesh WebSocket protocol. The WebSocket API enables real-time collaboration in party mode sessions, where multiple climbers can share a synchronized queue of climbs.

> **Note**: For internal architecture details, session lifecycle, multi-instance support, and failure recovery mechanisms, see [websocket-implementation.md](./websocket-implementation.md).

## Table of Contents

1. [Connection](#connection)
2. [Authentication](#authentication)
3. [GraphQL Protocol](#graphql-protocol)
4. [Session Operations](#session-operations)
5. [Queue Operations](#queue-operations)
6. [Subscriptions](#subscriptions)
7. [Event Types](#event-types)
8. [Error Handling](#error-handling)
9. [Rate Limits](#rate-limits)
10. [Client Implementation Guide](#client-implementation-guide)
11. [Examples](#examples)

---

## Connection

### Endpoint

```
wss://your-backend-host/graphql
```

The WebSocket endpoint uses the `graphql-ws` protocol for GraphQL over WebSocket communication.

### Protocol

The API uses the [`graphql-ws`](https://github.com/enisdenjo/graphql-ws) protocol (not the legacy `subscriptions-transport-ws`). Ensure your client library supports this protocol.

**Subprotocol**: `graphql-transport-ws`

### Connection Lifecycle

```
Client                                Server
   |                                     |
   |-- WebSocket Connect --------------->|
   |<-- Connection Accepted -------------|
   |                                     |
   |-- ConnectionInit {authToken} ------>|
   |<-- ConnectionAck -------------------|
   |                                     |
   |-- Subscribe/Execute --------------->|
   |<-- Data / Complete -----------------|
```

### Origin Validation

The server validates WebSocket connection origins. Allowed origins include:

- Production: `https://boardsesh.com`
- Vercel preview deployments: `*.vercel.app`
- Local development: `http://localhost:*`
- Native apps: No origin header (allowed)

---

## Authentication

Authentication is optional but required for certain operations. The API uses NextAuth JWT tokens for authentication.

### Passing Authentication

Include the auth token in the `connectionParams` during `ConnectionInit`:

```typescript
const client = createClient({
  url: 'wss://your-backend/graphql',
  connectionParams: {
    authToken: 'your-nextauth-jwt-token'
  }
});
```

Alternatively, pass the token as a URL query parameter:

```
wss://your-backend/graphql?token=your-nextauth-jwt-token
```

### Authentication Context

After successful authentication, the server includes user context in all operations:

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Authenticated user's ID |
| `isAuthenticated` | `boolean` | Whether the connection is authenticated |
| `connectionId` | `string` | Unique connection identifier |

### Anonymous Connections

Anonymous (unauthenticated) connections are allowed and can:
- Join existing sessions
- Participate in queue operations
- Subscribe to session and queue updates

Anonymous users are assigned a temporary `connectionId` as their identifier.

---

## GraphQL Protocol

### Operation Types

| Type | Description |
|------|-------------|
| **Query** | Read operations (fetch session, replay events) |
| **Mutation** | Write operations (join session, modify queue) |
| **Subscription** | Real-time event streams |

### Request Format

All operations use the standard GraphQL-over-WebSocket message format:

```json
{
  "id": "unique-operation-id",
  "type": "subscribe",
  "payload": {
    "query": "mutation JoinSession(...) { ... }",
    "variables": { "sessionId": "abc123", ... }
  }
}
```

### Response Format

Successful responses:

```json
{
  "id": "unique-operation-id",
  "type": "next",
  "payload": {
    "data": { ... }
  }
}
```

Error responses:

```json
{
  "id": "unique-operation-id",
  "type": "error",
  "payload": [
    { "message": "Error description", "extensions": { "code": "ERROR_CODE" } }
  ]
}
```

---

## Session Operations

### Join Session

Joins an existing session or creates a new one. This is the primary entry point for party mode.

```graphql
mutation JoinSession(
  $sessionId: ID!
  $boardPath: String!
  $username: String
  $avatarUrl: String
  $initialQueue: [ClimbQueueItemInput!]
  $initialCurrentClimb: ClimbQueueItemInput
  $sessionName: String
) {
  joinSession(
    sessionId: $sessionId
    boardPath: $boardPath
    username: $username
    avatarUrl: $avatarUrl
    initialQueue: $initialQueue
    initialCurrentClimb: $initialCurrentClimb
    sessionName: $sessionName
  ) {
    id
    name
    boardPath
    clientId
    isLeader
    users {
      id
      username
      isLeader
      avatarUrl
    }
    queueState {
      sequence
      stateHash
      queue { ... }
      currentClimbQueueItem { ... }
    }
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | `ID!` | Yes | Session identifier (generate UUID for new sessions) |
| `boardPath` | `String!` | Yes | Board configuration path (e.g., `/kilter/1/1/1`) |
| `username` | `String` | No | Display name for the user |
| `avatarUrl` | `String` | No | URL to user's avatar image |
| `initialQueue` | `[ClimbQueueItemInput!]` | No | Initial queue items (new sessions only) |
| `initialCurrentClimb` | `ClimbQueueItemInput` | No | Initial current climb (new sessions only) |
| `sessionName` | `String` | No | Display name for the session (new sessions only) |

#### Response

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ID!` | Session ID |
| `name` | `String` | Session display name |
| `boardPath` | `String!` | Board configuration path |
| `clientId` | `ID!` | This client's unique ID in the session |
| `isLeader` | `Boolean!` | Whether this client is the session leader |
| `users` | `[SessionUser!]!` | All users in the session |
| `queueState` | `QueueState!` | Current queue state |

#### Behavior

- **Existing session**: Joins and returns current state. `initialQueue`, `initialCurrentClimb`, and `sessionName` are ignored.
- **New session**: Creates session with optional initial queue.
- **Session restoration**: If a session exists in Redis/PostgreSQL but not in memory, it's restored before joining.

---

### Create Session

Creates a new discoverable session with GPS location.

```graphql
mutation CreateSession($input: CreateSessionInput!) {
  createSession(input: $input) {
    id
    name
    boardPath
    clientId
    isLeader
    users { ... }
    queueState { ... }
  }
}
```

#### Input Type

```graphql
input CreateSessionInput {
  boardPath: String!
  latitude: Float!
  longitude: Float!
  name: String
  discoverable: Boolean!
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `boardPath` | `String!` | Yes | Board configuration path |
| `latitude` | `Float!` | Yes | GPS latitude |
| `longitude` | `Float!` | Yes | GPS longitude |
| `name` | `String` | No | Session display name |
| `discoverable` | `Boolean!` | Yes | Whether session appears in nearby search |

---

### Leave Session

Leaves the current session.

```graphql
mutation LeaveSession {
  leaveSession
}
```

Returns `true` on success.

---

### End Session

Ends a session (leader only). All connected clients receive a `SessionEnded` event.

```graphql
mutation EndSession($sessionId: ID!) {
  endSession(sessionId: $sessionId)
}
```

Returns `true` on success.

---

### Update Username

Updates the current user's display name and avatar in the session.

```graphql
mutation UpdateUsername($username: String!, $avatarUrl: String) {
  updateUsername(username: $username, avatarUrl: $avatarUrl)
}
```

Returns `true` on success.

---

### Get Session

Queries the current state of a session.

```graphql
query GetSession($sessionId: ID!) {
  session(sessionId: $sessionId) {
    id
    name
    boardPath
    users { ... }
    queueState { ... }
    isLeader
    clientId
  }
}
```

Returns `null` if the session doesn't exist.

---

### Find Nearby Sessions

Finds discoverable sessions near a GPS location.

```graphql
query NearbySessions(
  $latitude: Float!
  $longitude: Float!
  $radiusMeters: Float
) {
  nearbySessions(
    latitude: $latitude
    longitude: $longitude
    radiusMeters: $radiusMeters
  ) {
    id
    name
    boardPath
    latitude
    longitude
    createdAt
    participantCount
    distance
    isActive
  }
}
```

---

## Queue Operations

All queue operations require an active session (must call `joinSession` first).

### Add Queue Item

Adds a climb to the queue.

```graphql
mutation AddQueueItem($item: ClimbQueueItemInput!, $position: Int) {
  addQueueItem(item: $item, position: $position) {
    uuid
    climb { ... }
    addedBy
    addedByUser { ... }
    tickedBy
    suggested
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item` | `ClimbQueueItemInput!` | Yes | The climb queue item to add |
| `position` | `Int` | No | Insert position (0-indexed). Defaults to end of queue. |

---

### Remove Queue Item

Removes a climb from the queue.

```graphql
mutation RemoveQueueItem($uuid: ID!) {
  removeQueueItem(uuid: $uuid)
}
```

Returns `true` on success.

---

### Reorder Queue Item

Moves a climb to a new position in the queue.

```graphql
mutation ReorderQueueItem($uuid: ID!, $oldIndex: Int!, $newIndex: Int!) {
  reorderQueueItem(uuid: $uuid, oldIndex: $oldIndex, newIndex: $newIndex)
}
```

Returns `true` on success.

---

### Set Current Climb

Sets the currently active climb (the climb being displayed/climbed).

```graphql
mutation SetCurrentClimb(
  $item: ClimbQueueItemInput
  $shouldAddToQueue: Boolean
  $correlationId: ID
) {
  setCurrentClimb(
    item: $item
    shouldAddToQueue: $shouldAddToQueue
    correlationId: $correlationId
  ) {
    uuid
    climb { ... }
    addedBy
    addedByUser { ... }
    tickedBy
    suggested
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item` | `ClimbQueueItemInput` | No | The climb to set as current. Pass `null` to clear. |
| `shouldAddToQueue` | `Boolean` | No | If `true`, also adds the climb to the queue |
| `correlationId` | `ID` | No | Client-generated ID for optimistic update correlation |

#### Optimistic Updates

The `correlationId` enables optimistic UI updates:

1. Client generates a unique `correlationId`
2. Client applies the change locally immediately
3. Client sends mutation with `correlationId`
4. Server echoes `correlationId` in the `CurrentClimbChanged` event
5. Client ignores the event if `correlationId` matches (already applied)

---

### Mirror Current Climb

Toggles the mirror state of the current climb.

```graphql
mutation MirrorCurrentClimb($mirrored: Boolean!) {
  mirrorCurrentClimb(mirrored: $mirrored) {
    uuid
    climb { ... }
  }
}
```

---

### Replace Queue Item

Replaces an existing queue item with new data.

```graphql
mutation ReplaceQueueItem($uuid: ID!, $item: ClimbQueueItemInput!) {
  replaceQueueItem(uuid: $uuid, item: $item) {
    uuid
    climb { ... }
  }
}
```

---

### Set Queue (Bulk)

Replaces the entire queue with new items. Use for bulk operations.

```graphql
mutation SetQueue(
  $queue: [ClimbQueueItemInput!]!
  $currentClimbQueueItem: ClimbQueueItemInput
) {
  setQueue(queue: $queue, currentClimbQueueItem: $currentClimbQueueItem) {
    sequence
    stateHash
    queue { ... }
    currentClimbQueueItem { ... }
  }
}
```

---

### Events Replay (Delta Sync)

Retrieves buffered events since a sequence number for reconnection recovery.

```graphql
query EventsReplay($sessionId: ID!, $sinceSequence: Int!) {
  eventsReplay(sessionId: $sessionId, sinceSequence: $sinceSequence) {
    currentSequence
    events {
      __typename
      ... on FullSync { sequence, state { ... } }
      ... on QueueItemAdded { sequence, item { ... }, position }
      ... on QueueItemRemoved { sequence, uuid }
      ... on QueueReordered { sequence, uuid, oldIndex, newIndex }
      ... on CurrentClimbChanged { sequence, item { ... }, clientId, correlationId }
      ... on ClimbMirrored { sequence, mirrored }
    }
  }
}
```

---

## Subscriptions

### Queue Updates

Subscribes to all queue-related events in a session.

```graphql
subscription QueueUpdates($sessionId: ID!) {
  queueUpdates(sessionId: $sessionId) {
    __typename
    ... on FullSync {
      sequence
      state {
        sequence
        stateHash
        queue { uuid, climb { ... }, addedBy, addedByUser { ... }, tickedBy, suggested }
        currentClimbQueueItem { ... }
      }
    }
    ... on QueueItemAdded {
      sequence
      addedItem: item { uuid, climb { ... }, addedBy, addedByUser { ... }, tickedBy, suggested }
      position
    }
    ... on QueueItemRemoved {
      sequence
      uuid
    }
    ... on QueueReordered {
      sequence
      uuid
      oldIndex
      newIndex
    }
    ... on CurrentClimbChanged {
      sequence
      currentItem: item { uuid, climb { ... }, addedBy, addedByUser { ... }, tickedBy, suggested }
      clientId
      correlationId
    }
    ... on ClimbMirrored {
      sequence
      mirrored
    }
  }
}
```

> **Note**: Field aliases (`addedItem: item`, `currentItem: item`) are used to avoid GraphQL union type conflicts where the same field name has different nullability requirements.

#### Initial Event

Upon subscription, the server immediately sends a `FullSync` event with the current state. This ensures clients have the complete queue state before receiving incremental updates.

---

### Session Updates

Subscribes to session-level events (user joins/leaves, leader changes).

```graphql
subscription SessionUpdates($sessionId: ID!) {
  sessionUpdates(sessionId: $sessionId) {
    __typename
    ... on UserJoined {
      user {
        id
        username
        isLeader
        avatarUrl
      }
    }
    ... on UserLeft {
      userId
    }
    ... on LeaderChanged {
      leaderId
    }
    ... on SessionEnded {
      reason
      newPath
    }
  }
}
```

---

## Event Types

### Queue Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `FullSync` | Complete state snapshot | `sequence`, `state` |
| `QueueItemAdded` | Item added to queue | `sequence`, `item`, `position` |
| `QueueItemRemoved` | Item removed from queue | `sequence`, `uuid` |
| `QueueReordered` | Item position changed | `sequence`, `uuid`, `oldIndex`, `newIndex` |
| `CurrentClimbChanged` | Active climb changed | `sequence`, `item`, `clientId`, `correlationId` |
| `ClimbMirrored` | Mirror state toggled | `sequence`, `mirrored` |

### Session Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `UserJoined` | User joined session | `user` |
| `UserLeft` | User left session | `userId` |
| `LeaderChanged` | New leader elected | `leaderId` |
| `SessionEnded` | Session was ended | `reason`, `newPath` |

### Sequence Numbers

Every queue event includes a `sequence` number that:

- Increments monotonically for each event
- Enables gap detection (missing events)
- Allows delta sync on reconnection

Clients should track the last received sequence and request delta sync if gaps are detected.

---

## Data Types

### ClimbQueueItem

```graphql
type ClimbQueueItem {
  uuid: ID!              # Unique identifier for this queue entry
  climb: Climb!          # The climb data
  addedBy: String        # User ID who added this item
  addedByUser: QueueItemUser  # User details who added this item
  tickedBy: [String!]    # User IDs who have completed this climb
  suggested: Boolean     # Whether this was a suggestion
}
```

### Climb

```graphql
type Climb {
  uuid: ID!
  layoutId: Int
  setter_username: String!
  name: String!
  description: String!
  frames: String!        # Hold positions data
  angle: Int!            # Board angle in degrees
  ascensionist_count: Int!
  difficulty: String!
  quality_average: String!
  stars: Float!
  difficulty_error: String!
  litUpHoldsMap: JSON!   # Map of hold ID to hold state
  mirrored: Boolean
  benchmark_difficulty: String
  userAscents: Int       # User's ascent count (if authenticated)
  userAttempts: Int      # User's attempt count (if authenticated)
}
```

### ClimbQueueItemInput

```graphql
input ClimbQueueItemInput {
  uuid: ID!
  climb: ClimbInput!
  addedBy: String
  addedByUser: QueueItemUserInput
  tickedBy: [String!]
  suggested: Boolean
}
```

### QueueState

```graphql
type QueueState {
  sequence: Int!                    # Current event sequence number
  stateHash: String!                # SHA256 hash for drift detection
  queue: [ClimbQueueItem!]!         # Ordered list of queue items
  currentClimbQueueItem: ClimbQueueItem  # Currently active climb (nullable)
}
```

### SessionUser

```graphql
type SessionUser {
  id: ID!
  username: String!
  isLeader: Boolean!
  avatarUrl: String
}
```

---

## Error Handling

### Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `NOT_IN_SESSION` | Operation requires active session | Call `joinSession` first |
| `SESSION_NOT_FOUND` | Session doesn't exist | Create new session |
| `NOT_AUTHORIZED` | Insufficient permissions | Check authentication |
| `RATE_LIMITED` | Too many requests | Implement backoff |
| `VERSION_CONFLICT` | Optimistic lock failed | Retry operation |
| `VALIDATION_ERROR` | Invalid input data | Check request format |

### Error Response Format

```json
{
  "errors": [
    {
      "message": "Human-readable error message",
      "extensions": {
        "code": "ERROR_CODE",
        "details": { ... }
      }
    }
  ]
}
```

### Handling Connection Errors

```typescript
client.on('closed', (event) => {
  if (event.code !== 1000) {
    // Abnormal close - implement reconnection
    scheduleReconnect();
  }
});

client.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

---

## Rate Limits

Rate limits are enforced per connection using a sliding window algorithm.

| Operation | Limit | Window |
|-----------|-------|--------|
| `joinSession` | 10 requests | 1 minute |
| `createSession` | 5 requests | 1 minute |
| `setQueue` (bulk) | 30 requests | 1 minute |
| All other mutations | 60 requests | 1 minute |

When rate limited, the server returns an error with code `RATE_LIMITED`. Implement exponential backoff before retrying.

---

## Client Implementation Guide

### Recommended Configuration

```typescript
const client = createClient({
  url: 'wss://your-backend/graphql',
  connectionParams: {
    authToken: getAuthToken() // Optional
  },
  retryAttempts: 10,
  shouldRetry: () => true,
  retryWait: async (retries) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(1000 * Math.pow(2, retries), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
  },
  keepAlive: 10000, // 10 second ping interval
});
```

### Connection Flow

1. **Connect** to WebSocket endpoint
2. **Send ConnectionInit** with optional auth token
3. **Wait for ConnectionAck**
4. **Subscribe to queueUpdates** (BEFORE joining - prevents race conditions)
5. **Call joinSession mutation**
6. **Subscribe to sessionUpdates**
7. **Process FullSync event** to initialize local state
8. **Apply incremental events** as they arrive

### Subscription Setup Order

**Critical**: Subscribe to `queueUpdates` BEFORE calling `joinSession` to prevent missing events:

```typescript
// 1. First, set up subscription
const unsubscribe = subscribe(QUEUE_UPDATES, { sessionId }, {
  next: handleQueueEvent,
  error: handleError,
  complete: handleComplete
});

// 2. Then join the session
const session = await execute(JOIN_SESSION, { sessionId, boardPath });

// 3. Process the FullSync from subscription (arrives after join)
```

### State Synchronization

#### Handling FullSync

```typescript
function handleFullSync(event: FullSync) {
  // Replace local state entirely
  localState.queue = event.state.queue;
  localState.currentClimb = event.state.currentClimbQueueItem;
  localState.sequence = event.state.sequence;
  localState.stateHash = event.state.stateHash;
}
```

#### Handling Incremental Events

```typescript
function handleQueueEvent(event: QueueEvent) {
  // Check for sequence gaps
  if (event.sequence !== localState.sequence + 1) {
    console.warn(`Sequence gap: expected ${localState.sequence + 1}, got ${event.sequence}`);
    // Events are still applied - hash verification will catch drift
  }

  switch (event.__typename) {
    case 'QueueItemAdded':
      // Insert at position or append
      const position = event.position ?? localState.queue.length;
      localState.queue.splice(position, 0, event.addedItem);
      break;
    case 'QueueItemRemoved':
      localState.queue = localState.queue.filter(item => item.uuid !== event.uuid);
      break;
    case 'QueueReordered':
      const [item] = localState.queue.splice(event.oldIndex, 1);
      localState.queue.splice(event.newIndex, 0, item);
      break;
    case 'CurrentClimbChanged':
      // Skip if this is our own optimistic update
      if (event.correlationId && pendingUpdates.has(event.correlationId)) {
        pendingUpdates.delete(event.correlationId);
        break;
      }
      localState.currentClimb = event.currentItem;
      break;
    case 'ClimbMirrored':
      if (localState.currentClimb) {
        localState.currentClimb.climb.mirrored = event.mirrored;
      }
      break;
  }

  localState.sequence = event.sequence;
}
```

### Reconnection Handling

```typescript
let hasConnectedBefore = false;

client.on('connected', () => {
  if (hasConnectedBefore) {
    // Reconnection - re-establish session
    rejoinSession();
  }
  hasConnectedBefore = true;
});

async function rejoinSession() {
  // Re-subscribe to events
  subscribeToQueueUpdates();

  // Attempt delta sync first
  const { events, currentSequence } = await eventsReplay(sessionId, localState.sequence);

  if (events.length > 0 && events[0].__typename !== 'FullSync') {
    // Apply delta events
    events.forEach(handleQueueEvent);
  } else {
    // Full resync needed
    await joinSession();
    // FullSync will arrive via subscription
  }
}
```

### State Drift Detection

Periodically verify local state matches server state using the state hash:

```typescript
function computeLocalHash(queue: ClimbQueueItem[], currentClimb: ClimbQueueItem | null): string {
  // Filter out any corrupted items
  const cleanQueue = queue.filter(item => item != null);

  const data = JSON.stringify({
    queue: cleanQueue.map(item => item.uuid),
    currentClimb: currentClimb?.uuid ?? null
  });

  return sha256(data);
}

// Check every 60 seconds
setInterval(() => {
  const localHash = computeLocalHash(localState.queue, localState.currentClimb);
  if (localHash !== localState.stateHash) {
    console.error('State drift detected - triggering resync');
    triggerResync();
  }
}, 60000);
```

---

## Examples

### Complete Session Flow

```typescript
import { createClient } from 'graphql-ws';

// 1. Create client
const client = createClient({
  url: 'wss://api.boardsesh.com/graphql',
  connectionParams: { authToken: myAuthToken }
});

// 2. Helper functions
function execute<T>(query: string, variables?: object): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    client.subscribe({ query, variables }, {
      next: (data) => { result = data.data as T; },
      error: reject,
      complete: () => resolve(result)
    });
  });
}

function subscribe(query: string, variables: object, handlers: any) {
  return client.subscribe({ query, variables }, handlers);
}

// 3. Join session
const sessionId = 'my-session-id';
const boardPath = '/kilter/1/1/1';

// Subscribe first (prevents race conditions)
const unsubQueue = subscribe(
  `subscription QueueUpdates($sessionId: ID!) {
    queueUpdates(sessionId: $sessionId) {
      __typename
      ... on FullSync { sequence, state { queue { uuid } } }
      ... on QueueItemAdded { sequence, addedItem: item { uuid } }
      ... on QueueItemRemoved { sequence, uuid }
    }
  }`,
  { sessionId },
  {
    next: (data) => console.log('Queue event:', data),
    error: (err) => console.error('Subscription error:', err),
    complete: () => console.log('Subscription closed')
  }
);

// Then join
const session = await execute(`
  mutation JoinSession($sessionId: ID!, $boardPath: String!) {
    joinSession(sessionId: $sessionId, boardPath: $boardPath) {
      id
      clientId
      isLeader
      queueState { sequence, queue { uuid, climb { name } } }
    }
  }
`, { sessionId, boardPath });

console.log('Joined session:', session);

// 4. Add a climb to queue
const newItem = {
  uuid: crypto.randomUUID(),
  climb: {
    uuid: 'climb-uuid-123',
    name: 'Cool Climb',
    setter_username: 'setter1',
    description: 'A fun climb',
    frames: 'p1r2p3r4',
    angle: 40,
    ascensionist_count: 100,
    difficulty: 'V5',
    quality_average: '4.5',
    stars: 4.5,
    difficulty_error: '0.5',
    litUpHoldsMap: {}
  }
};

await execute(`
  mutation AddQueueItem($item: ClimbQueueItemInput!) {
    addQueueItem(item: $item) { uuid }
  }
`, { item: newItem });

// 5. Clean up
unsubQueue();
await execute(`mutation { leaveSession }`);
```

### Optimistic Update Example

```typescript
const pendingUpdates = new Map<string, ClimbQueueItem>();

async function setCurrentClimb(item: ClimbQueueItem) {
  // Generate correlation ID
  const correlationId = crypto.randomUUID();

  // Apply optimistic update
  pendingUpdates.set(correlationId, item);
  updateLocalState({ currentClimb: item });

  try {
    await execute(`
      mutation SetCurrentClimb($item: ClimbQueueItemInput, $correlationId: ID) {
        setCurrentClimb(item: $item, correlationId: $correlationId) { uuid }
      }
    `, { item, correlationId });
  } catch (error) {
    // Rollback on failure
    pendingUpdates.delete(correlationId);
    triggerResync();
  }
}

// In subscription handler
function handleCurrentClimbChanged(event: CurrentClimbChanged) {
  if (event.correlationId && pendingUpdates.has(event.correlationId)) {
    // This is our own update - already applied
    pendingUpdates.delete(event.correlationId);
    return;
  }
  // Someone else's update - apply it
  updateLocalState({ currentClimb: event.currentItem });
}
```

---

## Changelog

### Version 1.0

- Initial WebSocket API release
- GraphQL-over-WebSocket using `graphql-ws` protocol
- Session management (join, leave, end)
- Queue operations (add, remove, reorder)
- Real-time subscriptions for queue and session events
- Optimistic update support with correlation IDs
- Delta sync via events replay
- State drift detection via hash verification
