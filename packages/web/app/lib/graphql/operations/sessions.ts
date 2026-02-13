import { gql } from 'graphql-request';
import type { SessionSummary } from '@boardsesh/shared-schema';

// ============================================
// Fragments
// ============================================

export const SESSION_SUMMARY_FIELDS = gql`
  fragment SessionSummaryFields on SessionSummary {
    sessionId
    totalSends
    totalAttempts
    gradeDistribution {
      grade
      count
    }
    hardestClimb {
      climbUuid
      climbName
      grade
    }
    participants {
      userId
      displayName
      avatarUrl
      sends
      attempts
    }
    startedAt
    endedAt
    durationMinutes
    goal
  }
`;

// ============================================
// Mutations
// ============================================

export const END_SESSION = gql`
  ${SESSION_SUMMARY_FIELDS}
  mutation EndSession($sessionId: ID!) {
    endSession(sessionId: $sessionId) {
      ...SessionSummaryFields
    }
  }
`;

// ============================================
// Queries
// ============================================

export const GET_SESSION_SUMMARY = gql`
  ${SESSION_SUMMARY_FIELDS}
  query GetSessionSummary($sessionId: ID!) {
    sessionSummary(sessionId: $sessionId) {
      ...SessionSummaryFields
    }
  }
`;

// ============================================
// Types
// ============================================

export type EndSessionVariables = {
  sessionId: string;
};

export type EndSessionResponse = {
  endSession: SessionSummary | null;
};

export type GetSessionSummaryVariables = {
  sessionId: string;
};

export type GetSessionSummaryResponse = {
  sessionSummary: SessionSummary | null;
};
