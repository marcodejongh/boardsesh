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
