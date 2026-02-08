'use client';

import React, { useEffect, useState } from 'react';
import MuiAlert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { EmptyState } from '@/app/components/ui/empty-state';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import { useGeolocation, getGeolocationErrorMessage } from '@/app/hooks/use-geolocation';
import { themeTokens } from '@/app/theme/theme-config';
import NearbySessionCard from './nearby-session-card';

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
        <LocationOnOutlined style={{ fontSize: 48, color: themeTokens.colors.primary, marginBottom: themeTokens.spacing[4] }} />
        <Typography variant="body1" component="p" sx={{ marginBottom: themeTokens.spacing[4] }}>
          To find climbing sessions near you, we need access to your location.
        </Typography>
        {error && (
          <MuiAlert severity="warning" sx={{ marginBottom: themeTokens.spacing[4] }}>
            {getGeolocationErrorMessage(error)}
          </MuiAlert>
        )}
        <Button
          variant="contained"
          startIcon={<LocationOnOutlined />}
          onClick={requestPermission}
          disabled={loading}
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
        <CircularProgress size={48} />
        <Typography variant="body1" component="p" sx={{ marginTop: themeTokens.spacing[4] }}>
          {loading ? 'Getting your location...' : 'Finding nearby sessions...'}
        </Typography>
      </div>
    );
  }

  // No backend URL configured
  if (!backendHttpUrl) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <EmptyState description="No backend server configured">
          <Typography variant="body1" component="p" color="text.secondary" sx={{ marginBottom: 0 }}>
            To join sessions, you need to connect to a Boardsesh backend server.
          </Typography>
        </EmptyState>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <MuiAlert severity="error" sx={{ marginBottom: themeTokens.spacing[4] }}>
          {fetchError}
        </MuiAlert>
        <Button variant="outlined" startIcon={<RefreshOutlined />} onClick={refresh}>
          Try Again
        </Button>
      </div>
    );
  }

  // No sessions found
  if (nearbySessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[8] }}>
        <EmptyState description="No sessions found nearby">
          <Typography variant="body1" component="p" color="text.secondary" sx={{ marginBottom: 0 }}>
            There are no active climbing sessions within 500 meters.
            Start your own session and enable &quot;Allow others to join&quot;!
          </Typography>
        </EmptyState>
        <Button
          variant="outlined"
          startIcon={<RefreshOutlined />}
          onClick={refresh}
          sx={{ marginTop: themeTokens.spacing[4] }}
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
        <Typography variant="body2" component="span" fontWeight={600}>Sessions nearby ({nearbySessions.length})</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshOutlined />}
          size="small"
          onClick={refresh}
          disabled={fetchingNearby}
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
