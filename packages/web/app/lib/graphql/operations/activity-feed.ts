import { gql } from 'graphql-request';
import type { ActivityFeedResult, ActivityFeedInput } from '@boardsesh/shared-schema';

// ============================================
// Activity Feed Queries
// ============================================

const ACTIVITY_FEED_ITEM_FIELDS = `
  id
  type
  entityType
  entityId
  boardUuid
  actorId
  actorDisplayName
  actorAvatarUrl
  climbName
  climbUuid
  boardType
  layoutId
  gradeName
  status
  angle
  frames
  setterUsername
  commentBody
  isMirror
  isBenchmark
  difficulty
  difficultyName
  quality
  attemptCount
  comment
  createdAt
`;

export const GET_ACTIVITY_FEED = gql`
  query GetActivityFeed($input: ActivityFeedInput) {
    activityFeed(input: $input) {
      items {
        ${ACTIVITY_FEED_ITEM_FIELDS}
      }
      cursor
      hasMore
    }
  }
`;

export const GET_TRENDING_FEED = gql`
  query GetTrendingFeed($input: ActivityFeedInput) {
    trendingFeed(input: $input) {
      items {
        ${ACTIVITY_FEED_ITEM_FIELDS}
      }
      cursor
      hasMore
    }
  }
`;

// ============================================
// Query Variable Types
// ============================================

export interface GetActivityFeedQueryVariables {
  input?: ActivityFeedInput;
}

export interface GetActivityFeedQueryResponse {
  activityFeed: ActivityFeedResult;
}

export interface GetTrendingFeedQueryVariables {
  input?: ActivityFeedInput;
}

export interface GetTrendingFeedQueryResponse {
  trendingFeed: ActivityFeedResult;
}
