export const climbTypeDefs = /* GraphQL */ `
  """
  A climbing problem/route on an interactive training board.
  Contains all information needed to display and light up the climb on the board.
  """
  type Climb {
    "Unique identifier for the climb"
    uuid: ID!
    "Layout ID the climb belongs to (used to identify cross-layout climbs)"
    layoutId: Int
    "Username of the person who created this climb"
    setter_username: String!
    "Name/title of the climb"
    name: String!
    "Description or notes about the climb"
    description: String!
    "Encoded hold positions and colors for lighting up the board"
    frames: String!
    "Board angle in degrees when this climb was set"
    angle: Int!
    "Number of people who have completed this climb"
    ascensionist_count: Int!
    "Difficulty grade of the climb (e.g., 'V5', '6B+')"
    difficulty: String!
    "Average quality rating from users"
    quality_average: String!
    "Star rating (0-3)"
    stars: Float!
    "Difficulty uncertainty/spread"
    difficulty_error: String!
    "Map of hold IDs to their lit-up state codes for board display"
    litUpHoldsMap: JSON!
    "Whether the climb should be displayed mirrored"
    mirrored: Boolean
    "Official benchmark difficulty if this is a benchmark climb"
    benchmark_difficulty: String
    "Number of times the current user has sent this climb"
    userAscents: Int
    "Number of times the current user has attempted this climb"
    userAttempts: Int
    "Board type this climb belongs to (e.g. 'kilter', 'tension'). Populated in multi-board contexts."
    boardType: String
  }

  """
  Input type for creating or updating a climb.
  """
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

  # ============================================
  # Climb Search Types
  # ============================================

  """
  Input parameters for searching climbs.
  Supports filtering, sorting, and pagination.
  """
  input ClimbSearchInput {
    "Board type (e.g., 'kilter', 'tension')"
    boardName: String!
    "Layout ID"
    layoutId: Int!
    "Size ID"
    sizeId: Int!
    "Comma-separated set IDs"
    setIds: String!
    "Board angle in degrees"
    angle: Int!
    "Page number for pagination (1-indexed)"
    page: Int
    "Number of results per page"
    pageSize: Int
    "Grade accuracy filter ('tight', 'moderate', 'loose')"
    gradeAccuracy: String
    "Minimum difficulty grade ID"
    minGrade: Int
    "Maximum difficulty grade ID"
    maxGrade: Int
    "Minimum number of ascents"
    minAscents: Int
    "Field to sort by ('ascents', 'difficulty', 'name', 'quality', 'popular')"
    sortBy: String
    "Sort direction ('asc' or 'desc')"
    sortOrder: String
    "Filter by climb name (partial match)"
    name: String
    "Filter by setter usernames"
    setter: [String!]
    "Filter by setter ID"
    setterId: Int
    "Only show benchmark climbs"
    onlyBenchmarks: Boolean
    "Only show tall/steep climbs"
    onlyTallClimbs: Boolean
    "Hold filter object: { holdId: 'ANY' | 'NOT', ... }"
    holdsFilter: JSON
    "Hide climbs the user has attempted (requires auth)"
    hideAttempted: Boolean
    "Hide climbs the user has completed (requires auth)"
    hideCompleted: Boolean
    "Only show climbs the user has attempted (requires auth)"
    showOnlyAttempted: Boolean
    "Only show climbs the user has completed (requires auth)"
    showOnlyCompleted: Boolean
  }

  """
  Result of a climb search query.
  """
  type ClimbSearchResult {
    "List of climbs matching the search criteria"
    climbs: [Climb!]!
    "Total number of climbs matching (for pagination)"
    totalCount: Int!
    "Whether there are more results available"
    hasMore: Boolean!
  }
`;
