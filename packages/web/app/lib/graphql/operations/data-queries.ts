import { gql } from 'graphql-request';
import type {
  BetaLink,
  ClimbStatsForAngle,
  HoldClassification,
  UserBoardMapping,
  UnsyncedCounts,
  SetterStat,
  HoldHeatmapStat,
} from '@boardsesh/shared-schema';

// ============================================
// Beta Links
// ============================================

export const GET_BETA_LINKS = gql`
  query GetBetaLinks($boardName: String!, $climbUuid: String!) {
    betaLinks(boardName: $boardName, climbUuid: $climbUuid) {
      climbUuid
      link
      foreignUsername
      angle
      thumbnail
      isListed
      createdAt
    }
  }
`;

export interface GetBetaLinksQueryVariables {
  boardName: string;
  climbUuid: string;
}

export interface GetBetaLinksQueryResponse {
  betaLinks: BetaLink[];
}

// ============================================
// Climb Stats
// ============================================

export const GET_CLIMB_STATS_FOR_ALL_ANGLES = gql`
  query GetClimbStatsForAllAngles($boardName: String!, $climbUuid: String!) {
    climbStatsForAllAngles(boardName: $boardName, climbUuid: $climbUuid) {
      angle
      ascensionistCount
      qualityAverage
      difficultyAverage
      displayDifficulty
      faUsername
      faAt
      difficulty
    }
  }
`;

export interface GetClimbStatsForAllAnglesQueryVariables {
  boardName: string;
  climbUuid: string;
}

export interface GetClimbStatsForAllAnglesQueryResponse {
  climbStatsForAllAngles: ClimbStatsForAngle[];
}

// ============================================
// Hold Classifications
// ============================================

export const GET_HOLD_CLASSIFICATIONS = gql`
  query GetHoldClassifications($input: GetHoldClassificationsInput!) {
    holdClassifications(input: $input) {
      id
      userId
      boardType
      layoutId
      sizeId
      holdId
      holdType
      handRating
      footRating
      pullDirection
      createdAt
      updatedAt
    }
  }
`;

export interface GetHoldClassificationsQueryVariables {
  input: {
    boardType: string;
    layoutId: number;
    sizeId: number;
  };
}

export interface GetHoldClassificationsQueryResponse {
  holdClassifications: HoldClassification[];
}

export const SAVE_HOLD_CLASSIFICATION = gql`
  mutation SaveHoldClassification($input: SaveHoldClassificationInput!) {
    saveHoldClassification(input: $input) {
      id
      userId
      boardType
      layoutId
      sizeId
      holdId
      holdType
      handRating
      footRating
      pullDirection
      createdAt
      updatedAt
    }
  }
`;

export interface SaveHoldClassificationMutationVariables {
  input: {
    boardType: string;
    layoutId: number;
    sizeId: number;
    holdId: number;
    holdType?: string | null;
    handRating?: number | null;
    footRating?: number | null;
    pullDirection?: number | null;
  };
}

export interface SaveHoldClassificationMutationResponse {
  saveHoldClassification: HoldClassification;
}

// ============================================
// User Board Mappings
// ============================================

export const GET_USER_BOARD_MAPPINGS = gql`
  query GetUserBoardMappings {
    userBoardMappings {
      id
      userId
      boardType
      boardUserId
      boardUsername
      createdAt
    }
  }
`;

export interface GetUserBoardMappingsQueryResponse {
  userBoardMappings: UserBoardMapping[];
}

export const SAVE_USER_BOARD_MAPPING = gql`
  mutation SaveUserBoardMapping($input: SaveUserBoardMappingInput!) {
    saveUserBoardMapping(input: $input)
  }
`;

export interface SaveUserBoardMappingMutationVariables {
  input: {
    boardType: string;
    boardUserId: number;
    boardUsername?: string | null;
  };
}

export interface SaveUserBoardMappingMutationResponse {
  saveUserBoardMapping: boolean;
}

// ============================================
// Unsynced Counts
// ============================================

export const GET_UNSYNCED_COUNTS = gql`
  query GetUnsyncedCounts {
    unsyncedCounts {
      kilter {
        ascents
        climbs
      }
      tension {
        ascents
        climbs
      }
    }
  }
`;

export interface GetUnsyncedCountsQueryResponse {
  unsyncedCounts: UnsyncedCounts;
}

// ============================================
// Setter Stats
// ============================================

export const GET_SETTER_STATS = gql`
  query GetSetterStats($input: SetterStatsInput!) {
    setterStats(input: $input) {
      setterUsername
      climbCount
    }
  }
`;

export interface GetSetterStatsQueryVariables {
  input: {
    boardName: string;
    layoutId: number;
    sizeId: number;
    setIds: string;
    angle: number;
    search?: string | null;
  };
}

export interface GetSetterStatsQueryResponse {
  setterStats: SetterStat[];
}

// ============================================
// Hold Heatmap
// ============================================

export const GET_HOLD_HEATMAP = gql`
  query GetHoldHeatmap($input: HoldHeatmapInput!) {
    holdHeatmap(input: $input) {
      holdId
      totalUses
      startingUses
      totalAscents
      handUses
      footUses
      finishUses
      averageDifficulty
      userAscents
      userAttempts
    }
  }
`;

export interface GetHoldHeatmapQueryVariables {
  input: {
    boardName: string;
    layoutId: number;
    sizeId: number;
    setIds: string;
    angle: number;
    gradeAccuracy?: string | null;
    minGrade?: number | null;
    maxGrade?: number | null;
    minAscents?: number | null;
    minRating?: number | null;
    sortBy?: string | null;
    sortOrder?: string | null;
    name?: string | null;
    settername?: string[] | null;
    onlyClassics?: boolean | null;
    onlyTallClimbs?: boolean | null;
    holdsFilter?: Record<string, string> | null;
    hideAttempted?: boolean | null;
    hideCompleted?: boolean | null;
    showOnlyAttempted?: boolean | null;
    showOnlyCompleted?: boolean | null;
  };
}

export interface GetHoldHeatmapQueryResponse {
  holdHeatmap: HoldHeatmapStat[];
}
