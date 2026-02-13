import { gql } from 'graphql-request';
import type {
  UserBoard,
  UserBoardConnection,
  BoardLeaderboard,
  CreateBoardInput,
  UpdateBoardInput,
  BoardLeaderboardInput,
  MyBoardsInput,
  FollowBoardInput,
  SearchBoardsInput,
} from '@boardsesh/shared-schema';

// ============================================
// Board Queries
// ============================================

const BOARD_FIELDS = `
  uuid
  slug
  ownerId
  ownerDisplayName
  ownerAvatarUrl
  boardType
  layoutId
  sizeId
  setIds
  name
  description
  locationName
  latitude
  longitude
  isPublic
  isOwned
  angle
  isAngleAdjustable
  createdAt
  layoutName
  sizeName
  sizeDescription
  setNames
  totalAscents
  uniqueClimbers
  followerCount
  commentCount
  isFollowedByMe
  gymId
  gymUuid
  gymName
`;

export const GET_BOARD = gql`
  query GetBoard($boardUuid: ID!) {
    board(boardUuid: $boardUuid) {
      ${BOARD_FIELDS}
    }
  }
`;

export const GET_BOARD_BY_SLUG = gql`
  query GetBoardBySlug($slug: String!) {
    boardBySlug(slug: $slug) {
      ${BOARD_FIELDS}
    }
  }
`;

export const GET_MY_BOARDS = gql`
  query GetMyBoards($input: MyBoardsInput) {
    myBoards(input: $input) {
      boards {
        ${BOARD_FIELDS}
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_DEFAULT_BOARD = gql`
  query GetDefaultBoard {
    defaultBoard {
      ${BOARD_FIELDS}
    }
  }
`;

export const SEARCH_BOARDS = gql`
  query SearchBoards($input: SearchBoardsInput!) {
    searchBoards(input: $input) {
      boards {
        ${BOARD_FIELDS}
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_BOARD_LEADERBOARD = gql`
  query GetBoardLeaderboard($input: BoardLeaderboardInput!) {
    boardLeaderboard(input: $input) {
      boardUuid
      entries {
        userId
        userDisplayName
        userAvatarUrl
        rank
        totalSends
        totalFlashes
        hardestGrade
        hardestGradeName
        totalSessions
      }
      totalCount
      hasMore
      periodLabel
    }
  }
`;

// ============================================
// Board Mutations
// ============================================

export const CREATE_BOARD = gql`
  mutation CreateBoard($input: CreateBoardInput!) {
    createBoard(input: $input) {
      ${BOARD_FIELDS}
    }
  }
`;

export const UPDATE_BOARD = gql`
  mutation UpdateBoard($input: UpdateBoardInput!) {
    updateBoard(input: $input) {
      ${BOARD_FIELDS}
    }
  }
`;

export const DELETE_BOARD = gql`
  mutation DeleteBoard($boardUuid: ID!) {
    deleteBoard(boardUuid: $boardUuid)
  }
`;

export const FOLLOW_BOARD = gql`
  mutation FollowBoard($input: FollowBoardInput!) {
    followBoard(input: $input)
  }
`;

export const UNFOLLOW_BOARD = gql`
  mutation UnfollowBoard($input: FollowBoardInput!) {
    unfollowBoard(input: $input)
  }
`;

// ============================================
// Query/Mutation Variable Types
// ============================================

export interface GetBoardQueryVariables {
  boardUuid: string;
}

export interface GetBoardQueryResponse {
  board: UserBoard | null;
}

export interface GetBoardBySlugQueryVariables {
  slug: string;
}

export interface GetBoardBySlugQueryResponse {
  boardBySlug: UserBoard | null;
}

export interface GetMyBoardsQueryVariables {
  input?: MyBoardsInput;
}

export interface GetMyBoardsQueryResponse {
  myBoards: UserBoardConnection;
}

export interface GetDefaultBoardQueryResponse {
  defaultBoard: UserBoard | null;
}

export interface SearchBoardsQueryVariables {
  input: SearchBoardsInput;
}

export interface SearchBoardsQueryResponse {
  searchBoards: UserBoardConnection;
}

export interface GetBoardLeaderboardQueryVariables {
  input: BoardLeaderboardInput;
}

export interface GetBoardLeaderboardQueryResponse {
  boardLeaderboard: BoardLeaderboard;
}

export interface CreateBoardMutationVariables {
  input: CreateBoardInput;
}

export interface CreateBoardMutationResponse {
  createBoard: UserBoard;
}

export interface UpdateBoardMutationVariables {
  input: UpdateBoardInput;
}

export interface UpdateBoardMutationResponse {
  updateBoard: UserBoard;
}

export interface DeleteBoardMutationVariables {
  boardUuid: string;
}

export interface DeleteBoardMutationResponse {
  deleteBoard: boolean;
}

export interface FollowBoardMutationVariables {
  input: FollowBoardInput;
}

export interface FollowBoardMutationResponse {
  followBoard: boolean;
}

export interface UnfollowBoardMutationVariables {
  input: FollowBoardInput;
}

export interface UnfollowBoardMutationResponse {
  unfollowBoard: boolean;
}
