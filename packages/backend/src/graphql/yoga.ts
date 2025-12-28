import { createYoga } from 'graphql-yoga';
import { schema } from './resolvers.js';

/**
 * Create and configure the GraphQL Yoga instance
 *
 * Note: This Yoga instance is primarily used for HTTP GraphQL requests.
 * WebSocket subscriptions use graphql-ws directly with the same schema
 * to maintain protocol compatibility with the frontend.
 */
export function createYogaInstance() {
  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    // Disable GraphiQL in production
    graphiql: process.env.NODE_ENV !== 'production'
      ? {
          subscriptionsProtocol: 'WS',
        }
      : false,
    // Disable CORS - we handle it manually in the request router
    cors: false,
    // Logging
    logging: {
      debug: (...args) => console.log('[Yoga Debug]', ...args),
      info: (...args) => console.log('[Yoga Info]', ...args),
      warn: (...args) => console.warn('[Yoga Warn]', ...args),
      error: (...args) => console.error('[Yoga Error]', ...args),
    },
  });

  return yoga;
}
