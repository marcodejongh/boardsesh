import { gql } from 'graphql-request';
import type {
  ProposalType,
  ProposalStatus,
  Proposal,
  ProposalConnection,
  ClimbCommunityStatusType,
  CommunityRoleAssignment,
  CommunityRoleType,
  CommunitySettingType,
} from '@boardsesh/shared-schema';

// ============================================
// Proposal Queries
// ============================================

export const GET_CLIMB_PROPOSALS = gql`
  query GetClimbProposals($input: GetClimbProposalsInput!) {
    climbProposals(input: $input) {
      proposals {
        uuid
        climbUuid
        boardType
        angle
        proposerId
        proposerDisplayName
        proposerAvatarUrl
        type
        proposedValue
        currentValue
        status
        reason
        resolvedAt
        resolvedBy
        createdAt
        weightedUpvotes
        weightedDownvotes
        requiredUpvotes
        userVote
        climbName
        frames
        layoutId
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_CLIMB_COMMUNITY_STATUS = gql`
  query GetClimbCommunityStatus($climbUuid: String!, $boardType: String!, $angle: Int!) {
    climbCommunityStatus(climbUuid: $climbUuid, boardType: $boardType, angle: $angle) {
      climbUuid
      boardType
      angle
      communityGrade
      isBenchmark
      isClassic
      isFrozen
      freezeReason
      openProposalCount
      outlierAnalysis {
        isOutlier
        currentGrade
        neighborAverage
        neighborCount
        gradeDifference
      }
      updatedAt
    }
  }
`;

export const GET_BULK_CLIMB_COMMUNITY_STATUS = gql`
  query GetBulkClimbCommunityStatus($climbUuids: [String!]!, $boardType: String!, $angle: Int!) {
    bulkClimbCommunityStatus(climbUuids: $climbUuids, boardType: $boardType, angle: $angle) {
      climbUuid
      boardType
      angle
      communityGrade
      isBenchmark
      isClassic
      isFrozen
      freezeReason
      openProposalCount
      updatedAt
    }
  }
`;

export const BROWSE_PROPOSALS = gql`
  query BrowseProposals($input: BrowseProposalsInput!) {
    browseProposals(input: $input) {
      proposals {
        uuid
        climbUuid
        boardType
        angle
        proposerId
        proposerDisplayName
        proposerAvatarUrl
        type
        proposedValue
        currentValue
        status
        reason
        resolvedAt
        resolvedBy
        createdAt
        weightedUpvotes
        weightedDownvotes
        requiredUpvotes
        userVote
        climbName
        frames
        layoutId
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_CLIMB_CLASSIC_STATUS = gql`
  query GetClimbClassicStatus($climbUuid: String!, $boardType: String!) {
    climbClassicStatus(climbUuid: $climbUuid, boardType: $boardType) {
      climbUuid
      boardType
      isClassic
      updatedAt
    }
  }
`;

// ============================================
// Proposal Mutations
// ============================================

export const CREATE_PROPOSAL = gql`
  mutation CreateProposal($input: CreateProposalInput!) {
    createProposal(input: $input) {
      uuid
      climbUuid
      boardType
      angle
      proposerId
      proposerDisplayName
      proposerAvatarUrl
      type
      proposedValue
      currentValue
      status
      reason
      createdAt
      weightedUpvotes
      weightedDownvotes
      requiredUpvotes
      userVote
      climbName
      frames
      layoutId
    }
  }
`;

export const VOTE_ON_PROPOSAL = gql`
  mutation VoteOnProposal($input: VoteOnProposalInput!) {
    voteOnProposal(input: $input) {
      uuid
      climbUuid
      boardType
      angle
      proposerId
      proposerDisplayName
      proposerAvatarUrl
      type
      proposedValue
      currentValue
      status
      reason
      resolvedAt
      resolvedBy
      createdAt
      weightedUpvotes
      weightedDownvotes
      requiredUpvotes
      userVote
      climbName
      frames
      layoutId
    }
  }
`;

export const RESOLVE_PROPOSAL = gql`
  mutation ResolveProposal($input: ResolveProposalInput!) {
    resolveProposal(input: $input) {
      uuid
      status
      resolvedAt
      resolvedBy
      weightedUpvotes
      weightedDownvotes
      requiredUpvotes
      userVote
      climbName
      frames
      layoutId
    }
  }
`;

export const DELETE_PROPOSAL = gql`
  mutation DeleteProposal($input: DeleteProposalInput!) {
    deleteProposal(input: $input)
  }
`;

export const SETTER_OVERRIDE = gql`
  mutation SetterOverrideCommunityStatus($input: SetterOverrideInput!) {
    setterOverrideCommunityStatus(input: $input) {
      climbUuid
      boardType
      angle
      communityGrade
      isBenchmark
      isClassic
      isFrozen
      updatedAt
    }
  }
`;

export const FREEZE_CLIMB = gql`
  mutation FreezeClimb($input: FreezeClimbInput!) {
    freezeClimb(input: $input)
  }
`;

// ============================================
// Role Queries & Mutations
// ============================================

export const GET_COMMUNITY_ROLES = gql`
  query GetCommunityRoles($boardType: String) {
    communityRoles(boardType: $boardType) {
      id
      userId
      userDisplayName
      userAvatarUrl
      role
      boardType
      grantedBy
      grantedByDisplayName
      createdAt
    }
  }
`;

export const GET_MY_ROLES = gql`
  query GetMyRoles {
    myRoles {
      id
      userId
      role
      boardType
      createdAt
    }
  }
`;

export const GRANT_ROLE = gql`
  mutation GrantRole($input: GrantRoleInput!) {
    grantRole(input: $input) {
      id
      userId
      userDisplayName
      userAvatarUrl
      role
      boardType
      grantedBy
      grantedByDisplayName
      createdAt
    }
  }
`;

export const REVOKE_ROLE = gql`
  mutation RevokeRole($input: RevokeRoleInput!) {
    revokeRole(input: $input)
  }
`;

// ============================================
// Community Settings Queries & Mutations
// ============================================

export const GET_COMMUNITY_SETTINGS = gql`
  query GetCommunitySettings($scope: String!, $scopeKey: String!) {
    communitySettings(scope: $scope, scopeKey: $scopeKey) {
      id
      scope
      scopeKey
      key
      value
      setBy
      createdAt
      updatedAt
    }
  }
`;

export const SET_COMMUNITY_SETTING = gql`
  mutation SetCommunitySettings($input: SetCommunitySettingInput!) {
    setCommunitySettings(input: $input) {
      id
      scope
      scopeKey
      key
      value
      setBy
      createdAt
      updatedAt
    }
  }
`;

// ============================================
// Variable & Response Types
// ============================================

export interface GetClimbProposalsVariables {
  input: {
    climbUuid: string;
    boardType: string;
    angle?: number | null;
    type?: ProposalType | null;
    status?: ProposalStatus | null;
    limit?: number;
    offset?: number;
  };
}

export interface GetClimbProposalsResponse {
  climbProposals: ProposalConnection;
}

export interface GetClimbCommunityStatusVariables {
  climbUuid: string;
  boardType: string;
  angle: number;
}

export interface GetClimbCommunityStatusResponse {
  climbCommunityStatus: ClimbCommunityStatusType;
}

export interface GetBulkClimbCommunityStatusVariables {
  climbUuids: string[];
  boardType: string;
  angle: number;
}

export interface GetBulkClimbCommunityStatusResponse {
  bulkClimbCommunityStatus: ClimbCommunityStatusType[];
}

export interface BrowseProposalsVariables {
  input: {
    boardType?: string | null;
    boardUuid?: string | null;
    type?: ProposalType | null;
    status?: ProposalStatus | null;
    limit?: number;
    offset?: number;
  };
}

export interface BrowseProposalsResponse {
  browseProposals: ProposalConnection;
}

export interface CreateProposalVariables {
  input: {
    climbUuid: string;
    boardType: string;
    angle?: number | null;
    type: ProposalType;
    proposedValue: string;
    reason?: string | null;
  };
}

export interface CreateProposalResponse {
  createProposal: Proposal;
}

export interface VoteOnProposalVariables {
  input: {
    proposalUuid: string;
    value: number;
  };
}

export interface VoteOnProposalResponse {
  voteOnProposal: Proposal;
}

export interface ResolveProposalVariables {
  input: {
    proposalUuid: string;
    status: 'approved' | 'rejected';
    reason?: string | null;
  };
}

export interface ResolveProposalResponse {
  resolveProposal: Proposal;
}

export interface DeleteProposalVariables {
  input: {
    proposalUuid: string;
  };
}

export interface DeleteProposalResponse {
  deleteProposal: boolean;
}

export interface FreezeClimbVariables {
  input: {
    climbUuid: string;
    boardType: string;
    frozen: boolean;
    reason?: string | null;
  };
}

export interface FreezeClimbResponse {
  freezeClimb: boolean;
}

export interface GetCommunityRolesVariables {
  boardType?: string;
}

export interface GetCommunityRolesResponse {
  communityRoles: CommunityRoleAssignment[];
}

export interface GetMyRolesResponse {
  myRoles: CommunityRoleAssignment[];
}

export interface GrantRoleVariables {
  input: {
    userId: string;
    role: CommunityRoleType;
    boardType?: string | null;
  };
}

export interface GrantRoleResponse {
  grantRole: CommunityRoleAssignment;
}

export interface RevokeRoleVariables {
  input: {
    userId: string;
    role: CommunityRoleType;
    boardType?: string | null;
  };
}

export interface RevokeRoleResponse {
  revokeRole: boolean;
}

export interface GetCommunitySettingsVariables {
  scope: string;
  scopeKey: string;
}

export interface GetCommunitySettingsResponse {
  communitySettings: CommunitySettingType[];
}

export interface SetCommunitySettingVariables {
  input: {
    scope: string;
    scopeKey: string;
    key: string;
    value: string;
  };
}

export interface SetCommunitySettingResponse {
  setCommunitySettings: CommunitySettingType;
}
