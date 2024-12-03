import { DataConnection } from 'peerjs';
import { Climb } from '@/app/lib/types';

export type UserName = string;
export type PeerId = string | null;

export interface ClimbQueueItem {
  addedBy?: UserName;
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
}

export type QueueAction =
  | { type: 'ADD_TO_QUEUE'; payload: Climb }
  | { type: 'REMOVE_FROM_QUEUE'; payload: ClimbQueueItem }
  | { type: 'SET_CURRENT_CLIMB'; payload: Climb }
  | { type: 'SET_CURRENT_CLIMB_QUEUE_ITEM'; payload: ClimbQueueItem }
  | { type: 'SET_CLIMB_SEARCH_PARAMS'; payload: SearchRequestPagination }
  | { type: 'UPDATE_QUEUE'; payload: { queue: ClimbQueue; currentClimbQueueItem?: ClimbQueueItem | null } }
  | { type: 'SET_FIRST_FETCH'; payload: boolean }
  | { type: 'MIRROR_CLIMB' };

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
  peerId: PeerId;
  addToQueue: (climb: Climb) => void;
  removeFromQueue: (item: ClimbQueueItem) => void;
  setCurrentClimb: (climb: Climb) => void;
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;
  setClimbSearchParams: (params: SearchRequestPagination) => void;
  mirrorClimb: () => void;
  fetchMoreClimbs: () => void;
  getNextClimbQueueItem: () => ClimbQueueItem | null;
  getPreviousClimbQueueItem: () => ClimbQueueItem | null;
}
