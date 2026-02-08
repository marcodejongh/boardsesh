import { gql } from 'graphql-request';

export const GET_FAVORITES = gql`
  query Favorites($boardName: String!, $climbUuids: [String!]!, $angle: Int!) {
    favorites(boardName: $boardName, climbUuids: $climbUuids, angle: $angle)
  }
`;

export const TOGGLE_FAVORITE = gql`
  mutation ToggleFavorite($input: ToggleFavoriteInput!) {
    toggleFavorite(input: $input) {
      favorited
    }
  }
`;

// Type for the favorites query variables
export interface FavoritesQueryVariables {
  boardName: string;
  climbUuids: string[];
  angle: number;
}

// Type for the favorites query response
export interface FavoritesQueryResponse {
  favorites: string[];
}

// Type for the toggle favorite mutation variables
export interface ToggleFavoriteMutationVariables {
  input: {
    boardName: string;
    climbUuid: string;
    angle: number;
  };
}

// Type for the toggle favorite mutation response
export interface ToggleFavoriteMutationResponse {
  toggleFavorite: {
    favorited: boolean;
  };
}

// Get user favorites counts per board
export const GET_USER_FAVORITES_COUNTS = gql`
  query UserFavoritesCounts {
    userFavoritesCounts {
      boardName
      count
    }
  }
`;

export interface FavoritesCount {
  boardName: string;
  count: number;
}

export interface UserFavoritesCountsQueryResponse {
  userFavoritesCounts: FavoritesCount[];
}

// Get active boards for the current user
export const GET_USER_ACTIVE_BOARDS = gql`
  query UserActiveBoards {
    userActiveBoards
  }
`;

export interface UserActiveBoardsQueryResponse {
  userActiveBoards: string[];
}

// Get user's favorite climbs with full data
export const GET_USER_FAVORITE_CLIMBS = gql`
  query GetUserFavoriteClimbs($input: GetUserFavoriteClimbsInput!) {
    userFavoriteClimbs(input: $input) {
      climbs {
        uuid
        layoutId
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
        benchmark_difficulty
      }
      totalCount
      hasMore
    }
  }
`;

export interface GetUserFavoriteClimbsInput {
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  page?: number;
  pageSize?: number;
}

export interface GetUserFavoriteClimbsQueryVariables {
  input: GetUserFavoriteClimbsInput;
}

export interface UserFavoriteClimbsResult {
  climbs: Array<{
    uuid: string;
    layoutId?: number | null;
    setter_username: string;
    name: string;
    description: string;
    frames: string;
    angle: number;
    ascensionist_count: number;
    difficulty: string;
    quality_average: string;
    stars: number;
    difficulty_error: string;
    litUpHoldsMap: Record<string, unknown>;
    benchmark_difficulty: string | null;
  }>;
  totalCount: number;
  hasMore: boolean;
}

export interface GetUserFavoriteClimbsQueryResponse {
  userFavoriteClimbs: UserFavoriteClimbsResult;
}
