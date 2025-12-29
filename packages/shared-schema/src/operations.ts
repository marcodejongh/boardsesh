// GraphQL Operations for Boardsesh Queue Client
// These operations are used by the web app to communicate with the backend

// Fragment for reusable climb fields
const CLIMB_FIELDS = `
  uuid
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
  mirrored
  benchmark_difficulty
  userAscents
  userAttempts
`;

const QUEUE_ITEM_USER_FIELDS = `
  id
  username
  avatarUrl
`;

const QUEUE_ITEM_FIELDS = `
  uuid
  climb {
    ${CLIMB_FIELDS}
  }
  addedBy
  addedByUser {
    ${QUEUE_ITEM_USER_FIELDS}
  }
  tickedBy
  suggested
`;

// Mutations
export const JOIN_SESSION = `
  mutation JoinSession($sessionId: ID!, $boardPath: String!, $username: String, $avatarUrl: String) {
    joinSession(sessionId: $sessionId, boardPath: $boardPath, username: $username, avatarUrl: $avatarUrl) {
      id
      boardPath
      clientId
      isLeader
      users {
        id
        username
        isLeader
        avatarUrl
      }
      queueState {
        queue {
          ${QUEUE_ITEM_FIELDS}
        }
        currentClimbQueueItem {
          ${QUEUE_ITEM_FIELDS}
        }
      }
    }
  }
`;

export const LEAVE_SESSION = `
  mutation LeaveSession {
    leaveSession
  }
`;

export const UPDATE_USERNAME = `
  mutation UpdateUsername($username: String!, $avatarUrl: String) {
    updateUsername(username: $username, avatarUrl: $avatarUrl)
  }
`;

export const ADD_QUEUE_ITEM = `
  mutation AddQueueItem($item: ClimbQueueItemInput!, $position: Int) {
    addQueueItem(item: $item, position: $position) {
      ${QUEUE_ITEM_FIELDS}
    }
  }
`;

export const REMOVE_QUEUE_ITEM = `
  mutation RemoveQueueItem($uuid: ID!) {
    removeQueueItem(uuid: $uuid)
  }
`;

export const REORDER_QUEUE_ITEM = `
  mutation ReorderQueueItem($uuid: ID!, $oldIndex: Int!, $newIndex: Int!) {
    reorderQueueItem(uuid: $uuid, oldIndex: $oldIndex, newIndex: $newIndex)
  }
`;

export const SET_CURRENT_CLIMB = `
  mutation SetCurrentClimb($item: ClimbQueueItemInput, $shouldAddToQueue: Boolean) {
    setCurrentClimb(item: $item, shouldAddToQueue: $shouldAddToQueue) {
      ${QUEUE_ITEM_FIELDS}
    }
  }
`;

export const MIRROR_CURRENT_CLIMB = `
  mutation MirrorCurrentClimb($mirrored: Boolean!) {
    mirrorCurrentClimb(mirrored: $mirrored) {
      ${QUEUE_ITEM_FIELDS}
    }
  }
`;

export const SET_QUEUE = `
  mutation SetQueue($queue: [ClimbQueueItemInput!]!, $currentClimbQueueItem: ClimbQueueItemInput) {
    setQueue(queue: $queue, currentClimbQueueItem: $currentClimbQueueItem) {
      queue {
        ${QUEUE_ITEM_FIELDS}
      }
      currentClimbQueueItem {
        ${QUEUE_ITEM_FIELDS}
      }
    }
  }
`;

export const CREATE_SESSION = `
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
      id
      boardPath
      clientId
      isLeader
      users {
        id
        username
        isLeader
        avatarUrl
      }
      queueState {
        queue {
          ${QUEUE_ITEM_FIELDS}
        }
        currentClimbQueueItem {
          ${QUEUE_ITEM_FIELDS}
        }
      }
    }
  }
`;

// Subscriptions
export const SESSION_UPDATES = `
  subscription SessionUpdates($sessionId: ID!) {
    sessionUpdates(sessionId: $sessionId) {
      __typename
      ... on UserJoined {
        user {
          id
          username
          isLeader
          avatarUrl
        }
      }
      ... on UserLeft {
        userId
      }
      ... on LeaderChanged {
        leaderId
      }
      ... on SessionEnded {
        reason
        newPath
      }
    }
  }
`;

export const QUEUE_UPDATES = `
  subscription QueueUpdates($sessionId: ID!) {
    queueUpdates(sessionId: $sessionId) {
      __typename
      ... on FullSync {
        state {
          queue {
            ${QUEUE_ITEM_FIELDS}
          }
          currentClimbQueueItem {
            ${QUEUE_ITEM_FIELDS}
          }
        }
      }
      ... on QueueItemAdded {
        addedItem: item {
          ${QUEUE_ITEM_FIELDS}
        }
        position
      }
      ... on QueueItemRemoved {
        uuid
      }
      ... on QueueReordered {
        uuid
        oldIndex
        newIndex
      }
      ... on CurrentClimbChanged {
        currentItem: item {
          ${QUEUE_ITEM_FIELDS}
        }
      }
      ... on ClimbMirrored {
        mirrored
      }
    }
  }
`;
