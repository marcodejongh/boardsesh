import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '@boardsesh/shared-schema';
import { resolvers } from './resolvers/index';

// Create and export schema
export const schema = makeExecutableSchema({ typeDefs, resolvers });

// Re-export Yoga instance creator and context utilities
export { createYogaInstance } from './yoga';
export { createContext, updateContext, getContext } from './context';
