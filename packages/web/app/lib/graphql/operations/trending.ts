import { gql } from 'graphql-request';
import type {
  TrendingClimbFeedInput,
  TrendingClimbFeedResult,
} from '@boardsesh/shared-schema';

export const GET_TRENDING_CLIMBS = gql`
  query GetTrendingClimbs($input: TrendingClimbFeedInput) {
    trendingClimbs(input: $input) {
      items {
        climbUuid
        climbName
        setterUsername
        boardType
        layoutId
        angle
        frames
        difficultyName
        qualityAverage
        currentAscents
        ascentDelta
        ascentPctChange
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_HOT_CLIMBS = gql`
  query GetHotClimbs($input: TrendingClimbFeedInput) {
    hotClimbs(input: $input) {
      items {
        climbUuid
        climbName
        setterUsername
        boardType
        layoutId
        angle
        frames
        difficultyName
        qualityAverage
        currentAscents
        ascentDelta
        ascentPctChange
      }
      totalCount
      hasMore
    }
  }
`;

export type GetTrendingClimbsQueryResponse = {
  trendingClimbs: TrendingClimbFeedResult;
};

export type GetHotClimbsQueryResponse = {
  hotClimbs: TrendingClimbFeedResult;
};

export type { TrendingClimbFeedInput, TrendingClimbFeedResult };
