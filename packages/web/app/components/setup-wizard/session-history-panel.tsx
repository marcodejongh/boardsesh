'use client';

import React, { useEffect, useState } from 'react';
import { Collapse, Spin, Typography, Card, Button, Space, Tag } from 'antd';
import { HistoryOutlined, PlayCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { themeTokens } from '@/app/theme/theme-config';

const { Text } = Typography;

// Type for session from storage/API
type StoredSession = {
  id: string;
  name: string | null;
  boardPath: string;
  createdAt: string;
  lastActivity: string;
  participantCount?: number;
  backendUrl?: string;
};

/**
 * Format relative time for display
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

/**
 * Extract board name from boardPath
 */
function extractBoardName(boardPath: string): string {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return 'Unknown Board';
}

// IndexedDB configuration for session history
const DB_NAME = 'boardsesh-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'session-history';

async function initSessionDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastActivity', 'lastActivity', { unique: false });
      }
    };
  });
}

async function getRecentSessions(): Promise<StoredSession[]> {
  const db = await initSessionDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const sessions = request.result as StoredSession[];
      // Filter to sessions from last 7 days and sort by last activity
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = sessions
        .filter((s) => new Date(s.lastActivity || s.createdAt) > sevenDaysAgo)
        .sort((a, b) => new Date(b.lastActivity || b.createdAt).getTime() - new Date(a.lastActivity || a.createdAt).getTime());
      resolve(recentSessions);
    };
  });
}

// Export function to save session to history
export async function saveSessionToHistory(session: StoredSession): Promise<void> {
  const db = await initSessionDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(session);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

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
    url.searchParams.set('sessionId', session.id);
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
            <Space>
              <HistoryOutlined />
              <span>Continue Previous Session ({sessions.length})</span>
            </Space>
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
                        <Space size="small">
                          <Tag color="blue">{extractBoardName(session.boardPath)}</Tag>
                          <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                            {formatRelativeTime(session.lastActivity || session.createdAt)}
                          </Text>
                          {session.participantCount !== undefined && session.participantCount > 0 && (
                            <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                              <TeamOutlined /> {session.participantCount}
                            </Text>
                          )}
                        </Space>
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
