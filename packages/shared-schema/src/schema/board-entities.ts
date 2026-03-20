export const boardEntitiesTypeDefs = /* GraphQL */ `
  # ============================================
  # Board Entity Types
  # ============================================

  """
  A named physical board installation (board type + layout + size + hold sets).
  """
  type UserBoard {
    "Unique identifier"
    uuid: ID!
    "URL slug for this board"
    slug: String!
    "Owner user ID"
    ownerId: ID!
    "Owner display name"
    ownerDisplayName: String
    "Owner avatar URL"
    ownerAvatarUrl: String
    "Board type (kilter, tension, moonboard)"
    boardType: String!
    "Layout ID"
    layoutId: Int!
    "Size ID"
    sizeId: Int!
    "Comma-separated set IDs"
    setIds: String!
    "Board name"
    name: String!
    "Optional description"
    description: String
    "Location name"
    locationName: String
    "GPS latitude"
    latitude: Float
    "GPS longitude"
    longitude: Float
    "Whether publicly visible"
    isPublic: Boolean!
    "Whether the user owns the physical board"
    isOwned: Boolean!
    "Default angle for this board"
    angle: Int!
    "Whether the board's angle is physically adjustable"
    isAngleAdjustable: Boolean!
    "When created"
    createdAt: String!
    "Human-readable layout name"
    layoutName: String
    "Human-readable size name"
    sizeName: String
    "Human-readable size description"
    sizeDescription: String
    "Human-readable set names"
    setNames: [String!]
    "Total ascents on this board"
    totalAscents: Int!
    "Number of unique climbers"
    uniqueClimbers: Int!
    "Number of followers"
    followerCount: Int!
    "Number of comments"
    commentCount: Int!
    "Whether the current user follows this board"
    isFollowedByMe: Boolean!
    "Gym ID if linked to a gym"
    gymId: Int
    "Gym UUID if linked to a gym"
    gymUuid: String
    "Gym name if linked to a gym"
    gymName: String
  }

  """
  Paginated list of boards.
  """
  type UserBoardConnection {
    "List of boards"
    boards: [UserBoard!]!
    "Total number of boards"
    totalCount: Int!
    "Whether more boards are available"
    hasMore: Boolean!
  }

  """
  A leaderboard entry for a board.
  """
  type BoardLeaderboardEntry {
    "User ID"
    userId: ID!
    "Display name"
    userDisplayName: String
    "Avatar URL"
    userAvatarUrl: String
    "Rank on the leaderboard"
    rank: Int!
    "Total sends (flash + send)"
    totalSends: Int!
    "Total flashes"
    totalFlashes: Int!
    "Hardest grade sent (difficulty ID)"
    hardestGrade: Int
    "Human-readable hardest grade name"
    hardestGradeName: String
    "Total sessions"
    totalSessions: Int!
  }

  """
  Board leaderboard result.
  """
  type BoardLeaderboard {
    "Board UUID"
    boardUuid: ID!
    "Leaderboard entries"
    entries: [BoardLeaderboardEntry!]!
    "Total number of entries"
    totalCount: Int!
    "Whether more entries are available"
    hasMore: Boolean!
    "Label for the time period"
    periodLabel: String!
  }

  """
  Input for creating a board.
  """
  input CreateBoardInput {
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int!
    "Size ID"
    sizeId: Int!
    "Comma-separated set IDs"
    setIds: String!
    "Board name"
    name: String!
    "Optional description"
    description: String
    "Location name"
    locationName: String
    "GPS latitude"
    latitude: Float
    "GPS longitude"
    longitude: Float
    "Whether publicly visible (default true)"
    isPublic: Boolean
    "Whether user owns the physical board (default true)"
    isOwned: Boolean
    "Optional gym UUID to link board to"
    gymUuid: String
    "Default angle for this board (default 40)"
    angle: Int
    "Whether the board's angle is physically adjustable (default true)"
    isAngleAdjustable: Boolean
  }

  """
  Input for updating a board.
  """
  input UpdateBoardInput {
    "Board UUID to update"
    boardUuid: ID!
    "New name"
    name: String
    "New slug"
    slug: String
    "New description"
    description: String
    "New location name"
    locationName: String
    "New GPS latitude"
    latitude: Float
    "New GPS longitude"
    longitude: Float
    "New visibility"
    isPublic: Boolean
    "New ownership flag"
    isOwned: Boolean
    "New default angle"
    angle: Int
    "New angle adjustable flag"
    isAngleAdjustable: Boolean
  }

  """
  Input for board leaderboard query.
  """
  input BoardLeaderboardInput {
    "Board UUID"
    boardUuid: ID!
    "Time period (week, month, year, all)"
    period: String
    "Max entries to return"
    limit: Int
    "Offset for pagination"
    offset: Int
  }

  """
  Input for listing user's boards.
  """
  input MyBoardsInput {
    "Max boards to return"
    limit: Int
    "Offset for pagination"
    offset: Int
  }

  """
  Input for following/unfollowing a board.
  """
  input FollowBoardInput {
    "Board UUID"
    boardUuid: ID!
  }

  """
  Input for searching boards.
  """
  input SearchBoardsInput {
    "Search query"
    query: String
    "Filter by board type"
    boardType: String
    "Latitude for proximity search"
    latitude: Float
    "Longitude for proximity search"
    longitude: Float
    "Radius in km for proximity search (default 50)"
    radiusKm: Float
    "Max results to return"
    limit: Int
    "Offset for pagination"
    offset: Int
  }
`;
