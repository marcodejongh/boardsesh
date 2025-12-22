# GraphQL-WS Migration TODO

This document tracks the remaining work to migrate from PeerJS/custom WebSocket to graphql-ws.

## Completed

- [x] **Phase 0: Monorepo Restructure**
  - Created NPM workspaces structure
  - Moved Next.js app to `packages/web/`
  - Moved daemon to `packages/daemon/`
  - Created `packages/shared-schema/` with initial types/schema/operations
  - Added `graphql` and `graphql-ws` dependencies to both packages
  - Commit: `66850345` on branch `refactor/monorepo-graphql-ws`

- [x] **Phase 1: Complete Shared Schema Package**
  - Verified types match between packages
  - Fixed operation naming bugs
  - Built shared-schema package

- [x] **Phase 2: Daemon GraphQL Implementation**
  - Created `packages/daemon/src/graphql/resolvers.ts` with all mutations/subscriptions
  - Created `packages/daemon/src/graphql/context.ts` for connection context
  - Created `packages/daemon/src/pubsub/index.ts` for subscription events
  - Updated `packages/daemon/src/server.ts` to use graphql-ws
  - Refactored `packages/daemon/src/services/room-manager.ts` to use connectionId
  - Deleted old handlers, broadcast service, and message types
  - Added `@graphql-tools/schema` and `graphql-type-json` dependencies

## Remaining Work

### Phase 3: Client GraphQL Implementation

Create new GraphQL-based connection in the web app:

**Files to create:**
- [ ] `packages/web/app/components/graphql-queue/graphql-client.ts` - graphql-ws client setup
- [ ] `packages/web/app/components/graphql-queue/use-queue-session.ts` - Main hook with subscriptions + mutations
- [ ] `packages/web/app/components/graphql-queue/QueueContext.tsx` - New QueueProvider using the hook

**The hook should:**
- Connect to daemon via graphql-ws
- Call `joinSession` mutation on mount
- Subscribe to `queueUpdates` and `sessionUpdates`
- Expose mutation functions matching current QueueContextType interface
- Handle reconnection automatically (graphql-ws handles this)

### Phase 4: Integration & Switchover

- [ ] Update `packages/web/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/layout.tsx`:
  - Remove `ConnectionProviderWrapper`
  - Use new GraphQL-based `QueueProvider`
  - Keep `ConnectionSettingsProvider` for daemon URL config

- [ ] Update `packages/web/app/components/party-manager/party-context.tsx`:
  - Get users from queue session instead of peer context

### Phase 5: Cleanup

**Files to delete from `packages/web/app/components/connection-manager/`:**
- [ ] `peer-context.tsx`
- [ ] `daemon-context.tsx`
- [ ] `websocket-context.tsx`
- [ ] `use-connection.ts`
- [ ] `connection-provider-wrapper.tsx`
- [ ] `hybrid-connection-context.tsx`
- [ ] `reducer.tsx`
- [ ] `types.ts`
- [ ] `constants.ts`
- [ ] `__tests__/` (all test files)

**Keep:**
- `connection-settings-context.tsx` (for daemonUrl storage)

**Dependencies to remove from `packages/web/package.json`:**
- [ ] `peerjs`

---

## Reference: User-Provided Code Snippets

The user provided starter code snippets in the initial request. Key patterns to follow:

### Client-side patterns (from user's snippets):

```typescript
// graphql-client.ts pattern
import { createClient, Client } from 'graphql-ws';

export function getGraphQLClient(sessionId: string, userId: string) {
  return createClient({
    url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!,
    connectionParams: { sessionId, userId },
    retryAttempts: 5,
    shouldRetry: () => true,
  });
}

// Execute helper for mutations
export function execute<T>(client: Client, operation: { query: string; variables?: Record<string, unknown> }): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    client.subscribe<T>(operation, {
      next: (data) => { result = data.data as T; },
      error: reject,
      complete: () => resolve(result),
    });
  });
}
```

### Server-side patterns (from user's snippets):

```typescript
// PubSub pattern
class PubSub {
  private subscribers: Map<string, Set<Subscriber>> = new Map();
  subscribe(sessionId: string, callback: Subscriber): () => void { ... }
  publish(sessionId: string, event: QueueEvent): void { ... }
}

// Subscription handler pattern
export function createSubscription(sessionId: string, emit: (event: QueueEvent) => void): () => void {
  // Send initial state
  emit({ __typename: 'FullSync', state: { queue, currentClimbQueueItem } });
  // Subscribe to future updates
  return pubsub.subscribe(sessionId, emit);
}
```

---

## Environment Setup

After pulling this branch, run:
```bash
npm install  # From root - installs all workspace packages
npm run build:shared  # Build shared-schema first
npm run dev  # Start web dev server
npm run daemon:dev  # Start daemon (in separate terminal)
```

## Testing the Migration

1. Start daemon: `npm run daemon:dev`
2. Start web: `npm run dev`
3. Navigate to a board page with `?daemonUrl=ws://localhost:8080/graphql`
4. Verify queue operations work between multiple browser tabs
