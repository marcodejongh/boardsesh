import { gql } from 'graphql-request';
import type {
  PublicUserProfile,
  FollowConnection,
  UserSearchConnection,
  FollowingAscentsFeedResult,
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
