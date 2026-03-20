export const trendingTypeDefs = /* GraphQL */ `
  # ============================================
  # Trending & Hot Climbs Feed
  # ============================================

  type TrendingClimbItem {
    climbUuid: String!
    climbName: String!
    setterUsername: String
    boardType: String!
    layoutId: Int!
    angle: Int!
    frames: String
    difficultyName: String
    qualityAverage: Float
    currentAscents: Int!
    ascentDelta: Int!
    ascentPctChange: Float
  }

  type TrendingClimbFeedResult {
    items: [TrendingClimbItem!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  input TrendingClimbFeedInput {
    limit: Int
    offset: Int
    boardUuid: String
    timePeriodDays: Int
  }
`;
