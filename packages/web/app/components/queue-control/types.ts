import { Climb, SearchRequestPagination, ParsedBoardRouteParameters } from '@/app/lib/types';
import { SessionUser } from '@boardsesh/shared-schema';

export type PeerId = string | null;
export type UserName = PeerId;

export interface QueueItemUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface ClimbQueueItem {
  addedBy?: UserName;
  addedByUser?: QueueItemUser;
  tickedBy?: UserName[];
  climb: Climb;
  uuid: string;
  suggested?: boolean;
}

export type ClimbQueue = ClimbQueueItem[];

export interface QueueState {
  queue: ClimbQueue;
  currentClimbQueueItem: ClimbQueueItem | null;
  climbSearchParams: SearchRequestPagination;
  hasDoneFirstFetch: boolean;
  initialQueueDataReceivedFromPeers: boolean;
}

export type QueueAction =
  | { type: 'ADD_TO_QUEUE'; payload: ClimbQueueItem }
  | { type: 'REMOVE_FROM_QUEUE'; payload: ClimbQueueItem[] }
  | { type: 'SET_CURRENT_CLIMB'; payload: ClimbQueueItem }
  | { type: 'SET_CURRENT_CLIMB_QUEUE_ITEM'; payload: ClimbQueueItem }
  | { type: 'SET_CLIMB_SEARCH_PARAMS'; payload: SearchRequestPagination }
  | { type: 'UPDATE_QUEUE'; payload: { queue: ClimbQueue; currentClimbQueueItem?: ClimbQueueItem | null } }
  | { type: 'INITIAL_QUEUE_DATA'; payload: { queue: ClimbQueue; currentClimbQueueItem?: ClimbQueueItem | null } }
  | { type: 'SET_FIRST_FETCH'; payload: boolean }
  | { type: 'MIRROR_CLIMB' }
  // Delta-specific actions
  | { type: 'DELTA_ADD_QUEUE_ITEM'; payload: { item: ClimbQueueItem; position?: number } }
  | { type: 'DELTA_REMOVE_QUEUE_ITEM'; payload: { uuid: string } }
  | { type: 'DELTA_REORDER_QUEUE_ITEM'; payload: { uuid: string; oldIndex: number; newIndex: number } }
  | { type: 'DELTA_UPDATE_CURRENT_CLIMB'; payload: { item: ClimbQueueItem | null; shouldAddToQueue?: boolean } }
  | { type: 'DELTA_MIRROR_CURRENT_CLIMB'; payload: { mirrored: boolean } }
  | { type: 'DELTA_REPLACE_QUEUE_ITEM'; payload: { uuid: string; item: ClimbQueueItem } };

export interface QueueContextType {
  queue: ClimbQueue;
  currentClimbQueueItem: ClimbQueueItem | null;
  currentClimb: Climb | null;
  climbSearchParams: SearchRequestPagination;
  climbSearchResults: Climb[] | null;
  suggestedClimbs: Climb[];
  totalSearchResultCount: number | null;
  hasMoreResults: boolean;
  isFetchingClimbs: boolean;
  hasDoneFirstFetch: boolean;
  viewOnlyMode: boolean;
  parsedParams: ParsedBoardRouteParameters;
  // Session-related fields (from GraphQL queue)
  users?: SessionUser[];
  clientId?: string | null;
  isLeader?: boolean;
  isDaemonMode?: boolean;
  hasConnected?: boolean;
  connectionError?: Error | null;
  disconnect?: () => void;
  addToQueue: (climb: Climb) => void;
  removeFromQueue: (item: ClimbQueueItem) => void;
  setCurrentClimb: (climb: Climb) => void;
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;
  setClimbSearchParams: (params: SearchRequestPagination) => void;
  mirrorClimb: () => void;
  fetchMoreClimbs: () => void;
  getNextClimbQueueItem: () => ClimbQueueItem | null;
  getPreviousClimbQueueItem: () => ClimbQueueItem | null;
  setQueue: (queue: ClimbQueueItem[]) => void;
}
