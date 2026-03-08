export const playlistsTypeDefs = /* GraphQL */ `
  # ============================================
  # Playlist Types
  # ============================================

  """
  A user-created collection of climbs.
  """
  type Playlist {
    "Database ID"
    id: ID!
    "Unique identifier"
    uuid: ID!
    "Board type"
    boardType: String!
    "Layout ID (null for Aurora-synced circuits)"
    layoutId: Int
    "Playlist name"
    name: String!
    "Optional description"
    description: String
    "Whether publicly visible"
    isPublic: Boolean!
    "Display color"
    color: String
    "Display icon"
    icon: String
    "When created (ISO 8601)"
    createdAt: String!
    "When last updated (ISO 8601)"
    updatedAt: String!
    "When last accessed/viewed (ISO 8601)"
    lastAccessedAt: String
    "Number of climbs in playlist"
    climbCount: Int!
    "Current user's role (owner/editor/viewer)"
    userRole: String
    "Number of users following this playlist"
    followerCount: Int!
    "Whether the current user follows this playlist"
    isFollowedByMe: Boolean!
  }

  """
  Count of favorited climbs per board.
  """
  type FavoritesCount {
    "Board name"
    boardName: String!
    "Number of favorited climbs"
    count: Int!
  }

  """
  A climb within a playlist.
  """
  type PlaylistClimb {
    "Database ID"
    id: ID!
    "Playlist ID"
    playlistId: ID!
    "UUID of the climb"
    climbUuid: String!
    "Board angle (null for Aurora circuits)"
    angle: Int
    "Position in playlist"
    position: Int!
    "When added (ISO 8601)"
    addedAt: String!
  }

  """
  Input for creating a playlist.
  """
  input CreatePlaylistInput {
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int!
    "Playlist name"
    name: String!
    "Optional description"
    description: String
    "Display color"
    color: String
    "Display icon"
    icon: String
  }

  """
  Input for updating a playlist.
  """
  input UpdatePlaylistInput {
    "Playlist ID to update"
    playlistId: ID!
    "New name"
    name: String
    "New description"
    description: String
    "New visibility setting"
    isPublic: Boolean
    "New color"
    color: String
    "New icon"
    icon: String
  }

  """
  Input for adding a climb to a playlist.
  """
  input AddClimbToPlaylistInput {
    "Target playlist ID"
    playlistId: ID!
    "Climb UUID to add"
    climbUuid: String!
    "Board angle for this entry"
    angle: Int!
  }

  """
  Input for removing a climb from a playlist.
  """
  input RemoveClimbFromPlaylistInput {
    "Playlist ID"
    playlistId: ID!
    "Climb UUID to remove"
    climbUuid: String!
  }

  """
  Input for getting user's playlists.
  """
  input GetUserPlaylistsInput {
    "Filter by board type"
    boardType: String!
    "Filter by layout ID"
    layoutId: Int!
  }

  """
  Input for getting all user's playlists across boards.
  """
  input GetAllUserPlaylistsInput {
    "Optional filter by board type"
    boardType: String
    "Optional filter by layout ID (includes playlists with null layoutId)"
    layoutId: Int
  }

  """
  Input for getting playlists containing a climb.
  """
  input GetPlaylistsForClimbInput {
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int!
    "Climb UUID to search for"
    climbUuid: String!
  }

  """
  Input for getting playlists containing multiple climbs (batch).
  """
  input GetPlaylistsForClimbsInput {
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int!
    "Climb UUIDs to search for"
    climbUuids: [String!]!
  }

  """
  Playlist membership for a single climb in a batch query.
  """
  type ClimbPlaylistMembership {
    "Climb UUID"
    climbUuid: String!
    "UUIDs of playlists containing this climb"
    playlistUuids: [ID!]!
  }

  """
  Input for getting climbs in a playlist with full data.
  """
  input GetPlaylistClimbsInput {
    "Playlist ID"
    playlistId: ID!
    "Board name for climb lookup (omit for all-boards mode)"
    boardName: String
    "Layout ID"
    layoutId: Int
    "Size ID"
    sizeId: Int
    "Set IDs"
    setIds: String
    "Board angle"
    angle: Int
    "Page number"
    page: Int
    "Page size"
    pageSize: Int
  }

  """
  Result of fetching playlist climbs.
  """
  type PlaylistClimbsResult {
    "List of climbs with full data"
    climbs: [Climb!]!
    "Total count"
    totalCount: Int!
    "Whether more are available"
    hasMore: Boolean!
  }

  """
  A user who has created public playlists.
  """
  type PlaylistCreator {
    "User ID"
    userId: ID!
    "Display name"
    displayName: String!
    "Number of public playlists"
    playlistCount: Int!
  }

  """
  A public playlist with creator information.
  """
  type DiscoverablePlaylist {
    "Database ID"
    id: ID!
    "Unique identifier"
    uuid: ID!
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int
    "Playlist name"
    name: String!
    "Description"
    description: String
    "Display color"
    color: String
    "Display icon"
    icon: String
    "When created"
    createdAt: String!
    "When last updated"
    updatedAt: String!
    "Number of climbs"
    climbCount: Int!
    "Creator's user ID"
    creatorId: ID!
    "Creator's display name"
    creatorName: String!
  }

  """
  Input for discovering public playlists.
  """
  input DiscoverPlaylistsInput {
    "Board type (optional — omit to discover across all boards)"
    boardType: String
    "Layout ID (optional — omit to discover across all layouts)"
    layoutId: Int
    "Filter by name (partial match)"
    name: String
    "Filter by creator IDs"
    creatorIds: [ID!]
    "Sort by: 'recent' (default) or 'popular'"
    sortBy: String
    "Page number"
    page: Int
    "Page size"
    pageSize: Int
  }

  """
  Result of playlist discovery.
  """
  type DiscoverPlaylistsResult {
    "List of playlists"
    playlists: [DiscoverablePlaylist!]!
    "Total count"
    totalCount: Int!
    "Whether more are available"
    hasMore: Boolean!
  }

  """
  Input for searching playlists globally.
  """
  input SearchPlaylistsInput {
    "Search query"
    query: String!
    "Optional board type filter"
    boardType: String
    "Max results to return"
    limit: Int
    "Offset for pagination"
    offset: Int
  }

  """
  Result of global playlist search.
  """
  type SearchPlaylistsResult {
    "List of playlists"
    playlists: [DiscoverablePlaylist!]!
    "Total count"
    totalCount: Int!
    "Whether more are available"
    hasMore: Boolean!
  }

  """
  Input for getting playlist creators.
  """
  input GetPlaylistCreatorsInput {
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int!
    "Search query for autocomplete"
    searchQuery: String
  }

  """
  Input for getting user's favorite climbs with full data.
  """
  input GetUserFavoriteClimbsInput {
    "Board type"
    boardName: String!
    "Layout ID"
    layoutId: Int!
    "Size ID"
    sizeId: Int!
    "Set IDs"
    setIds: String!
    "Board angle"
    angle: Int!
    "Page number"
    page: Int
    "Page size"
    pageSize: Int
  }
`;
