export const favoritesTypeDefs = /* GraphQL */ `
  # ============================================
  # Favorites Types
  # ============================================

  """
  Input for toggling a climb as favorite.
  """
  input ToggleFavoriteInput {
    "Board type"
    boardName: String!
    "Climb UUID to favorite/unfavorite"
    climbUuid: String!
    "Board angle"
    angle: Int!
  }

  """
  Result of toggling favorite status.
  """
  type ToggleFavoriteResult {
    "Whether the climb is now favorited"
    favorited: Boolean!
  }
`;
