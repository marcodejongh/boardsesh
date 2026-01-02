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
    sequence: Int!
    stateHash: String!
    queue: [ClimbQueueItem!]!
    currentClimbQueueItem: ClimbQueueItem
  }

  # Response for delta sync event replay (Phase 2)
  type EventsReplayResponse {
    events: [QueueEvent!]!
    currentSequence: Int!
  }

  type Session {
    id: ID!
    name: String
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
    isActive: Boolean!
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
    onlyTallClimbs: Boolean
    # Hold filters (JSON object: { "holdId": "ANY" | "NOT", ... })
    holdsFilter: JSON
    # Personal progress filters (require auth)
    hideAttempted: Boolean
    hideCompleted: Boolean
    showOnlyAttempted: Boolean
    showOnlyCompleted: Boolean
  }

  type ClimbSearchResult {
    climbs: [Climb!]!
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

  # ============================================
  # Ticks Types (Local Ascent Tracking)
  # ============================================

  enum TickStatus {
    flash
    send
    attempt
  }

  type Tick {
    uuid: ID!
    userId: ID!
    boardType: String!
    climbUuid: String!
    angle: Int!
    isMirror: Boolean!
    status: TickStatus!
    attemptCount: Int!
    quality: Int
    difficulty: Int
    isBenchmark: Boolean!
    comment: String!
    climbedAt: String!
    createdAt: String!
    updatedAt: String!
    sessionId: String
    auroraType: String
    auroraId: String
    auroraSyncedAt: String
    layoutId: Int
  }

  input SaveTickInput {
    boardType: String!
    climbUuid: String!
    angle: Int!
    isMirror: Boolean!
    status: TickStatus!
    attemptCount: Int!
    quality: Int
    difficulty: Int
    isBenchmark: Boolean!
    comment: String!
    climbedAt: String!
    sessionId: String
  }

  input GetTicksInput {
    boardType: String!
    climbUuids: [String!]
  }

  # ============================================
  # Activity Feed Types
  # ============================================

  # A feed item representing a climb ascent with enriched data
  type AscentFeedItem {
    uuid: ID!
    climbUuid: String!
    climbName: String!
    setterUsername: String
    boardType: String!
    layoutId: Int
    angle: Int!
    isMirror: Boolean!
    status: TickStatus!
    attemptCount: Int!
    quality: Int
    difficulty: Int
    difficultyName: String
    isBenchmark: Boolean!
    comment: String!
    climbedAt: String!
    # Climb display data for thumbnails
    frames: String
  }

  type AscentFeedResult {
    items: [AscentFeedItem!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  input AscentFeedInput {
    limit: Int
    offset: Int
  }

  # ============================================
  # Playlist Types
  # ============================================

  type Playlist {
    id: ID!
    uuid: ID!
    boardType: String!
    layoutId: Int!
    name: String!
    description: String
    isPublic: Boolean!
    color: String
    icon: String
    createdAt: String!
    updatedAt: String!
    climbCount: Int!
    userRole: String
  }

  type PlaylistClimb {
    id: ID!
    playlistId: ID!
    climbUuid: String!
    angle: Int!
    position: Int!
    addedAt: String!
  }

  input CreatePlaylistInput {
    boardType: String!
    layoutId: Int!
    name: String!
    description: String
    color: String
    icon: String
  }

  input UpdatePlaylistInput {
    playlistId: ID!
    name: String
    description: String
    isPublic: Boolean
    color: String
    icon: String
  }

  input AddClimbToPlaylistInput {
    playlistId: ID!
    climbUuid: String!
    angle: Int!
  }

  input RemoveClimbFromPlaylistInput {
    playlistId: ID!
    climbUuid: String!
  }

  input GetUserPlaylistsInput {
    boardType: String!
    layoutId: Int!
  }

  input GetPlaylistsForClimbInput {
    boardType: String!
    layoutId: Int!
    climbUuid: String!
  }

  type Query {
    session(sessionId: ID!): Session
    # Get buffered events since a sequence number for delta sync (Phase 2)
    eventsReplay(sessionId: ID!, sinceSequence: Int!): EventsReplayResponse!
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
    # Get a single climb by UUID
    climb(
      boardName: String!
      layoutId: Int!
      sizeId: Int!
      setIds: String!
      angle: Int!
      climbUuid: ID!
    ): Climb

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

    # ============================================
    # Ticks Queries (require auth)
    # ============================================

    # Get current user's ticks (local ascent tracking)
    ticks(input: GetTicksInput!): [Tick!]!
    # Get public ticks for a specific user
    userTicks(userId: ID!, boardType: String!): [Tick!]!
    # Get public ascent activity feed for a specific user (all boards, with climb details)
    userAscentsFeed(userId: ID!, input: AscentFeedInput): AscentFeedResult!

    # ============================================
    # Playlist Queries (require auth)
    # ============================================

    # Get current user's playlists for a board+layout
    userPlaylists(input: GetUserPlaylistsInput!): [Playlist!]!
    # Get a specific playlist by ID (checks ownership/access)
    playlist(playlistId: ID!): Playlist
    # Get playlists that contain a specific climb
    playlistsForClimb(input: GetPlaylistsForClimbInput!): [ID!]!
  }

  type Mutation {
    joinSession(sessionId: ID!, boardPath: String!, username: String, avatarUrl: String, initialQueue: [ClimbQueueItemInput!], initialCurrentClimb: ClimbQueueItemInput, sessionName: String): Session!
    # Create a new session (optionally discoverable with GPS)
    createSession(input: CreateSessionInput!): Session!
    leaveSession: Boolean!
    endSession(sessionId: ID!): Boolean!
    updateUsername(username: String!, avatarUrl: String): Boolean!

    addQueueItem(item: ClimbQueueItemInput!, position: Int): ClimbQueueItem!
    removeQueueItem(uuid: ID!): Boolean!
    reorderQueueItem(uuid: ID!, oldIndex: Int!, newIndex: Int!): Boolean!
    setCurrentClimb(item: ClimbQueueItemInput, shouldAddToQueue: Boolean, correlationId: ID): ClimbQueueItem
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

    # ============================================
    # Ticks Mutations (require auth)
    # ============================================

    # Save a new tick (local ascent tracking)
    saveTick(input: SaveTickInput!): Tick!

    # ============================================
    # Playlist Mutations (require auth)
    # ============================================

    # Create a new playlist
    createPlaylist(input: CreatePlaylistInput!): Playlist!
    # Update playlist metadata
    updatePlaylist(input: UpdatePlaylistInput!): Playlist!
    # Delete a playlist (only owner can delete)
    deletePlaylist(playlistId: ID!): Boolean!
    # Add a climb to a playlist
    addClimbToPlaylist(input: AddClimbToPlaylistInput!): PlaylistClimb!
    # Remove a climb from a playlist
    removeClimbFromPlaylist(input: RemoveClimbFromPlaylistInput!): Boolean!
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
    sequence: Int!
    state: QueueState!
  }

  type QueueItemAdded {
    sequence: Int!
    item: ClimbQueueItem!
    position: Int
  }

  type QueueItemRemoved {
    sequence: Int!
    uuid: ID!
  }

  type QueueReordered {
    sequence: Int!
    uuid: ID!
    oldIndex: Int!
    newIndex: Int!
  }

  type CurrentClimbChanged {
    sequence: Int!
    item: ClimbQueueItem
    clientId: ID
    correlationId: ID
  }

  type ClimbMirrored {
    sequence: Int!
    mirrored: Boolean!
  }
`;
