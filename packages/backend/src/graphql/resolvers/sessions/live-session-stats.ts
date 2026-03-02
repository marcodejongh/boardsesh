import type { SessionEvent } from '@boardsesh/shared-schema';
import { sessionFeedQueries } from '../social/session-feed';

export async function buildSessionStatsUpdatedEvent(
  sessionId: string,
): Promise<Extract<SessionEvent, { __typename: 'SessionStatsUpdated' }> | null> {
  const sessionDetail = await sessionFeedQueries.sessionDetail(null, { sessionId });
  if (!sessionDetail || sessionDetail.sessionType !== 'party') return null;

  return {
    __typename: 'SessionStatsUpdated',
    sessionId,
    totalSends: sessionDetail.totalSends,
    totalFlashes: sessionDetail.totalFlashes,
    totalAttempts: sessionDetail.totalAttempts,
    tickCount: sessionDetail.tickCount,
    participants: sessionDetail.participants,
    gradeDistribution: sessionDetail.gradeDistribution,
    boardTypes: sessionDetail.boardTypes,
    hardestGrade: sessionDetail.hardestGrade ?? null,
    durationMinutes: sessionDetail.durationMinutes ?? null,
    goal: sessionDetail.goal ?? null,
    ticks: sessionDetail.ticks.slice(0, 20),
  };
}
