'use client';

import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import { useRouter } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';
import {
  type StoredSession,
  getRecentSessions,
  formatRelativeTime,
  extractBoardName,
} from '@/app/lib/session-history-db';

// Re-export for backwards compatibility with existing consumers
export { saveSessionToHistory } from '@/app/lib/session-history-db';

const SessionHistoryPanel = () => {
  const router = useRouter();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleResume = (session: StoredSession) => {
    const url = new URL(session.boardPath, window.location.origin);
    url.searchParams.set('session', session.id);
    router.push(url.pathname + url.search);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: themeTokens.spacing[4] }}>
        <CircularProgress size={24} />
      </div>
    );
  }

  if (sessions.length === 0) {
    return null; // Don't show the panel if there are no sessions
  }

  return (
    <Collapse
      size="small"
      style={{ marginBottom: themeTokens.spacing[4] }}
      items={[
        {
          key: 'history',
          label: (
            <Stack direction="row" spacing={1}>
              <HistoryOutlined />
              <span>Continue Previous Session ({sessions.length})</span>
            </Stack>
          ),
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: themeTokens.spacing[2] }}>
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
                  onClick={() => handleResume(session)}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Typography variant="body2" component="span" fontWeight={600}>{session.name || `${extractBoardName(session.boardPath)} Session`}</Typography>
                        <div>
                          <Stack direction="row" spacing={1}>
                            <Tag color="blue">{extractBoardName(session.boardPath)}</Tag>
                            <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.sm }}>
                              {formatRelativeTime(session.lastActivity || session.createdAt)}
                            </Typography>
                            {session.participantCount !== undefined && session.participantCount > 0 && (
                              <Typography variant="body2" component="span" color="text.secondary" sx={{ fontSize: themeTokens.typography.fontSize.sm }}>
                                <GroupOutlined /> {session.participantCount}
                              </Typography>
                            )}
                          </Stack>
                        </div>
                      </div>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayCircleOutlineOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResume(session);
                        }}
                      >
                        Resume
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
};

export default SessionHistoryPanel;
