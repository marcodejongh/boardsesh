'use client';

import React, { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import BookOutlined from '@mui/icons-material/BookOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import { LogbookView } from './logbook-view';
import { Climb } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import dayjs from 'dayjs';

interface LogbookSectionProps {
  climb: Climb;
}

export const LogbookSection: React.FC<LogbookSectionProps> = ({ climb }) => {
  const { logbook } = useBoardProvider();

  // Calculate summary statistics
  const summary = useMemo(() => {
    const climbAscents = logbook.filter((ascent) => ascent.climb_uuid === climb.uuid);

    if (climbAscents.length === 0) {
      return null;
    }

    // Calculate total attempts
    const totalAttempts = climbAscents.reduce((sum, ascent) => sum + (ascent.tries || 1), 0);

    // Calculate sessions (group by date - same day = same session)
    const sessionDates = new Set(
      climbAscents.map((ascent) => dayjs(ascent.climbed_at).format('YYYY-MM-DD'))
    );
    const sessionCount = sessionDates.size;

    // Count successful ascents vs attempts
    const successfulAscents = climbAscents.filter((a) => a.is_ascent).length;
    const failedAttempts = climbAscents.filter((a) => !a.is_ascent).length;

    return {
      totalAttempts,
      sessionCount,
      successfulAscents,
      failedAttempts,
    };
  }, [logbook, climb.uuid]);

  // If no logbook entries, show empty state without collapse
  if (!summary) {
    return (
      <Typography variant="body2" component="span" color="text.secondary" sx={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
        <BookOutlined style={{ marginRight: 8 }} />
        No ascents logged for this climb
      </Typography>
    );
  }

  const summaryLabel = (
    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
      <Typography variant="body2" component="span" fontWeight={600}>
        <BookOutlined style={{ marginRight: 8 }} />
        Your Logbook
      </Typography>
      <Typography variant="body2" component="span" color="text.secondary">
        {summary.totalAttempts} attempt{summary.totalAttempts !== 1 ? 's' : ''} in {summary.sessionCount} session{summary.sessionCount !== 1 ? 's' : ''}
      </Typography>
      {summary.successfulAscents > 0 && (
        <Chip icon={<CheckCircleOutlined />} label={`${summary.successfulAscents} send${summary.successfulAscents !== 1 ? 's' : ''}`} size="small" color="success" />
      )}
      {summary.failedAttempts > 0 && (
        <Chip icon={<CancelOutlined />} label={`${summary.failedAttempts} logged attempt${summary.failedAttempts !== 1 ? 's' : ''}`} size="small" />
      )}
    </Stack>
  );

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        margin: '-12px -8px',
        '&:before': { display: 'none' },
        backgroundColor: 'transparent',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
        {summaryLabel}
      </AccordionSummary>
      <AccordionDetails>
        <LogbookView currentClimb={climb} />
      </AccordionDetails>
    </Accordion>
  );
};
