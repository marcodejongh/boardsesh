'use client';

import React, { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import Divider from '@mui/material/Divider';
import { useQuery } from '@tanstack/react-query';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import AngleSelector from '@/app/components/board-page/angle-selector';
import { usePersistentSession } from '@/app/components/persistent-session/persistent-session-context';
import { useQueueBridgeBoardInfo } from '@/app/components/queue-control/queue-bridge-context';
import { useRouter, usePathname } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_SESSION_DETAIL,
  type GetSessionDetailQueryResponse,
} from '@/app/lib/graphql/operations/activity-feed';
import type { SessionDetail } from '@boardsesh/shared-schema';
import SessionDetailContent from '@/app/session/[sessionId]/session-detail-content';

interface SeshSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function SeshSettingsDrawer({ open, onClose }: SeshSettingsDrawerProps) {
  const { activeSession, session, users, endSessionWithSummary, liveSessionStats } = usePersistentSession();
  const { boardDetails, angle } = useQueueBridgeBoardInfo();
  const { token: authToken } = useWsAuthToken();
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activeSessionDetail', sessionId],
    queryFn: async () => {
      const client = createGraphQLHttpClient(authToken);
      return client.request<GetSessionDetailQueryResponse>(GET_SESSION_DETAIL, { sessionId });
    },
    enabled: open && !!sessionId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const sessionDetail = data?.sessionDetail ?? null;
  const mergedStats = useMemo(() => {
    if (liveSessionStats?.sessionId !== sessionId) return null;
    return liveSessionStats;
  }, [liveSessionStats, sessionId]);

  const sessionForView = useMemo<SessionDetail | null>(() => {
    if (!activeSession || !sessionId) return null;

    const nowIso = new Date().toISOString();
    const fallbackFirstTick = session?.startedAt ?? nowIso;
    const fallbackDurationMinutes = session?.startedAt
      ? Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000))
      : null;

    const base: SessionDetail = sessionDetail ?? {
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
      lastTickAt: nowIso,
      durationMinutes: fallbackDurationMinutes,
      goal: session?.goal ?? null,
      ticks: [],
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      commentCount: 0,
    };

    if (!mergedStats) return base;

    const mergedTicks = mergedStats.ticks;
    const firstTickAt = mergedTicks.length > 0
      ? mergedTicks[mergedTicks.length - 1].climbedAt
      : base.firstTickAt;
    const lastTickAt = mergedTicks.length > 0
      ? mergedTicks[0].climbedAt
      : base.lastTickAt;

    return {
      ...base,
      participants: mergedStats.participants,
      totalSends: mergedStats.totalSends,
      totalFlashes: mergedStats.totalFlashes,
      totalAttempts: mergedStats.totalAttempts,
      tickCount: mergedStats.tickCount,
      gradeDistribution: mergedStats.gradeDistribution,
      boardTypes: mergedStats.boardTypes,
      hardestGrade: mergedStats.hardestGrade,
      durationMinutes: mergedStats.durationMinutes,
      goal: mergedStats.goal,
      firstTickAt,
      lastTickAt,
      ticks: mergedTicks,
    };
  }, [
    activeSession,
    sessionId,
    sessionDetail,
    session?.startedAt,
    session?.name,
    session?.goal,
    users,
    boardDetails?.board_name,
    mergedStats,
  ]);

  if (!activeSession) return null;

  return (
    <SwipeableDrawer
      title="Sesh Settings"
      placement="top"
      open={open}
      onClose={onClose}
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
        {isLoading && !sessionForView && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {isError && (
          <Alert severity="warning" sx={{ mx: 1 }}>
            Couldn&apos;t load full session details. Live stats will continue when available.
          </Alert>
        )}

        {sessionForView && (
          <SessionDetailContent
            key={`${sessionForView.sessionId}:${sessionForView.ticks.length}:${sessionForView.ticks[0]?.uuid ?? ''}`}
            session={sessionForView}
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
