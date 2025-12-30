import GraphQLJSON from 'graphql-type-json';

// Import domain resolvers
import { boardQueries } from './board/queries.js';
import { tickQueries } from './ticks/queries.js';
import { tickMutations } from './ticks/mutations.js';
import { userQueries } from './users/queries.js';
import { userMutations } from './users/mutations.js';
import { climbQueries } from './climbs/queries.js';
import { climbFieldResolvers } from './climbs/field-resolvers.js';
import { favoriteQueries } from './favorites/queries.js';
import { favoriteMutations } from './favorites/mutations.js';
import { sessionQueries } from './sessions/queries.js';
import { sessionMutations } from './sessions/mutations.js';
import { sessionSubscriptions } from './sessions/subscriptions.js';
import { sessionEventResolver } from './sessions/type-resolvers.js';
import { queueMutations } from './queue/mutations.js';
import { queueSubscriptions } from './queue/subscriptions.js';
import { queueEventResolver } from './queue/type-resolvers.js';

export const resolvers = {
  // Scalar types
  JSON: GraphQLJSON,

  // Root operation types
  Query: {
    ...sessionQueries,
    ...boardQueries,
    ...climbQueries,
    ...tickQueries,
    ...userQueries,
    ...favoriteQueries,
  },

  Mutation: {
    ...sessionMutations,
    ...queueMutations,
    ...tickMutations,
    ...userMutations,
    ...favoriteMutations,
  },

  Subscription: {
    ...sessionSubscriptions,
    ...queueSubscriptions,
  },

  // Field-level resolvers
  ClimbSearchResult: climbFieldResolvers,

  // Union type resolvers
  QueueEvent: queueEventResolver,
  SessionEvent: sessionEventResolver,
};
