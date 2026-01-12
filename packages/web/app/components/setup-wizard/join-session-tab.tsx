'use client';

import React, { useEffect, useState } from 'react';
import { Button, Empty, Spin, Typography, Alert, Space } from 'antd';
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import { useGeolocation, getGeolocationErrorMessage } from '@/app/hooks/use-geolocation';
import { themeTokens } from '@/app/theme/theme-config';
import NearbySessionCard from './nearby-session-card';

const { Text, Paragraph } = Typography;

// Backend URL from environment variable
const BACKEND_WS_URL = process.env.NEXT_PUBLIC_WS_URL || null;

// Convert WebSocket URL to HTTP URL for API calls
function getBackendHttpUrl(): string | null {
  if (!BACKEND_WS_URL) return null;
  return BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://').replace('/graphql', '');
}

// Type for discoverable sessions from GraphQL
type DiscoverableSession = {
  id: string;
  name: string | null;
  boardPath: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  createdByUserId: string | null;
  participantCount: number;
  distance: number | null;
};

const JoinSessionTab = () => {
  const backendHttpUrl = getBackendHttpUrl();
  const { coordinates, error, loading, permissionState, requestPermission, refresh } = useGeolocation();
  const [nearbySessions, setNearbySessions] = useState<DiscoverableSession[]>([]);
  const [fetchingNearby, setFetchingNearby] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch nearby sessions when we have coordinates
  useEffect(() => {
    if (!coordinates || !backendHttpUrl) return;

    const fetchNearbySessions = async () => {
      setFetchingNearby(true);
      setFetchError(null);

      try {
        // Use HTTP endpoint for simple query (no WebSocket needed)
        const response = await fetch(`${backendHttpUrl}/api/sessions/nearby`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            radiusMeters: 500,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch nearby sessions');
        }

        const data = await response.json();
        setNearbySessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to fetch nearby sessions:', err);
        setFetchError('Failed to find nearby sessions. Please try again.');
        // For now, just show empty state since the endpoint may not exist yet
        setNearbySessions([]);
      } finally {
        setFetchingNearby(false);
      }
    };

    fetchNearbySessions();
  }, [coordinates, backendHttpUrl]);

  // Show permission request UI
  if (permissionState !== 'granted' && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <EnvironmentOutlined style={{ fontSize: 48, color: themeTokens.colors.primary, marginBottom: themeTokens.spacing[4] }} />
        <Paragraph style={{ marginBottom: themeTokens.spacing[4] }}>
          To find climbing sessions near you, we need access to your location.
        </Paragraph>
        {error && (
          <Alert
            type="warning"
            title={getGeolocationErrorMessage(error)}
            style={{ marginBottom: themeTokens.spacing[4] }}
          />
        )}
        <Button
          type="primary"
          icon={<EnvironmentOutlined />}
          onClick={requestPermission}
          loading={loading}
        >
          Enable Location Access
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading || fetchingNearby) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: themeTokens.spacing[4] }}>
          {loading ? 'Getting your location...' : 'Finding nearby sessions...'}
        </Paragraph>
      </div>
    );
  }

  // No backend URL configured
  if (!backendHttpUrl) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <Empty
          description={
            <Space orientation="vertical" size="small">
              <Text>No backend server configured</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                To join sessions, you need to connect to a Boardsesh backend server.
              </Paragraph>
            </Space>
          }
        />
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <Alert
          type="error"
          title={fetchError}
          style={{ marginBottom: themeTokens.spacing[4] }}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  // No sessions found
  if (nearbySessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <Empty
          description={
            <Space orientation="vertical" size="small">
              <Text>No sessions found nearby</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                There are no active climbing sessions within 500 meters.
                Start your own session and enable &quot;Allow others to join&quot;!
              </Paragraph>
            </Space>
          }
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={refresh}
          style={{ marginTop: themeTokens.spacing[4] }}
        >
          Refresh
        </Button>
      </div>
    );
  }

  // Show nearby sessions
  return (
    <div style={{ padding: themeTokens.spacing[2] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: themeTokens.spacing[4] }}>
        <Text strong>Sessions nearby ({nearbySessions.length})</Text>
        <Button
          icon={<ReloadOutlined />}
          size="small"
          onClick={refresh}
          loading={fetchingNearby}
        >
          Refresh
        </Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: themeTokens.spacing[3] }}>
        {nearbySessions.map((session) => (
          <NearbySessionCard
            key={session.id}
            session={session}
          />
        ))}
      </div>
    </div>
  );
};

export default JoinSessionTab;
