'use client';

import React from 'react';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import { useRouter } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';

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

type NearbySessionCardProps = {
  session: DiscoverableSession;
};

/**
 * Format distance for display
 */
function formatDistance(meters: number | null): string {
  if (meters === null) return '';
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  }
  return `${(meters / 1000).toFixed(1)}km away`;
}

/**
 * Extract board name from boardPath
 */
function extractBoardName(boardPath: string): string {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length > 0) {
    // Capitalize first letter
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return 'Unknown Board';
}

const NearbySessionCard = ({ session }: NearbySessionCardProps) => {
  const router = useRouter();

  const handleJoin = () => {
    // Navigate to the board path with the session ID
    const url = new URL(session.boardPath, window.location.origin);
    url.searchParams.set('session', session.id);
    router.push(url.pathname + url.search);
  };

  const boardName = extractBoardName(session.boardPath);
  const sessionName = session.name || `${boardName} Session`;

  return (
    <Card
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
      onClick={handleJoin}
    >
      <CardContent sx={{ p: 1.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Typography variant="h5" sx={{ margin: 0, marginBottom: themeTokens.spacing[1] }}>
              {sessionName}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={boardName} size="small" color="primary" />
              {session.distance !== null && (
                <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.sm }}>
                  <LocationOnOutlined /> {formatDistance(session.distance)}
                </Typography>
              )}
              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.sm }}>
                <GroupOutlined /> {session.participantCount} {session.participantCount === 1 ? 'climber' : 'climbers'}
              </Typography>
            </Stack>
          </div>
          <Button variant="contained" size="small" onClick={handleJoin}>
            Join
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NearbySessionCard;
