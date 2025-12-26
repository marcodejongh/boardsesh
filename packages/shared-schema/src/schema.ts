// GraphQL Schema for Boardsesh Queue Synchronization
// This schema is shared between the backend server and client

export const typeDefs = /* GraphQL */ `
  scalar JSON

  type Climb {
    uuid: ID!
    setter_username: String!
    name: String!
    description: String!
    frames: String!
    angle: Int!
    ascensionist_count: Int!
    difficulty: String!
    quality_average: String!
    stars: Float!
    difficulty_error: String!
    litUpHoldsMap: JSON!
    mirrored: Boolean
    benchmark_difficulty: String
    userAscents: Int
    userAttempts: Int
  }

  input ClimbInput {
    uuid: ID!
    setter_username: String!
    name: String!
    description: String!
    frames: String!
    angle: Int!
    ascensionist_count: Int!
    difficulty: String!
    quality_average: String!
    stars: Float!
    difficulty_error: String!
    litUpHoldsMap: JSON!
    mirrored: Boolean
    benchmark_difficulty: String
    userAscents: Int
    userAttempts: Int
  }

  type QueueItemUser {
    id: ID!
    username: String!
    avatarUrl: String
  }

  input QueueItemUserInput {
    id: ID!
    username: String!
    avatarUrl: String
  }

  type ClimbQueueItem {
    uuid: ID!
    climb: Climb!
    addedBy: String
    addedByUser: QueueItemUser
    tickedBy: [String!]
    suggested: Boolean
  }

  input ClimbQueueItemInput {
    uuid: ID!
    climb: ClimbInput!
    addedBy: String
    addedByUser: QueueItemUserInput
    tickedBy: [String!]
    suggested: Boolean
  }

  type SessionUser {
    id: ID!
    username: String!
    isLeader: Boolean!
    avatarUrl: String
  }

  type QueueState {
    queue: [ClimbQueueItem!]!
    currentClimbQueueItem: ClimbQueueItem
  }

  type Session {
    id: ID!
    boardPath: String!
    users: [SessionUser!]!
    queueState: QueueState!
    isLeader: Boolean!
    clientId: ID!
  }

  # Discoverable session for GPS-based discovery
  type DiscoverableSession {
    id: ID!
    name: String
    boardPath: String!
    latitude: Float!
    longitude: Float!
    createdAt: String!
    createdByUserId: ID
    participantCount: Int!
    distance: Float
  }

  # Input for creating a session
  input CreateSessionInput {
    boardPath: String!
    latitude: Float!
    longitude: Float!
    name: String
    discoverable: Boolean!
  }

  type Query {
    session(sessionId: ID!): Session
    # Find discoverable sessions near a location
    nearbySessions(latitude: Float!, longitude: Float!, radiusMeters: Float): [DiscoverableSession!]!
    # Get current user's recent sessions (requires auth context)
    mySessions: [DiscoverableSession!]!
  }

  type Mutation {
    joinSession(sessionId: ID!, boardPath: String!, username: String, avatarUrl: String): Session!
    # Create a new session (optionally discoverable with GPS)
    createSession(input: CreateSessionInput!): Session!
    leaveSession: Boolean!
    updateUsername(username: String!, avatarUrl: String): Boolean!

    addQueueItem(item: ClimbQueueItemInput!, position: Int): ClimbQueueItem!
    removeQueueItem(uuid: ID!): Boolean!
    reorderQueueItem(uuid: ID!, oldIndex: Int!, newIndex: Int!): Boolean!
    setCurrentClimb(item: ClimbQueueItemInput, shouldAddToQueue: Boolean): ClimbQueueItem
    mirrorCurrentClimb(mirrored: Boolean!): ClimbQueueItem
    replaceQueueItem(uuid: ID!, item: ClimbQueueItemInput!): ClimbQueueItem!
    setQueue(queue: [ClimbQueueItemInput!]!, currentClimbQueueItem: ClimbQueueItemInput): QueueState!
  }

  type Subscription {
    sessionUpdates(sessionId: ID!): SessionEvent!
    queueUpdates(sessionId: ID!): QueueEvent!
  }

  # Session Events
  union SessionEvent = UserJoined | UserLeft | LeaderChanged | SessionEnded

  type UserJoined {
    user: SessionUser!
  }

  type UserLeft {
    userId: ID!
  }

  type LeaderChanged {
    leaderId: ID!
  }

  type SessionEnded {
    reason: String!
    newPath: String
  }

  # Queue Events
  union QueueEvent =
      FullSync
    | QueueItemAdded
    | QueueItemRemoved
    | QueueReordered
    | CurrentClimbChanged
    | ClimbMirrored

  type FullSync {
    state: QueueState!
  }

  type QueueItemAdded {
    item: ClimbQueueItem!
    position: Int
  }

  type QueueItemRemoved {
    uuid: ID!
  }

  type QueueReordered {
    uuid: ID!
    oldIndex: Int!
    newIndex: Int!
  }

  type CurrentClimbChanged {
    item: ClimbQueueItem
  }

  type ClimbMirrored {
    mirrored: Boolean!
  }
`;
