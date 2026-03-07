'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import Divider from '@mui/material/Divider';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import AngleSelector from '@/app/components/board-page/angle-selector';
import { usePersistentSession } from '@/app/components/persistent-session/persistent-session-context';
import { useQueueBridgeBoardInfo } from '@/app/components/queue-control/queue-bridge-context';
import { useRouter, usePathname } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';
import { useSessionDetail } from '@/app/hooks/use-session-detail';
import type { SessionDetail } from '@boardsesh/shared-schema';
import SessionDetailContent from '@/app/session/[sessionId]/session-detail-content';

interface SeshSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function SeshSettingsDrawer({ open, onClose }: SeshSettingsDrawerProps) {
  const { activeSession, session, users, endSessionWithSummary } = usePersistentSession();
  const { boardDetails, angle } = useQueueBridgeBoardInfo();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = activeSession?.sessionId ?? null;

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
    onClose();
  }, [endSessionWithSummary, onClose]);

  // Use the canonical useSessionDetail hook — its React Query cache is kept
  // up-to-date by WebSocket SessionStatsUpdated events in persistent-session-context.
  const { session: sessionDetail, isLoading, isError } = useSessionDetail({
    sessionId: sessionId ?? undefined,
    enabled: open && !!sessionId,
  });

  // Capture a stable timestamp once when the active session first becomes
  // relevant, so that unrelated dep changes don't regenerate different values.
  const fallbackTimestampRef = useRef<string | null>(null);
  if (activeSession && sessionId && !fallbackTimestampRef.current) {
    fallbackTimestampRef.current = new Date().toISOString();
  }
  if (!activeSession || !sessionId) {
    fallbackTimestampRef.current = null;
  }

  // Build a placeholder SessionDetail from live context when the real
  // sessionDetail hasn't loaded yet (or isn't available at all).
  const fallbackSession = useMemo<SessionDetail | null>(() => {
    if (!activeSession || !sessionId) return null;
    if (sessionDetail) return null; // not needed when we have real data

    const stableNow = fallbackTimestampRef.current!;
    const fallbackFirstTick = session?.startedAt ?? stableNow;
    const fallbackDurationMinutes = session?.startedAt
      ? Math.max(0, Math.round((new Date(stableNow).getTime() - new Date(session.startedAt).getTime()) / 60000))
      : null;

    return {
      sessionId,
      sessionType: 'party',
      sessionName: session?.name || activeSession.sessionName || null,
      ownerUserId: null,
      participants: users.map((user) => ({
        userId: user.id,
        displayName: user.username,
        avatarUrl: user.avatarUrl,
        sends: 0,
        flashes: 0,
        attempts: 0,
      })),
      totalSends: 0,
      totalFlashes: 0,
      totalAttempts: 0,
      tickCount: 0,
      gradeDistribution: [],
      boardTypes: boardDetails?.board_name ? [boardDetails.board_name] : [],
      hardestGrade: null,
      firstTickAt: fallbackFirstTick,
      lastTickAt: stableNow,
      durationMinutes: fallbackDurationMinutes,
      goal: session?.goal ?? null,
      ticks: [],
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      commentCount: 0,
    };
  }, [activeSession, sessionId, sessionDetail, session?.startedAt, session?.name, session?.goal, users, boardDetails?.board_name]);

  const displaySession = sessionDetail ?? fallbackSession;

  if (!activeSession) return null;

  return (
    <SwipeableDrawer
      title="Sesh Settings"
      placement="top"
      open={open}
      onClose={onClose}
      fullHeight
      styles={{
        wrapper: { height: '100dvh' },
        body: { padding: 0, paddingBottom: 0 },
      }}
      footer={(
        <Button
          variant="outlined"
          color="error"
          startIcon={<StopCircleOutlined />}
          onClick={handleStopSession}
          fullWidth
          sx={{
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
      )}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
        {isLoading && !displaySession && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {isError && (
          <Alert severity="warning" sx={{ mx: 1 }}>
            Couldn&apos;t load full session details. Live stats will continue when available.
          </Alert>
        )}

        {displaySession && (
          <SessionDetailContent
            key={`${displaySession.sessionId}:${displaySession.ticks.length}:${displaySession.ticks[0]?.uuid ?? ''}`}
            session={displaySession}
            embedded
            fallbackBoardDetails={boardDetails}
          />
        )}

        <Divider />

        {boardDetails && angle !== undefined && (
          <Box sx={{ px: 1 }}>
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
      </Box>
    </SwipeableDrawer>
  );
}
