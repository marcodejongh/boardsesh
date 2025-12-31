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
