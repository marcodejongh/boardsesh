'use client';

import React, { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import BookOutlined from '@mui/icons-material/BookOutlined';
import { LogbookView } from './logbook-view';
import { Climb } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import dayjs from 'dayjs';

interface LogbookSectionProps {
  climb: Climb;
}

export interface LogbookSummary {
  totalAttempts: number;
  sessionCount: number;
  successfulAscents: number;
  failedAttempts: number;
}

/** Hook to compute logbook summary for a given climb. */
export function useLogbookSummary(climbUuid: string): LogbookSummary | null {
  const { logbook } = useBoardProvider();

  return useMemo(() => {
    const climbAscents = logbook.filter((ascent) => ascent.climb_uuid === climbUuid);

    if (climbAscents.length === 0) {
      return null;
    }

    const totalAttempts = climbAscents.reduce((sum, ascent) => sum + (ascent.tries || 1), 0);

    const sessionDates = new Set(
      climbAscents.map((ascent) => dayjs(ascent.climbed_at).format('YYYY-MM-DD'))
    );
    const sessionCount = sessionDates.size;

    const successfulAscents = climbAscents.filter((a) => a.is_ascent).length;
    const failedAttempts = climbAscents.filter((a) => !a.is_ascent).length;

    return {
      totalAttempts,
      sessionCount,
      successfulAscents,
      failedAttempts,
    };
  }, [logbook, climbUuid]);
}

export const LogbookSection: React.FC<LogbookSectionProps> = ({ climb }) => {
  const summary = useLogbookSummary(climb.uuid);

  if (!summary) {
    return (
      <Typography variant="body2" component="span" color="text.secondary" sx={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
        <BookOutlined style={{ marginRight: 8 }} />
        No ascents logged for this climb
      </Typography>
    );
  }

  return <LogbookView currentClimb={climb} />;
};
