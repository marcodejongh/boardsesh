// GraphQL Schema for Boardsesh Queue Synchronization
// This schema is shared between the backend server and client

export const typeDefs = /* GraphQL */ `
  scalar JSON

  # ClimbStats contains mutable statistics that can change over time
  # These should be fetched separately from the immutable climb data
  type ClimbStats {
    climbUuid: ID!
    angle: Int!
    ascensionist_count: Int!
    difficulty: String!
    quality_average: String!
    stars: Float!
    difficulty_error: String!
    benchmark_difficulty: String
  }

  # Input type for ClimbStats (used in queue sync)
  input ClimbStatsInput {
    climbUuid: ID!
    angle: Int!
    ascensionist_count: Int!
    difficulty: String!
    quality_average: String!
    stars: Float!
    difficulty_error: String!
    benchmark_difficulty: String
  }

  # Climb contains immutable data that never changes after creation
  # Stats are fetched separately via the climbStats query
  type Climb {
    uuid: ID!
    setter_username: String!
    name: String!
    description: String!
    frames: String!
    angle: Int!
    litUpHoldsMap: JSON!
    mirrored: Boolean
    # User-specific fields (require auth)
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
    litUpHoldsMap: JSON!
    mirrored: Boolean
    userAscents: Int
    userAttempts: Int
  }

  # ClimbWithStats combines climb data with stats for convenience
  # Used in queue items where we need both together
  type ClimbWithStats {
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

  input ClimbWithStatsInput {
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
    climb: ClimbWithStats!
    addedBy: String
    addedByUser: QueueItemUser
    tickedBy: [String!]
    suggested: Boolean
  }

  input ClimbQueueItemInput {
    uuid: ID!
    climb: ClimbWithStatsInput!
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

  # ============================================
  # Board Configuration Types
  # ============================================

  type Grade {
    difficultyId: Int!
    name: String!
  }

  type Angle {
    angle: Int!
  }

  # ============================================
  # Climb Search Types
  # ============================================

  input ClimbSearchInput {
    boardName: String!
    layoutId: Int!
    sizeId: Int!
    setIds: String!
    angle: Int!
    # Pagination
    page: Int
    pageSize: Int
    # Filters
    gradeAccuracy: String
    minGrade: Int
    maxGrade: Int
    minAscents: Int
    sortBy: String
    sortOrder: String
    name: String
    setter: [String!]
    setterId: Int
    onlyBenchmarks: Boolean
    # Personal progress filters (require auth)
    hideAttempted: Boolean
    hideCompleted: Boolean
    showOnlyAttempted: Boolean
    showOnlyCompleted: Boolean
  }

  type ClimbSearchResult {
    climbs: [ClimbWithStats!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  # ============================================
  # User Management Types
  # ============================================

  type UserProfile {
    id: ID!
    email: String!
    displayName: String
    avatarUrl: String
  }

  input UpdateProfileInput {
    displayName: String
    avatarUrl: String
  }

  type AuroraCredential {
    boardType: String!
    username: String!
    userId: Int
    syncedAt: String
    token: String
  }

  type AuroraCredentialStatus {
    boardType: String!
    username: String!
    userId: Int
    syncedAt: String
    hasToken: Boolean!
  }

  input SaveAuroraCredentialInput {
    boardType: String!
    username: String!
    password: String!
  }

  # ============================================
  # Favorites Types
  # ============================================

  input ToggleFavoriteInput {
    boardName: String!
    climbUuid: String!
    angle: Int!
  }

  type ToggleFavoriteResult {
    favorited: Boolean!
  }

  type Query {
    session(sessionId: ID!): Session
    # Find discoverable sessions near a location
    nearbySessions(latitude: Float!, longitude: Float!, radiusMeters: Float): [DiscoverableSession!]!
    # Get current user's recent sessions (requires auth context)
    mySessions: [DiscoverableSession!]!

    # ============================================
    # Board Configuration Queries
    # ============================================

    # Get difficulty grades for a board type
    grades(boardName: String!): [Grade!]!
    # Get available angles for a board layout
    angles(boardName: String!, layoutId: Int!): [Angle!]!

    # ============================================
    # Climb Queries
    # ============================================

    # Search climbs with filtering and pagination
    searchClimbs(input: ClimbSearchInput!): ClimbSearchResult!
    # Get a single climb by UUID (includes stats)
    climb(
      boardName: String!
      layoutId: Int!
      sizeId: Int!
      setIds: String!
      angle: Int!
      climbUuid: ID!
    ): ClimbWithStats
    # Batch fetch stats for multiple climbs - returns stats keyed by climbUuid
    # Can be fetched more frequently than immutable climb data
    climbStats(
      boardName: String!
      angle: Int!
      climbUuids: [ID!]!
    ): [ClimbStats!]!

    # ============================================
    # User Management Queries (require auth)
    # ============================================

    # Get current user's profile
    profile: UserProfile
    # Get all Aurora credentials status for current user
    auroraCredentials: [AuroraCredentialStatus!]!
    # Get Aurora credential for a specific board type
    auroraCredential(boardType: String!): AuroraCredential

    # ============================================
    # Favorites Queries
    # ============================================

    # Check which climbs from a list are favorited (returns favorited UUIDs)
    favorites(boardName: String!, climbUuids: [String!]!, angle: Int!): [String!]!
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

    # ============================================
    # User Management Mutations (require auth)
    # ============================================

    # Update current user's profile
    updateProfile(input: UpdateProfileInput!): UserProfile!

    # ============================================
    # Aurora Credentials Mutations (require auth)
    # ============================================

    # Save Aurora climbing credentials (validates with Aurora API)
    saveAuroraCredential(input: SaveAuroraCredentialInput!): AuroraCredentialStatus!
    # Delete Aurora credentials for a board type
    deleteAuroraCredential(boardType: String!): Boolean!

    # ============================================
    # Favorites Mutations (require auth)
    # ============================================

    # Toggle favorite status for a climb (add or remove)
    toggleFavorite(input: ToggleFavoriteInput!): ToggleFavoriteResult!
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
