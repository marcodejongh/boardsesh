import { gql } from 'graphql-request';
import type {
  Gym,
  GymConnection,
  GymMemberConnection,
  CreateGymInput,
  UpdateGymInput,
  AddGymMemberInput,
  RemoveGymMemberInput,
  FollowGymInput,
  MyGymsInput,
  SearchGymsInput,
  GymMembersInput,
  LinkBoardToGymInput,
} from '@boardsesh/shared-schema';

// ============================================
// Gym Queries
// ============================================

const GYM_FIELDS = `
  uuid
  slug
  ownerId
  ownerDisplayName
  ownerAvatarUrl
  name
  description
  address
  contactEmail
  contactPhone
  latitude
  longitude
  isPublic
  imageUrl
  createdAt
  boardCount
  memberCount
  followerCount
  commentCount
  isFollowedByMe
  isMember
  myRole
`;

export const GET_GYM = gql`
  query GetGym($gymUuid: ID!) {
    gym(gymUuid: $gymUuid) {
      ${GYM_FIELDS}
    }
  }
`;

export const GET_GYM_BY_SLUG = gql`
  query GetGymBySlug($slug: String!) {
    gymBySlug(slug: $slug) {
      ${GYM_FIELDS}
    }
  }
`;

export const GET_MY_GYMS = gql`
  query GetMyGyms($input: MyGymsInput) {
    myGyms(input: $input) {
      gyms {
        ${GYM_FIELDS}
      }
      totalCount
      hasMore
    }
  }
`;

export const SEARCH_GYMS = gql`
  query SearchGyms($input: SearchGymsInput!) {
    searchGyms(input: $input) {
      gyms {
        ${GYM_FIELDS}
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_GYM_MEMBERS = gql`
  query GetGymMembers($input: GymMembersInput!) {
    gymMembers(input: $input) {
      members {
        userId
        displayName
        avatarUrl
        role
        createdAt
      }
      totalCount
      hasMore
    }
  }
`;

// ============================================
// Gym Mutations
// ============================================

export const CREATE_GYM = gql`
  mutation CreateGym($input: CreateGymInput!) {
    createGym(input: $input) {
      ${GYM_FIELDS}
    }
  }
`;

export const UPDATE_GYM = gql`
  mutation UpdateGym($input: UpdateGymInput!) {
    updateGym(input: $input) {
      ${GYM_FIELDS}
    }
  }
`;

export const DELETE_GYM = gql`
  mutation DeleteGym($gymUuid: ID!) {
    deleteGym(gymUuid: $gymUuid)
  }
`;

export const ADD_GYM_MEMBER = gql`
  mutation AddGymMember($input: AddGymMemberInput!) {
    addGymMember(input: $input)
  }
`;

export const REMOVE_GYM_MEMBER = gql`
  mutation RemoveGymMember($input: RemoveGymMemberInput!) {
    removeGymMember(input: $input)
  }
`;

export const FOLLOW_GYM = gql`
  mutation FollowGym($input: FollowGymInput!) {
    followGym(input: $input)
  }
`;

export const UNFOLLOW_GYM = gql`
  mutation UnfollowGym($input: FollowGymInput!) {
    unfollowGym(input: $input)
  }
`;

export const LINK_BOARD_TO_GYM = gql`
  mutation LinkBoardToGym($input: LinkBoardToGymInput!) {
    linkBoardToGym(input: $input)
  }
`;

// ============================================
// Query/Mutation Variable Types
// ============================================

export interface GetGymQueryVariables {
  gymUuid: string;
}

export interface GetGymQueryResponse {
  gym: Gym | null;
}

export interface GetGymBySlugQueryVariables {
  slug: string;
}

export interface GetGymBySlugQueryResponse {
  gymBySlug: Gym | null;
}

export interface GetMyGymsQueryVariables {
  input?: MyGymsInput;
}

export interface GetMyGymsQueryResponse {
  myGyms: GymConnection;
}

export interface SearchGymsQueryVariables {
  input: SearchGymsInput;
}

export interface SearchGymsQueryResponse {
  searchGyms: GymConnection;
}

export interface GetGymMembersQueryVariables {
  input: GymMembersInput;
}

export interface GetGymMembersQueryResponse {
  gymMembers: GymMemberConnection;
}

export interface CreateGymMutationVariables {
  input: CreateGymInput;
}

export interface CreateGymMutationResponse {
  createGym: Gym;
}

export interface UpdateGymMutationVariables {
  input: UpdateGymInput;
}

export interface UpdateGymMutationResponse {
  updateGym: Gym;
}

export interface DeleteGymMutationVariables {
  gymUuid: string;
}

export interface DeleteGymMutationResponse {
  deleteGym: boolean;
}

export interface AddGymMemberMutationVariables {
  input: AddGymMemberInput;
}

export interface AddGymMemberMutationResponse {
  addGymMember: boolean;
}

export interface RemoveGymMemberMutationVariables {
  input: RemoveGymMemberInput;
}

export interface RemoveGymMemberMutationResponse {
  removeGymMember: boolean;
}

export interface FollowGymMutationVariables {
  input: FollowGymInput;
}

export interface FollowGymMutationResponse {
  followGym: boolean;
}

export interface UnfollowGymMutationVariables {
  input: FollowGymInput;
}

export interface UnfollowGymMutationResponse {
  unfollowGym: boolean;
}

export interface LinkBoardToGymMutationVariables {
  input: LinkBoardToGymInput;
}

export interface LinkBoardToGymMutationResponse {
  linkBoardToGym: boolean;
}
