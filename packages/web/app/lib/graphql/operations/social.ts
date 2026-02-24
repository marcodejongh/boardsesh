import { gql } from 'graphql-request';
import type {
  PublicUserProfile,
  FollowConnection,
  UserSearchConnection,
  UnifiedSearchConnection,
  FollowingAscentsFeedResult,
  SetterProfile,
} from '@boardsesh/shared-schema';

// ============================================
// Follow Mutations
// ============================================

export const FOLLOW_USER = gql`
  mutation FollowUser($input: FollowInput!) {
    followUser(input: $input)
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($input: FollowInput!) {
    unfollowUser(input: $input)
  }
`;

// ============================================
// Follow Queries
// ============================================

export const GET_PUBLIC_PROFILE = gql`
  query GetPublicProfile($userId: ID!) {
    publicProfile(userId: $userId) {
      id
      displayName
      avatarUrl
      followerCount
      followingCount
      isFollowedByMe
    }
  }
`;

export const GET_FOLLOWERS = gql`
  query GetFollowers($input: FollowListInput!) {
    followers(input: $input) {
      users {
        id
        displayName
        avatarUrl
        followerCount
        followingCount
        isFollowedByMe
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_FOLLOWING = gql`
  query GetFollowing($input: FollowListInput!) {
    following(input: $input) {
      users {
        id
        displayName
        avatarUrl
        followerCount
        followingCount
        isFollowedByMe
      }
      totalCount
      hasMore
    }
  }
`;

export const IS_FOLLOWING = gql`
  query IsFollowing($userId: ID!) {
    isFollowing(userId: $userId)
  }
`;

// ============================================
// User Search
// ============================================

export const SEARCH_USERS = gql`
  query SearchUsers($input: SearchUsersInput!) {
    searchUsers(input: $input) {
      results {
        user {
          id
          displayName
          avatarUrl
          followerCount
          followingCount
          isFollowedByMe
        }
        recentAscentCount
        matchReason
      }
      totalCount
      hasMore
    }
  }
`;

// ============================================
// Following Ascents Feed
// ============================================

export const GET_FOLLOWING_ASCENTS_FEED = gql`
  query GetFollowingAscentsFeed($input: FollowingAscentsFeedInput) {
    followingAscentsFeed(input: $input) {
      items {
        uuid
        userId
        userDisplayName
        userAvatarUrl
        climbUuid
        climbName
        setterUsername
        boardType
        layoutId
        angle
        isMirror
        status
        attemptCount
        quality
        difficulty
        difficultyName
        isBenchmark
        comment
        climbedAt
        frames
      }
      totalCount
      hasMore
    }
  }
`;

// ============================================
// Global Ascents Feed
// ============================================

export const GET_GLOBAL_ASCENTS_FEED = gql`
  query GetGlobalAscentsFeed($input: FollowingAscentsFeedInput) {
    globalAscentsFeed(input: $input) {
      items {
        uuid
        userId
        userDisplayName
        userAvatarUrl
        climbUuid
        climbName
        setterUsername
        boardType
        layoutId
        angle
        isMirror
        status
        attemptCount
        quality
        difficulty
        difficultyName
        isBenchmark
        comment
        climbedAt
        frames
      }
      totalCount
      hasMore
    }
  }
`;

// ============================================
// Query/Mutation Variable Types
// ============================================

export interface FollowUserMutationVariables {
  input: { userId: string };
}

export interface FollowUserMutationResponse {
  followUser: boolean;
}

export interface UnfollowUserMutationVariables {
  input: { userId: string };
}

export interface UnfollowUserMutationResponse {
  unfollowUser: boolean;
}

export interface GetPublicProfileQueryVariables {
  userId: string;
}

export interface GetPublicProfileQueryResponse {
  publicProfile: PublicUserProfile | null;
}

export interface GetFollowersQueryVariables {
  input: { userId: string; limit?: number; offset?: number };
}

export interface GetFollowersQueryResponse {
  followers: FollowConnection;
}

export interface GetFollowingQueryVariables {
  input: { userId: string; limit?: number; offset?: number };
}

export interface GetFollowingQueryResponse {
  following: FollowConnection;
}

export interface IsFollowingQueryVariables {
  userId: string;
}

export interface IsFollowingQueryResponse {
  isFollowing: boolean;
}

export interface SearchUsersQueryVariables {
  input: { query: string; boardType?: string; limit?: number; offset?: number };
}

export interface SearchUsersQueryResponse {
  searchUsers: UserSearchConnection;
}

export interface GetFollowingAscentsFeedQueryVariables {
  input?: { limit?: number; offset?: number };
}

export interface GetFollowingAscentsFeedQueryResponse {
  followingAscentsFeed: FollowingAscentsFeedResult;
}

export interface GetGlobalAscentsFeedQueryVariables {
  input?: { limit?: number; offset?: number };
}

export interface GetGlobalAscentsFeedQueryResponse {
  globalAscentsFeed: FollowingAscentsFeedResult;
}

// ============================================
// Setter Follow Mutations
// ============================================

export const FOLLOW_SETTER = gql`
  mutation FollowSetter($input: FollowSetterInput!) {
    followSetter(input: $input)
  }
`;

export const UNFOLLOW_SETTER = gql`
  mutation UnfollowSetter($input: FollowSetterInput!) {
    unfollowSetter(input: $input)
  }
`;

// ============================================
// Setter Queries
// ============================================

export const GET_SETTER_PROFILE = gql`
  query GetSetterProfile($input: SetterProfileInput!) {
    setterProfile(input: $input) {
      username
      climbCount
      boardTypes
      followerCount
      isFollowedByMe
      linkedUserId
      linkedUserDisplayName
      linkedUserAvatarUrl
    }
  }
`;

// ============================================
// Setter Climbs Full (with litUpHoldsMap for thumbnails)
// ============================================

export const GET_SETTER_CLIMBS_FULL = gql`
  query GetSetterClimbsFull($input: SetterClimbsFullInput!) {
    setterClimbsFull(input: $input) {
      climbs {
        uuid
        layoutId
        boardType
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
        benchmark_difficulty
        litUpHoldsMap
      }
      totalCount
      hasMore
    }
  }
`;

export interface GetSetterClimbsFullQueryVariables {
  input: {
    username: string;
    boardType?: string;
    layoutId?: number;
    sizeId?: number;
    setIds?: string;
    angle?: number;
    sortBy?: string;
    limit?: number;
    offset?: number;
  };
}

export interface GetSetterClimbsFullQueryResponse {
  setterClimbsFull: {
    climbs: import('@/app/lib/types').Climb[];
    totalCount: number;
    hasMore: boolean;
  };
}

// ============================================
// Unified Search
// ============================================

export const SEARCH_USERS_AND_SETTERS = gql`
  query SearchUsersAndSetters($input: SearchUsersInput!) {
    searchUsersAndSetters(input: $input) {
      results {
        user {
          id
          displayName
          avatarUrl
          followerCount
          followingCount
          isFollowedByMe
        }
        setter {
          username
          climbCount
          boardTypes
          isFollowedByMe
        }
        recentAscentCount
        matchReason
      }
      totalCount
      hasMore
    }
  }
`;

// ============================================
// Setter Query/Mutation Variable Types
// ============================================

export interface FollowSetterMutationVariables {
  input: { setterUsername: string };
}

export interface FollowSetterMutationResponse {
  followSetter: boolean;
}

export interface UnfollowSetterMutationVariables {
  input: { setterUsername: string };
}

export interface UnfollowSetterMutationResponse {
  unfollowSetter: boolean;
}

export interface GetSetterProfileQueryVariables {
  input: { username: string };
}

export interface GetSetterProfileQueryResponse {
  setterProfile: SetterProfile | null;
}

export interface SearchUsersAndSettersQueryVariables {
  input: { query: string; boardType?: string; limit?: number; offset?: number };
}

export interface SearchUsersAndSettersQueryResponse {
  searchUsersAndSetters: UnifiedSearchConnection;
}
