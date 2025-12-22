// Shared TypeScript types for BoardSesh
// These types are used by both the daemon and the web app

export type UserId = string;

// Hold state types matching the web app
export type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT' | 'ANY' | 'NOT';
export type LitupHold = { state: HoldState; color: string; displayColor: string };
export type LitUpHoldsMap = Record<number, LitupHold>;

export type Climb = {
  uuid: string;
  setter_username: string;
  name: string;
  description: string;
  frames: string;
  angle: number;
  ascensionist_count: number;
  difficulty: string;
  quality_average: string;
  stars: number;
  difficulty_error: string;
  litUpHoldsMap: LitUpHoldsMap;
  mirrored?: boolean;
  benchmark_difficulty: string | null;
  userAscents?: number;
  userAttempts?: number;
};

export type ClimbQueueItem = {
  uuid: string;
  climb: Climb;
  addedBy?: UserId;
  tickedBy?: UserId[];
  suggested?: boolean;
};

export type SessionUser = {
  id: string;
  username: string;
  isLeader: boolean;
};

export type QueueState = {
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
};

/**
 * Event types for GraphQL subscriptions
 *
 * ## Type Aliasing Strategy
 *
 * There are TWO event types because of GraphQL field aliasing:
 *
 * 1. **QueueEvent** (Server-side)
 *    - Used by the daemon when publishing events via PubSub
 *    - Uses the actual GraphQL field names defined in the schema (e.g., `item`)
 *
 * 2. **ClientQueueEvent** (Client-side)
 *    - Used by the web app when receiving subscription events
 *    - Uses aliased field names from the subscription query (e.g., `addedItem`, `currentItem`)
 *
 * The reason for this split is that the GraphQL subscription query in operations.ts
 * uses aliases to give more descriptive names to fields:
 *
 *   ```graphql
 *   subscription QueueUpdates($sessionId: String!) {
 *     queueUpdates(sessionId: $sessionId) {
 *       ... on QueueItemAdded {
 *         addedItem: item { ... }  # 'item' aliased to 'addedItem'
 *       }
 *       ... on CurrentClimbChanged {
 *         currentItem: item { ... }  # 'item' aliased to 'currentItem'
 *       }
 *     }
 *   }
 *   ```
 *
 * This aliasing is intentional for clarity in client code, but it means the
 * TypeScript types must reflect what the client actually receives.
 *
 * When working with these types:
 * - In the daemon (server): use `QueueEvent`
 * - In the web app (client): use `ClientQueueEvent`
 */

// Server-side event type - uses actual GraphQL field names
export type QueueEvent =
  | { __typename: 'FullSync'; state: QueueState }
  | { __typename: 'QueueItemAdded'; item: ClimbQueueItem; position?: number }
  | { __typename: 'QueueItemRemoved'; uuid: string }
  | { __typename: 'QueueReordered'; uuid: string; oldIndex: number; newIndex: number }
  | { __typename: 'CurrentClimbChanged'; item: ClimbQueueItem | null }
  | { __typename: 'ClimbMirrored'; mirrored: boolean };

// Client-side event type - uses aliased field names from subscription query
export type ClientQueueEvent =
  | { __typename: 'FullSync'; state: QueueState }
  | { __typename: 'QueueItemAdded'; addedItem: ClimbQueueItem; position?: number }
  | { __typename: 'QueueItemRemoved'; uuid: string }
  | { __typename: 'QueueReordered'; uuid: string; oldIndex: number; newIndex: number }
  | { __typename: 'CurrentClimbChanged'; currentItem: ClimbQueueItem | null }
  | { __typename: 'ClimbMirrored'; mirrored: boolean };

export type SessionEvent =
  | { __typename: 'UserJoined'; user: SessionUser }
  | { __typename: 'UserLeft'; userId: string }
  | { __typename: 'LeaderChanged'; leaderId: string }
  | { __typename: 'SessionEnded'; reason: string; newPath?: string };

export type ConnectionContext = {
  connectionId: string;
  sessionId?: string;
  userId?: string;
};
