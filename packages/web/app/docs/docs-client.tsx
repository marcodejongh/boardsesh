'use client';

/**
 * API Documentation Page
 *
 * Provides comprehensive documentation for both the REST API and WebSocket GraphQL API.
 *
 * Features:
 * - REST API: Interactive Swagger UI generated from Zod schemas
 * - GraphQL API: Schema viewer with search and syntax highlighting
 * - WebSocket connection guide
 */

import { Suspense, lazy, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import MuiAlert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import MuiCard from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiDivider from '@mui/material/Divider';
import {
  ApiOutlined,
  CloudOutlined,
  ElectricBoltOutlined,
  MenuBookOutlined,
} from '@mui/icons-material';
import { TabPanel } from '@/app/components/ui/tab-panel';
import styles from './docs.module.css';

// Typography destructuring removed - using MUI Typography directly
import MuiLink from '@mui/material/Link';

// Lazy load heavy components
const SwaggerUI = lazy(() => import('./swagger-ui'));
const GraphQLSchemaViewer = lazy(() => import('./graphql-schema'));

function LoadingSpinner() {
  return (
    <div className={styles.loadingContainer}>
      <CircularProgress size={40} />
      <div className={styles.loadingText}>Loading documentation...</div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className={styles.contentSection}>
      <Typography variant="h4" component="h2">Boardsesh API Overview</Typography>

      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        Boardsesh provides two complementary APIs for interacting with interactive climbing
        training boards (Kilter, Tension):
      </Typography>

      <Stack spacing={3} className={styles.fullWidth}>
        <MuiCard><CardContent>
          <Typography variant="h6" component="h4">
            <ApiOutlined /> REST API
          </Typography>
          <Typography variant="body1" component="p" sx={{ mb: 1 }}>
            Use the REST API for stateless operations like searching climbs, fetching board
            configuration, and user authentication. The REST API is ideal for:
          </Typography>
          <ul>
            <li>Fetching climb data and statistics</li>
            <li>User registration and authentication</li>
            <li>Profile management</li>
            <li>Aurora platform integration</li>
          </ul>
          <Typography variant="body2" component="span" color="text.secondary">Base URL: <code>/api/v1/</code></Typography>
        </CardContent></MuiCard>

        <MuiCard><CardContent>
          <Typography variant="h6" component="h4">
            <ElectricBoltOutlined /> WebSocket GraphQL API
          </Typography>
          <Typography variant="body1" component="p" sx={{ mb: 1 }}>
            Use the WebSocket API for real-time features like party sessions and queue
            synchronization. The GraphQL API provides:
          </Typography>
          <ul>
            <li>Real-time queue updates via subscriptions</li>
            <li>Session management (create, join, leave)</li>
            <li>Multi-user collaboration</li>
            <li>All REST API functionality via queries/mutations</li>
          </ul>
          <Typography variant="body2" component="span" color="text.secondary">
            Endpoint: <code>wss://your-domain/api/graphql</code> (via graphql-ws protocol)
          </Typography>
        </CardContent></MuiCard>

        <MuiCard><CardContent>
          <Typography variant="h6" component="h4">
            <CloudOutlined /> Authentication
          </Typography>
          <Typography variant="body1" component="p" sx={{ mb: 1 }}>
            <strong>REST API:</strong> Uses NextAuth session cookies. Authenticate via{' '}
            <code>/api/auth/...</code> endpoints.
          </Typography>
          <Typography variant="body1" component="p" sx={{ mb: 1 }}>
            <strong>WebSocket API:</strong> Obtain a JWT token from{' '}
            <code>GET /api/internal/ws-auth</code> and include it in the connection parameters:
          </Typography>
          <pre className={styles.codeBlockLight}>
{`import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://boardsesh.com/api/graphql',
  connectionParams: {
    authToken: 'your-jwt-token',
  },
});`}
          </pre>
        </CardContent></MuiCard>

        <MuiAlert severity="info">
          <AlertTitle>Rate Limiting</AlertTitle>
          Authentication endpoints are rate-limited to prevent abuse. Rate limit headers are included in responses. Public read endpoints have generous limits.
        </MuiAlert>
      </Stack>
    </div>
  );
}

function WebSocketGuideTab() {
  return (
    <div className={styles.contentSection}>
      <Typography variant="h4" component="h2">WebSocket Connection Guide</Typography>

      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        The Boardsesh WebSocket API uses the{' '}
        <MuiLink href="https://github.com/enisdenjo/graphql-ws" target="_blank">
          graphql-ws
        </MuiLink>{' '}
        protocol for real-time GraphQL subscriptions.
      </Typography>

      <MuiDivider />

      <Typography variant="h6" component="h4">Connection Setup</Typography>

      <pre className={styles.codeBlockDark}>
{`import { createClient } from 'graphql-ws';

// 1. Get auth token (requires session cookie)
const tokenResponse = await fetch('/api/internal/ws-auth');
const { token } = await tokenResponse.json();

// 2. Create WebSocket client
const client = createClient({
  url: 'wss://boardsesh.com/api/graphql',
  connectionParams: {
    authToken: token,
  },
  // Optional: reconnection settings
  retryAttempts: 5,
  shouldRetry: () => true,
});

// 3. Subscribe to queue updates
const unsubscribe = client.subscribe(
  {
    query: \`
      subscription QueueUpdates($sessionId: ID!) {
        queueUpdates(sessionId: $sessionId) {
          ... on QueueItemAdded {
            sequence
            item { uuid climb { name difficulty } }
          }
          ... on QueueItemRemoved {
            sequence
            uuid
          }
          ... on CurrentClimbChanged {
            sequence
            item { climb { name } }
          }
        }
      }
    \`,
    variables: { sessionId: 'your-session-id' },
  },
  {
    next: (data) => console.log('Queue update:', data),
    error: (err) => console.error('Subscription error:', err),
    complete: () => console.log('Subscription complete'),
  }
);`}
      </pre>

      <MuiDivider />

      <Typography variant="h6" component="h4">Session Management</Typography>

      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        Sessions are the core collaboration unit. Users join sessions to share a climb queue.
      </Typography>

      <pre className={styles.codeBlockDark}>
{`// Join or create a session
const result = await client.query({
  query: \`
    mutation JoinSession($sessionId: ID!, $boardPath: String!, $username: String) {
      joinSession(sessionId: $sessionId, boardPath: $boardPath, username: $username) {
        id
        isLeader
        queueState {
          sequence
          queue { uuid climb { name difficulty } }
          currentClimbQueueItem { climb { name } }
        }
      }
    }
  \`,
  variables: {
    sessionId: 'my-session',
    boardPath: 'kilter/1/1/1,2/40',
    username: 'ClimberJoe',
  },
});`}
      </pre>

      <MuiDivider />

      <Typography variant="h6" component="h4">Delta Synchronization</Typography>

      <Typography variant="body1" component="p" sx={{ mb: 2 }}>
        When reconnecting, use delta sync to catch up without full state transfer:
      </Typography>

      <pre className={styles.codeBlockDark}>
{`// Store the last known sequence number
let lastSequence = 0;

// On reconnect, request missed events
const { eventsReplay } = await client.query({
  query: \`
    query EventsReplay($sessionId: ID!, $sinceSequence: Int!) {
      eventsReplay(sessionId: $sessionId, sinceSequence: $sinceSequence) {
        events { ... }
        currentSequence
      }
    }
  \`,
  variables: {
    sessionId: 'my-session',
    sinceSequence: lastSequence,
  },
});

// Apply missed events to local state
for (const event of eventsReplay.events) {
  applyEvent(event);
}
lastSequence = eventsReplay.currentSequence;`}
      </pre>

      <MuiAlert severity="warning" className={styles.alertWithMargin}>
        <AlertTitle>Connection Handling</AlertTitle>
        The WebSocket connection may be interrupted by network changes. Implement reconnection logic with the graphql-ws retry options and use delta sync to maintain state consistency.
      </MuiAlert>
    </div>
  );
}

export default function DocsClientPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className={styles.docsContainer}>
      <div className={styles.docsHeader}>
        <Typography variant="h3" component="h1">
          <MenuBookOutlined /> API Documentation
        </Typography>
        <Typography variant="body2" component="span" color="text.secondary">
          Complete reference for the Boardsesh REST and WebSocket APIs
        </Typography>
      </div>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab
          label={<span><MenuBookOutlined /> Overview</span>}
          value="overview"
        />
        <Tab
          label={<span><ApiOutlined /> REST API</span>}
          value="rest"
        />
        <Tab
          label={<span><ElectricBoltOutlined /> GraphQL Schema</span>}
          value="graphql"
        />
        <Tab
          label={<span><CloudOutlined /> WebSocket Guide</span>}
          value="websocket"
        />
      </Tabs>

      <TabPanel value={activeTab} index="overview">
        <OverviewTab />
      </TabPanel>

      <TabPanel value={activeTab} index="rest">
        <Suspense fallback={<LoadingSpinner />}>
          <SwaggerUI />
        </Suspense>
      </TabPanel>

      <TabPanel value={activeTab} index="graphql">
        <Suspense fallback={<LoadingSpinner />}>
          <GraphQLSchemaViewer />
        </Suspense>
      </TabPanel>

      <TabPanel value={activeTab} index="websocket">
        <WebSocketGuideTab />
      </TabPanel>
    </div>
  );
}
