export const boardConfigTypeDefs = /* GraphQL */ `
  # ============================================
  # Board Configuration Types
  # ============================================

  """
  A difficulty grade for a board type.
  """
  type Grade {
    "Numeric difficulty identifier"
    difficultyId: Int!
    "Human-readable grade name (e.g., 'V5', '6B+')"
    name: String!
  }

  """
  A supported board angle.
  """
  type Angle {
    "Angle in degrees"
    angle: Int!
  }
`;
