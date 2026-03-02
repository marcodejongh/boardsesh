'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { SessionDetail, SessionLiveStats } from '@boardsesh/shared-schema';
import type { BoardDetails } from '@/app/lib/types';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLClient, subscribe } from '@/app/components/graphql-queue/graphql-client';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { getUserBoardDetails } from '@/app/lib/board-config-for-playlist';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import {
  SESSION_STATS_SUBSCRIPTION,
  type SessionStatsSubscriptionResponse,
} from '@/app/lib/graphql/operations/activity-feed';
import {
  GET_BOARD_BY_SLUG,
  type GetBoardBySlugQueryResponse,
} from '@/app/lib/graphql/operations/boards';
import SessionDetailContent from './session-detail-content';

interface SessionDetailLiveShellProps {
  sessionId: string;
  initialSession: SessionDetail | null;
}

interface SessionBoardPreview {
  boardName: string;
  boardDetails: BoardDetails;
  angle: number;
}

function mergeStatsIntoSession(
  previous: SessionDetail,
  liveStats: SessionLiveStats,
): SessionDetail {
  const mergedTicks = liveStats.ticks ?? previous.ticks;
  const firstTickAt = mergedTicks.length > 0
    ? mergedTicks[mergedTicks.length - 1]?.climbedAt ?? previous.firstTickAt
    : previous.firstTickAt;
  const lastTickAt = mergedTicks.length > 0
    ? mergedTicks[0]?.climbedAt ?? previous.lastTickAt
    : previous.lastTickAt;

  return {
    ...previous,
    participants: liveStats.participants,
    totalSends: liveStats.totalSends,
    totalFlashes: liveStats.totalFlashes,
    totalAttempts: liveStats.totalAttempts,
    tickCount: liveStats.tickCount,
    gradeDistribution: liveStats.gradeDistribution,
    boardTypes: liveStats.boardTypes,
    hardestGrade: liveStats.hardestGrade,
    durationMinutes: liveStats.durationMinutes,
    goal: liveStats.goal,
    ticks: mergedTicks,
    firstTickAt,
    lastTickAt,
  };
}

function getBoardSlug(boardPath: string | null | undefined): string | null {
  if (!boardPath) return null;
  const match = boardPath.match(/^\/b\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

export default function SessionDetailLiveShell({
  sessionId,
  initialSession,
}: SessionDetailLiveShellProps) {
  const { token: authToken } = useWsAuthToken();
  const [session, setSession] = useState<SessionDetail | null>(initialSession);
  const [boardPreview, setBoardPreview] = useState<SessionBoardPreview | null>(null);
  const [joinSessionUrl, setJoinSessionUrl] = useState<string | null>(null);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (!session?.isInProgress) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) return;

    const wsClient = createGraphQLClient({
      url: wsUrl,
      authToken,
    });

    const unsubscribe = subscribe<SessionStatsSubscriptionResponse>(
      wsClient,
      {
        query: SESSION_STATS_SUBSCRIPTION,
        variables: { sessionId },
      },
      {
        next: (data) => {
          if (!data?.sessionStats || data.sessionStats.sessionId !== sessionId) return;
          setSession((previous) => (
            previous
              ? mergeStatsIntoSession(previous, data.sessionStats)
              : previous
          ));
        },
        error: (err) => {
          console.error('[SessionDetailLiveShell] sessionStats subscription error:', err);
        },
        complete: () => {},
      },
    );

    return () => {
      unsubscribe();
      wsClient.dispose();
    };
  }, [authToken, session?.isInProgress, sessionId]);

  const boardSlug = useMemo(
    () => getBoardSlug(session?.boardPath),
    [session?.boardPath],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBoardPreview() {
      if (!session?.isInProgress || !boardSlug) {
        if (!cancelled) {
          setBoardPreview(null);
          setJoinSessionUrl(null);
        }
        return;
      }

      try {
        const client = createGraphQLHttpClient(authToken);
        const response = await client.request<GetBoardBySlugQueryResponse>(
          GET_BOARD_BY_SLUG,
          { slug: boardSlug },
        );

        if (cancelled) return;
        const board = response.boardBySlug;
        if (!board) {
          setBoardPreview(null);
          setJoinSessionUrl(null);
          return;
        }

        const boardDetails = getUserBoardDetails(board);
        if (!boardDetails) {
          setBoardPreview(null);
          setJoinSessionUrl(null);
          return;
        }

        const baseUrl = constructBoardSlugListUrl(board.slug, board.angle);
        setJoinSessionUrl(`${baseUrl}?session=${encodeURIComponent(sessionId)}`);
        setBoardPreview({
          boardName: board.name,
          boardDetails,
          angle: board.angle,
        });
      } catch (err) {
        console.error('[SessionDetailLiveShell] Failed to resolve board preview:', err);
        if (!cancelled) {
          setBoardPreview(null);
          setJoinSessionUrl(null);
        }
      }
    }

    loadBoardPreview();

    return () => {
      cancelled = true;
    };
  }, [authToken, boardSlug, session?.isInProgress, sessionId]);

  return (
    <SessionDetailContent
      session={session}
      joinSessionUrl={joinSessionUrl}
      sessionBoardPreview={boardPreview}
    />
  );
}
