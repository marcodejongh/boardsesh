import { gql } from 'graphql-request';

// ============================================
// Profile Queries & Mutations
// ============================================

export const GET_PROFILE = gql`
  query GetProfile {
    profile {
      id
      email
      displayName
      avatarUrl
      instagramUrl
    }
  }
`;

export interface GetProfileQueryResponse {
  profile: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
  } | null;
}

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      displayName
      avatarUrl
      instagramUrl
    }
  }
`;

export interface UpdateProfileMutationVariables {
  input: {
    displayName?: string | null;
    avatarUrl?: string | null;
    instagramUrl?: string | null;
  };
}

export interface UpdateProfileMutationResponse {
  updateProfile: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
  };
}

// ============================================
// Aurora Credentials Queries
// ============================================

export const GET_AURORA_CREDENTIALS = gql`
  query GetAuroraCredentials {
    auroraCredentials {
      boardType
      username
      userId
      syncedAt
      hasToken
      syncStatus
      syncError
      createdAt
    }
  }
`;

export interface AuroraCredentialStatusGql {
  boardType: string;
  username: string;
  userId: number | null;
  syncedAt: string | null;
  hasToken: boolean;
  syncStatus: string | null;
  syncError: string | null;
  createdAt: string | null;
}

export interface GetAuroraCredentialsQueryResponse {
  auroraCredentials: AuroraCredentialStatusGql[];
}

// ============================================
// Controller Queries & Mutations
// ============================================

export const GET_MY_CONTROLLERS = gql`
  query GetMyControllers {
    myControllers {
      id
      name
      boardName
      layoutId
      sizeId
      setIds
      isOnline
      lastSeen
      createdAt
    }
  }
`;

export interface ControllerInfoGql {
  id: string;
  name: string | null;
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
}

export interface GetMyControllersQueryResponse {
  myControllers: ControllerInfoGql[];
}

export const REGISTER_CONTROLLER = gql`
  mutation RegisterController($input: RegisterControllerInput!) {
    registerController(input: $input) {
      apiKey
      controllerId
    }
  }
`;

export interface RegisterControllerMutationVariables {
  input: {
    boardName: string;
    layoutId: number;
    sizeId: number;
    setIds: string;
    name?: string;
  };
}

export interface RegisterControllerMutationResponse {
  registerController: {
    apiKey: string;
    controllerId: string;
  };
}

export const DELETE_CONTROLLER = gql`
  mutation DeleteController($controllerId: ID!) {
    deleteController(controllerId: $controllerId)
  }
`;

export interface DeleteControllerMutationVariables {
  controllerId: string;
}

export interface DeleteControllerMutationResponse {
  deleteController: boolean;
}
