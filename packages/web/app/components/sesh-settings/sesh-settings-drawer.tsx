'use client';

import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import AngleSelector from '@/app/components/board-page/angle-selector';
import { usePersistentSession } from '@/app/components/persistent-session/persistent-session-context';
import { useQueueBridgeBoardInfo } from '@/app/components/queue-control/queue-bridge-context';
import { useRouter, usePathname } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';

interface SeshSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function SeshSettingsDrawer({ open, onClose }: SeshSettingsDrawerProps) {
  const { activeSession, session, users, endSessionWithSummary } = usePersistentSession();
  const { boardDetails, angle } = useQueueBridgeBoardInfo();
  const router = useRouter();
  const pathname = usePathname();

  const handleAngleChange = useCallback((newAngle: number) => {
    if (!boardDetails || angle === undefined) return;

    // Replace the current angle in the URL with the new one
    // Same pattern as angle-selector.tsx — find by value, not position
    const pathSegments = pathname.split('/');
    const angleIndex = pathSegments.findIndex((segment) => segment === angle.toString());

    if (angleIndex !== -1) {
      pathSegments[angleIndex] = newAngle.toString();
      router.push(pathSegments.join('/'));
    }
  }, [boardDetails, angle, pathname, router]);

  const handleStopSession = useCallback(() => {
    endSessionWithSummary();

    // Remove session from URL if on a board route
    if (pathname.includes('session=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      router.replace(url.pathname + (url.search || ''), { scroll: false });
    }

    onClose();
  }, [endSessionWithSummary, pathname, router, onClose]);

  if (!activeSession) return null;

  const sessionName = session?.name || activeSession.sessionName || 'Session';
  const participantCount = users.length;
  const sessionGoal = session?.goal;
  const startedAt = session?.startedAt;

  // Calculate duration
  let durationText = '';
  if (startedAt) {
    const startDate = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      durationText = `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      durationText = `${hours}h ${mins}m`;
    }
  }

  return (
    <SwipeableDrawer
      title="Sesh Settings"
      placement="right"
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: '90%', maxWidth: 400 } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
        {/* Session info */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {sessionName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {participantCount > 0 && (
              <Chip
                icon={<PeopleOutlined />}
                label={`${participantCount} participant${participantCount !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
              />
            )}
            {durationText && (
              <Chip label={durationText} size="small" variant="outlined" />
            )}
          </Box>
          {sessionGoal && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Goal: {sessionGoal}
            </Typography>
          )}
        </Box>

        {/* Angle selector */}
        {boardDetails && angle !== undefined && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Angle
            </Typography>
            <AngleSelector
              boardName={boardDetails.board_name}
              boardDetails={boardDetails}
              currentAngle={angle}
              currentClimb={null}
              onAngleChange={handleAngleChange}
            />
          </Box>
        )}

        {/* Stop Session */}
        <Button
          variant="outlined"
          color="error"
          startIcon={<StopCircleOutlined />}
          onClick={handleStopSession}
          fullWidth
          sx={{
            mt: 2,
            borderColor: themeTokens.colors.error,
            color: themeTokens.colors.error,
            '&:hover': {
              borderColor: themeTokens.colors.error,
              backgroundColor: `${themeTokens.colors.error}10`,
            },
          }}
        >
          Stop Session
        </Button>
      </Box>
    </SwipeableDrawer>
  );
}
