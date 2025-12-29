import { createYoga } from 'graphql-yoga';
import type { IncomingMessage } from 'http';
import { schema } from './resolvers.js';
import { validateNextAuthToken } from '../middleware/auth.js';
import { createContext } from './context.js';
import type { ConnectionContext } from '@boardsesh/shared-schema';

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
    // Context function - extract auth from HTTP requests
    context: async ({ request }): Promise<ConnectionContext> => {
      // Extract Authorization header
      const authHeader = request.headers.get('authorization');

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const authResult = await validateNextAuthToken(token);

        if (authResult) {
          // Create authenticated context
          return createContext(undefined, true, authResult.userId);
        }
      }

      // Return unauthenticated context
      return createContext(undefined, false, undefined);
    },
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
    // In development/test, show all errors
    // In production, errors will be masked by default
    maskedErrors: process.env.NODE_ENV === 'production',
  });

  return yoga;
}
