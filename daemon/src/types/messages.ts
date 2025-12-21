// Shared types with BoardSesh client
// These mirror the types from app/components/connection-manager/types.ts

export interface ClimbQueueItem {
  addedBy?: string;
  tickedBy?: string[];
  climb: Climb;
  uuid: string;
  suggested?: boolean;
}

export interface Climb {
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
  litUpHoldsMap: Record<string, string>;
  mirrored?: boolean;
  benchmark_difficulty: string | null;
  userAscents?: number;
  userAttempts?: number;
}

// Session user info
export interface SessionUser {
  id: string;
  username: string;
  isLeader: boolean;
}

// ============= Client -> Daemon Messages =============

export interface JoinSessionMessage {
  type: 'join-session';
  sessionId: string;
  username?: string;
}

export interface LeaveSessionMessage {
  type: 'leave-session';
}

export interface UpdateUsernameMessage {
  type: 'update-username';
  username: string;
}

// Queue operation messages (relayed from client)
export interface AddQueueItemMessage {
  type: 'add-queue-item';
  item: ClimbQueueItem;
  position?: number;
}

export interface RemoveQueueItemMessage {
  type: 'remove-queue-item';
  uuid: string;
}

export interface ReorderQueueItemMessage {
  type: 'reorder-queue-item';
  uuid: string;
  oldIndex: number;
  newIndex: number;
}

export interface UpdateQueueMessage {
  type: 'update-queue';
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
}

export interface UpdateCurrentClimbMessage {
  type: 'update-current-climb';
  item: ClimbQueueItem | null;
  shouldAddToQueue?: boolean;
}

export interface MirrorCurrentClimbMessage {
  type: 'mirror-current-climb';
  mirrored: boolean;
}

export interface ReplaceQueueItemMessage {
  type: 'replace-queue-item';
  uuid: string;
  item: ClimbQueueItem;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
}

// ============= Daemon -> Client Messages =============

export interface SessionJoinedMessage {
  type: 'session-joined';
  clientId: string;
  sessionId: string;
  users: SessionUser[];
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
  isLeader: boolean;
}

export interface UserJoinedMessage {
  type: 'user-joined';
  user: SessionUser;
}

export interface UserLeftMessage {
  type: 'user-left';
  clientId: string;
}

export interface LeaderChangedMessage {
  type: 'leader-changed';
  leaderId: string;
}

export interface HeartbeatResponseMessage {
  type: 'heartbeat-response';
  originalTimestamp: number;
  responseTimestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

// Union types
export type ClientMessage =
  | JoinSessionMessage
  | LeaveSessionMessage
  | UpdateUsernameMessage
  | AddQueueItemMessage
  | RemoveQueueItemMessage
  | ReorderQueueItemMessage
  | UpdateQueueMessage
  | UpdateCurrentClimbMessage
  | MirrorCurrentClimbMessage
  | ReplaceQueueItemMessage
  | HeartbeatMessage;

export type DaemonMessage =
  | SessionJoinedMessage
  | UserJoinedMessage
  | UserLeftMessage
  | LeaderChangedMessage
  | HeartbeatResponseMessage
  | ErrorMessage
  | AddQueueItemMessage
  | RemoveQueueItemMessage
  | ReorderQueueItemMessage
  | UpdateQueueMessage
  | UpdateCurrentClimbMessage
  | MirrorCurrentClimbMessage
  | ReplaceQueueItemMessage;

// Type guards
export function isClientMessage(data: unknown): data is ClientMessage {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as { type?: string };
  if (!msg.type) return false;

  const validTypes = [
    'join-session',
    'leave-session',
    'update-username',
    'add-queue-item',
    'remove-queue-item',
    'reorder-queue-item',
    'update-queue',
    'update-current-climb',
    'mirror-current-climb',
    'replace-queue-item',
    'heartbeat',
  ];

  return validTypes.includes(msg.type);
}
