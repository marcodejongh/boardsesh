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

import { Suspense, lazy } from 'react';
import { Tabs, Typography, Card, Alert, Spin } from 'antd';
import Stack from '@mui/material/Stack';
import MuiDivider from '@mui/material/Divider';
import {
  ApiOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  BookOutlined,
} from '@ant-design/icons';
import styles from './docs.module.css';

const { Title, Text, Paragraph, Link } = Typography;

// Lazy load heavy components
const SwaggerUI = lazy(() => import('./swagger-ui'));
const GraphQLSchemaViewer = lazy(() => import('./graphql-schema'));

function LoadingSpinner() {
  return (
    <div className={styles.loadingContainer}>
      <Spin size="large" />
      <div className={styles.loadingText}>Loading documentation...</div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className={styles.contentSection}>
      <Title level={2}>Boardsesh API Overview</Title>

      <Paragraph>
        Boardsesh provides two complementary APIs for interacting with interactive climbing
        training boards (Kilter, Tension):
      </Paragraph>

      <Stack spacing={3} className={styles.fullWidth}>
        <Card>
          <Title level={4}>
            <ApiOutlined /> REST API
          </Title>
          <Paragraph>
            Use the REST API for stateless operations like searching climbs, fetching board
            configuration, and user authentication. The REST API is ideal for:
          </Paragraph>
          <ul>
            <li>Fetching climb data and statistics</li>
            <li>User registration and authentication</li>
            <li>Profile management</li>
            <li>Aurora platform integration</li>
          </ul>
          <Text type="secondary">Base URL: <code>/api/v1/</code></Text>
        </Card>

        <Card>
          <Title level={4}>
            <ThunderboltOutlined /> WebSocket GraphQL API
          </Title>
          <Paragraph>
            Use the WebSocket API for real-time features like party sessions and queue
            synchronization. The GraphQL API provides:
          </Paragraph>
          <ul>
            <li>Real-time queue updates via subscriptions</li>
            <li>Session management (create, join, leave)</li>
            <li>Multi-user collaboration</li>
            <li>All REST API functionality via queries/mutations</li>
          </ul>
          <Text type="secondary">
            Endpoint: <code>wss://your-domain/api/graphql</code> (via graphql-ws protocol)
          </Text>
        </Card>

        <Card>
          <Title level={4}>
            <CloudServerOutlined /> Authentication
          </Title>
          <Paragraph>
            <strong>REST API:</strong> Uses NextAuth session cookies. Authenticate via{' '}
            <code>/api/auth/...</code> endpoints.
          </Paragraph>
          <Paragraph>
            <strong>WebSocket API:</strong> Obtain a JWT token from{' '}
            <code>GET /api/internal/ws-auth</code> and include it in the connection parameters:
          </Paragraph>
          <pre className={styles.codeBlockLight}>
{`import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://boardsesh.com/api/graphql',
  connectionParams: {
    authToken: 'your-jwt-token',
  },
});`}
          </pre>
        </Card>

        <Alert
          type="info"
          message="Rate Limiting"
          description="Authentication endpoints are rate-limited to prevent abuse. Rate limit headers are included in responses. Public read endpoints have generous limits."
        />
      </Stack>
    </div>
  );
}

function WebSocketGuideTab() {
  return (
    <div className={styles.contentSection}>
      <Title level={2}>WebSocket Connection Guide</Title>

      <Paragraph>
        The Boardsesh WebSocket API uses the{' '}
        <Link href="https://github.com/enisdenjo/graphql-ws" target="_blank">
          graphql-ws
        </Link>{' '}
        protocol for real-time GraphQL subscriptions.
      </Paragraph>

      <MuiDivider />

      <Title level={4}>Connection Setup</Title>

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

      <Title level={4}>Session Management</Title>

      <Paragraph>
        Sessions are the core collaboration unit. Users join sessions to share a climb queue.
      </Paragraph>

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

      <Title level={4}>Delta Synchronization</Title>

      <Paragraph>
        When reconnecting, use delta sync to catch up without full state transfer:
      </Paragraph>

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

      <Alert
        type="warning"
        message="Connection Handling"
        description="The WebSocket connection may be interrupted by network changes. Implement reconnection logic with the graphql-ws retry options and use delta sync to maintain state consistency."
        className={styles.alertWithMargin}
      />
    </div>
  );
}

export default function DocsClientPage() {
  return (
    <div className={styles.docsContainer}>
      <div className={styles.docsHeader}>
        <Title level={1}>
          <BookOutlined /> API Documentation
        </Title>
        <Text type="secondary">
          Complete reference for the Boardsesh REST and WebSocket APIs
        </Text>
      </div>

      <Tabs
        defaultActiveKey="overview"
        size="large"
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <BookOutlined /> Overview
              </span>
            ),
            children: <OverviewTab />,
          },
          {
            key: 'rest',
            label: (
              <span>
                <ApiOutlined /> REST API
              </span>
            ),
            children: (
              <Suspense fallback={<LoadingSpinner />}>
                <SwaggerUI />
              </Suspense>
            ),
          },
          {
            key: 'graphql',
            label: (
              <span>
                <ThunderboltOutlined /> GraphQL Schema
              </span>
            ),
            children: (
              <Suspense fallback={<LoadingSpinner />}>
                <GraphQLSchemaViewer />
              </Suspense>
            ),
          },
          {
            key: 'websocket',
            label: (
              <span>
                <CloudServerOutlined /> WebSocket Guide
              </span>
            ),
            children: <WebSocketGuideTab />,
          },
        ]}
      />
    </div>
  );
}
