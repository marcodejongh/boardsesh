import { gql } from 'graphql-request';
import type { ActivityFeedInput } from '@boardsesh/shared-schema';

// ============================================
// Session-Grouped Feed Queries
// ============================================

const SESSION_FEED_ITEM_FIELDS = `
  sessionId
  sessionType
  sessionName
  participants {
    userId
    displayName
    avatarUrl
    sends
    flashes
    attempts
  }
  totalSends
  totalFlashes
  totalAttempts
  tickCount
  gradeDistribution {
    grade
    flash
    send
    attempt
  }
  boardTypes
  hardestGrade
  firstTickAt
  lastTickAt
  durationMinutes
  goal
  upvotes
  downvotes
  voteScore
  commentCount
`;

export const GET_SESSION_GROUPED_FEED = gql`
  query GetSessionGroupedFeed($input: ActivityFeedInput) {
    sessionGroupedFeed(input: $input) {
      sessions {
        ${SESSION_FEED_ITEM_FIELDS}
      }
      cursor
      hasMore
    }
  }
`;

export const GET_SESSION_DETAIL = gql`
  query GetSessionDetail($sessionId: ID!) {
    sessionDetail(sessionId: $sessionId) {
      ${SESSION_FEED_ITEM_FIELDS}
      ticks {
        uuid
        userId
        climbUuid
        climbName
        boardType
        layoutId
        angle
        status
        attemptCount
        difficulty
        difficultyName
        quality
        isMirror
        isBenchmark
        comment
        frames
        setterUsername
        climbedAt
      }
    }
  }
`;

// ============================================
// Query Variable Types
// ============================================

export interface GetSessionGroupedFeedQueryVariables {
  input?: ActivityFeedInput;
}

export interface GetSessionGroupedFeedQueryResponse {
  sessionGroupedFeed: import('@boardsesh/shared-schema').SessionFeedResult;
}

export interface GetSessionDetailQueryVariables {
  sessionId: string;
}

export interface GetSessionDetailQueryResponse {
  sessionDetail: import('@boardsesh/shared-schema').SessionDetail | null;
}
