export const newClimbFeedTypeDefs = /* GraphQL */ `
  # ============================================
  # New Climb Feed & Subscriptions
  # ============================================

  type NewClimbSubscription {
    id: ID!
    boardType: String!
    layoutId: Int!
    createdAt: String!
  }

  input NewClimbSubscriptionInput {
    boardType: String!
    layoutId: Int!
  }

  type NewClimbFeedItem {
    uuid: ID!
    name: String
    boardType: String!
    layoutId: Int!
    setterDisplayName: String
    setterAvatarUrl: String
    angle: Int
    frames: String
    difficultyName: String
    createdAt: String!
  }

  type NewClimbFeedResult {
    items: [NewClimbFeedItem!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  input NewClimbFeedInput {
    boardType: String!
    layoutId: Int!
    limit: Int
    offset: Int
  }

  type NewClimbCreatedEvent {
    climb: NewClimbFeedItem!
  }

  input SaveClimbInput {
    boardType: String!
    layoutId: Int!
    name: String!
    description: String
    isDraft: Boolean!
    frames: String!
    framesCount: Int
    framesPace: Int
    angle: Int!
  }

  input SaveMoonBoardClimbInput {
    boardType: String!
    layoutId: Int!
    name: String!
    description: String
    holds: JSON!
    angle: Int!
    isDraft: Boolean
    userGrade: String
    isBenchmark: Boolean
    setter: String
  }

  type SaveClimbResult {
    uuid: ID!
    synced: Boolean!
  }
`;
