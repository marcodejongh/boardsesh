export const profileStatsTypeDefs = /* GraphQL */ `
  # ============================================
  # Profile Statistics Types
  # ============================================

  """
  Count of distinct climbs at a specific grade.
  """
  type GradeCount {
    "Grade name"
    grade: String!
    "Number of distinct climbs sent at this grade"
    count: Int!
  }

  """
  Statistics for a specific board layout.
  """
  type LayoutStats {
    "Unique key for this layout configuration"
    layoutKey: String!
    "Board type"
    boardType: String!
    "Layout ID"
    layoutId: Int
    "Total distinct climbs sent"
    distinctClimbCount: Int!
    "Breakdown by grade"
    gradeCounts: [GradeCount!]!
  }

  """
  Aggregated profile statistics across all boards.
  """
  type ProfileStats {
    "Total distinct climbs sent across all boards"
    totalDistinctClimbs: Int!
    "Per-layout statistics"
    layoutStats: [LayoutStats!]!
  }
`;
