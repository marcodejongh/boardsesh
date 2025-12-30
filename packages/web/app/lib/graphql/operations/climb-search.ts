import { gql } from 'graphql-request';
import type { Climb } from '@/app/lib/types';

// Fragment for climb fields
const CLIMB_FIELDS = `
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

export const SEARCH_CLIMBS = gql`
  query SearchClimbs($input: ClimbSearchInput!) {
    searchClimbs(input: $input) {
      climbs {
        ${CLIMB_FIELDS}
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
      ${CLIMB_FIELDS}
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
    onlyTallClimbs?: boolean;
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
