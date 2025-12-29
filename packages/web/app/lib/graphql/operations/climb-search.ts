import { gql } from 'graphql-request';
import type { Climb, ClimbStats } from '@/app/lib/types';

// Fragment for climb fields (ClimbWithStats in GraphQL schema)
// This includes both immutable climb data and mutable stats
const CLIMB_WITH_STATS_FIELDS = `
  uuid
  setter_username
  name
  description
  frames
  angle
  ascensionist_count
  difficulty
  quality_average
  stars
  difficulty_error
  litUpHoldsMap
  mirrored
  benchmark_difficulty
  userAscents
  userAttempts
`;

// Fragment for stats-only fields
// Use this when fetching stats separately from immutable climb data
const CLIMB_STATS_FIELDS = `
  climbUuid
  angle
  ascensionist_count
  difficulty
  quality_average
  stars
  difficulty_error
  benchmark_difficulty
`;

export const SEARCH_CLIMBS = gql`
  query SearchClimbs($input: ClimbSearchInput!) {
    searchClimbs(input: $input) {
      climbs {
        ${CLIMB_WITH_STATS_FIELDS}
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_CLIMB = gql`
  query GetClimb(
    $boardName: String!
    $layoutId: Int!
    $sizeId: Int!
    $setIds: String!
    $angle: Int!
    $climbUuid: ID!
  ) {
    climb(
      boardName: $boardName
      layoutId: $layoutId
      sizeId: $sizeId
      setIds: $setIds
      angle: $angle
      climbUuid: $climbUuid
    ) {
      ${CLIMB_WITH_STATS_FIELDS}
    }
  }
`;

// Query to fetch stats for multiple climbs
// Use this for refreshing stats independently of immutable climb data
export const GET_CLIMB_STATS = gql`
  query GetClimbStats(
    $boardName: String!
    $angle: Int!
    $climbUuids: [ID!]!
  ) {
    climbStats(
      boardName: $boardName
      angle: $angle
      climbUuids: $climbUuids
    ) {
      ${CLIMB_STATS_FIELDS}
    }
  }
`;

// Type for the search input
export interface ClimbSearchInputVariables {
  input: {
    boardName: string;
    layoutId: number;
    sizeId: number;
    setIds: string;
    angle: number;
    page?: number;
    pageSize?: number;
    gradeAccuracy?: string;
    minGrade?: number;
    maxGrade?: number;
    minAscents?: number;
    sortBy?: string;
    sortOrder?: string;
    name?: string;
    setter?: string[];
    hideAttempted?: boolean;
    hideCompleted?: boolean;
    showOnlyAttempted?: boolean;
    showOnlyCompleted?: boolean;
  };
}

// Type for the search response - uses the Climb type from the app
export interface ClimbSearchResponse {
  searchClimbs: {
    climbs: Climb[];
    totalCount: number;
    hasMore: boolean;
  };
}

// Type for climb stats query variables
export interface ClimbStatsInputVariables {
  boardName: string;
  angle: number;
  climbUuids: string[];
}

// Type for climb stats query response
export interface ClimbStatsResponse {
  climbStats: ClimbStats[];
}
