import { gql } from 'graphql-request';

export const CLIMB_STATS_HISTORY = gql`
  query ClimbStatsHistory($boardName: String!, $climbUuid: ID!) {
    climbStatsHistory(boardName: $boardName, climbUuid: $climbUuid) {
      angle
      ascensionistCount
      qualityAverage
      difficultyAverage
      displayDifficulty
      createdAt
    }
  }
`;

export interface ClimbStatsHistoryEntry {
  angle: number;
  ascensionistCount: number | null;
  qualityAverage: number | null;
  difficultyAverage: number | null;
  displayDifficulty: number | null;
  createdAt: string;
}

export interface ClimbStatsHistoryResponse {
  climbStatsHistory: ClimbStatsHistoryEntry[];
}
