import { gql } from 'graphql-request';
import type { Tick, SaveTickInput, GetTicksInput } from '@boardsesh/shared-schema';

export const GET_TICKS = gql`
  query GetTicks($input: GetTicksInput!) {
    ticks(input: $input) {
      uuid
      userId
      boardType
      climbUuid
      angle
      isMirror
      status
      attemptCount
      quality
      difficulty
      isBenchmark
      comment
      climbedAt
      createdAt
      updatedAt
      sessionId
      auroraType
      auroraId
      auroraSyncedAt
    }
  }
`;

export const GET_USER_TICKS = gql`
  query GetUserTicks($userId: ID!, $boardType: String!) {
    userTicks(userId: $userId, boardType: $boardType) {
      uuid
      userId
      boardType
      climbUuid
      angle
      isMirror
      status
      attemptCount
      quality
      difficulty
      isBenchmark
      comment
      climbedAt
      createdAt
      updatedAt
      sessionId
      auroraType
      auroraId
      auroraSyncedAt
      layoutId
    }
  }
`;

export const SAVE_TICK = gql`
  mutation SaveTick($input: SaveTickInput!) {
    saveTick(input: $input) {
      uuid
      userId
      boardType
      climbUuid
      angle
      isMirror
      status
      attemptCount
      quality
      difficulty
      isBenchmark
      comment
      climbedAt
      createdAt
      updatedAt
      sessionId
      auroraType
      auroraId
      auroraSyncedAt
    }
  }
`;

// Type for the GetTicks query variables
export interface GetTicksQueryVariables {
  input: GetTicksInput;
}

// Type for the GetTicks query response
export interface GetTicksQueryResponse {
  ticks: Tick[];
}

// Type for the GetUserTicks query variables
export interface GetUserTicksQueryVariables {
  userId: string;
  boardType: string;
}

// Type for the GetUserTicks query response
export interface GetUserTicksQueryResponse {
  userTicks: Tick[];
}

// Type for the SaveTick mutation variables
export interface SaveTickMutationVariables {
  input: SaveTickInput;
}

// Type for the SaveTick mutation response
export interface SaveTickMutationResponse {
  saveTick: Tick;
}

// ============================================
// Activity Feed Operations
// ============================================

export const GET_USER_ASCENTS_FEED = gql`
  query GetUserAscentsFeed($userId: ID!, $input: AscentFeedInput) {
    userAscentsFeed(userId: $userId, input: $input) {
      items {
        uuid
        climbUuid
        climbName
        setterUsername
        boardType
        layoutId
        angle
        isMirror
        status
        attemptCount
        quality
        difficulty
        difficultyName
        isBenchmark
        comment
        climbedAt
        frames
      }
      totalCount
      hasMore
    }
  }
`;

// Type for individual ascent feed item
export interface AscentFeedItem {
  uuid: string;
  climbUuid: string;
  climbName: string;
  setterUsername: string | null;
  boardType: string;
  layoutId: number | null;
  angle: number;
  isMirror: boolean;
  status: 'flash' | 'send' | 'attempt';
  attemptCount: number;
  quality: number | null;
  difficulty: number | null;
  difficultyName: string | null;
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
  frames: string | null;
}

// Type for the feed query variables
export interface GetUserAscentsFeedQueryVariables {
  userId: string;
  input?: {
    limit?: number;
    offset?: number;
  };
}

// Type for the feed query response
export interface GetUserAscentsFeedQueryResponse {
  userAscentsFeed: {
    items: AscentFeedItem[];
    totalCount: number;
    hasMore: boolean;
  };
}

// ============================================
// Profile Statistics Operations
// ============================================

export const GET_USER_PROFILE_STATS = gql`
  query GetUserProfileStats($userId: ID!) {
    userProfileStats(userId: $userId) {
      totalDistinctClimbs
      layoutStats {
        layoutKey
        boardType
        layoutId
        distinctClimbCount
        gradeCounts {
          grade
          count
        }
      }
    }
  }
`;

// Type for grade count
export interface GradeCount {
  grade: string;
  count: number;
}

// Type for layout stats
export interface LayoutStats {
  layoutKey: string;
  boardType: string;
  layoutId: number | null;
  distinctClimbCount: number;
  gradeCounts: GradeCount[];
}

// Type for the profile stats query variables
export interface GetUserProfileStatsQueryVariables {
  userId: string;
}

// Type for the profile stats query response
export interface GetUserProfileStatsQueryResponse {
  userProfileStats: {
    totalDistinctClimbs: number;
    layoutStats: LayoutStats[];
  };
}
