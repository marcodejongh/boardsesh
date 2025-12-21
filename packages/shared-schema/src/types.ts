// Shared TypeScript types for BoardSesh
// These types are used by both the daemon and the web app

export type LitUpHoldsMap = Record<string, string>;

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
  addedBy?: string;
  tickedBy?: string[];
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

// Event types for subscriptions
export type QueueEvent =
  | { __typename: 'FullSync'; state: QueueState }
  | { __typename: 'QueueItemAdded'; item: ClimbQueueItem; position?: number }
  | { __typename: 'QueueItemRemoved'; uuid: string }
  | { __typename: 'QueueReordered'; uuid: string; oldIndex: number; newIndex: number }
  | { __typename: 'CurrentClimbChanged'; item: ClimbQueueItem | null }
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
