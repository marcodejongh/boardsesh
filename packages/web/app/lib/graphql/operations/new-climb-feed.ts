import { gql } from 'graphql-request';
import type {
  NewClimbFeedInput,
  NewClimbFeedResult,
  NewClimbSubscription,
  NewClimbSubscriptionInput,
  NewClimbCreatedEvent,
  SaveClimbInput,
  SaveClimbResult,
  SaveMoonBoardClimbInput,
} from '@boardsesh/shared-schema';

export const GET_NEW_CLIMB_FEED = gql`
  query GetNewClimbFeed($input: NewClimbFeedInput!) {
    newClimbFeed(input: $input) {
      items {
        uuid
        name
        boardType
        layoutId
        setterDisplayName
        setterAvatarUrl
        angle
        frames
        difficultyName
        createdAt
      }
      totalCount
      hasMore
    }
  }
`;

export const GET_MY_NEW_CLIMB_SUBSCRIPTIONS = gql`
  query GetMyNewClimbSubscriptions {
    myNewClimbSubscriptions {
      id
      boardType
      layoutId
      createdAt
    }
  }
`;

export const SUBSCRIBE_NEW_CLIMBS = gql`
  mutation SubscribeNewClimbs($input: NewClimbSubscriptionInput!) {
    subscribeNewClimbs(input: $input)
  }
`;

export const UNSUBSCRIBE_NEW_CLIMBS = gql`
  mutation UnsubscribeNewClimbs($input: NewClimbSubscriptionInput!) {
    unsubscribeNewClimbs(input: $input)
  }
`;

export const NEW_CLIMB_CREATED_SUBSCRIPTION = gql`
  subscription OnNewClimbCreated($boardType: String!, $layoutId: Int!) {
    newClimbCreated(boardType: $boardType, layoutId: $layoutId) {
      climb {
        uuid
        name
        boardType
        layoutId
        setterDisplayName
        setterAvatarUrl
        angle
        frames
        difficultyName
        createdAt
      }
    }
  }
`;

export const SAVE_CLIMB_MUTATION = gql`
  mutation SaveClimb($input: SaveClimbInput!) {
    saveClimb(input: $input) {
      uuid
      synced
    }
  }
`;

export const SAVE_MOONBOARD_CLIMB_MUTATION = gql`
  mutation SaveMoonBoardClimb($input: SaveMoonBoardClimbInput!) {
    saveMoonBoardClimb(input: $input) {
      uuid
      synced
    }
  }
`;

export interface GetNewClimbFeedVariables {
  input: NewClimbFeedInput;
}

export interface GetNewClimbFeedResponse {
  newClimbFeed: NewClimbFeedResult;
}

export interface GetMyNewClimbSubscriptionsResponse {
  myNewClimbSubscriptions: NewClimbSubscription[];
}

export interface SubscribeNewClimbsVariables {
  input: NewClimbSubscriptionInput;
}

export interface SubscribeNewClimbsResponse {
  subscribeNewClimbs: boolean;
}

export interface UnsubscribeNewClimbsVariables {
  input: NewClimbSubscriptionInput;
}

export interface UnsubscribeNewClimbsResponse {
  unsubscribeNewClimbs: boolean;
}

export interface NewClimbCreatedSubscriptionPayload {
  newClimbCreated: NewClimbCreatedEvent;
}

export interface SaveClimbMutationVariables {
  input: SaveClimbInput;
}

export interface SaveClimbMutationResponse {
  saveClimb: SaveClimbResult;
}

export interface SaveMoonBoardClimbMutationVariables {
  input: SaveMoonBoardClimbInput;
}

export interface SaveMoonBoardClimbMutationResponse {
  saveMoonBoardClimb: SaveClimbResult;
}
