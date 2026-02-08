'use client';

import React, { useEffect, useState } from 'react';
import { Collapse, Spin, Typography, Card, Button, Tag } from 'antd';
import Stack from '@mui/material/Stack';
import { HistoryOutlined, PlayCircleOutlined, TeamOutlined } from '@ant-design/icons';
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

const { Text } = Typography;

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
        <Spin size="small" />
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
                  size="small"
                  hoverable
                  onClick={() => handleResume(session)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>{session.name || `${extractBoardName(session.boardPath)} Session`}</Text>
                      <div>
                        <Stack direction="row" spacing={1}>
                          <Tag color="blue">{extractBoardName(session.boardPath)}</Tag>
                          <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                            {formatRelativeTime(session.lastActivity || session.createdAt)}
                          </Text>
                          {session.participantCount !== undefined && session.participantCount > 0 && (
                            <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                              <TeamOutlined /> {session.participantCount}
                            </Text>
                          )}
                        </Stack>
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResume(session);
                      }}
                    >
                      Resume
                    </Button>
                  </div>
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
