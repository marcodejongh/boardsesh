import { createIndexedDBStore } from './idb-helper';

export type StoredSession = {
  id: string;
  name: string | null;
  boardPath: string;
  createdAt: string;
  lastActivity: string;
  participantCount?: number;
};

const STORE_NAME = 'session-history';

const getDB = createIndexedDBStore('boardsesh-sessions', STORE_NAME, 1, (db) => {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    store.createIndex('lastActivity', 'lastActivity', { unique: false });
  }
});

export async function getRecentSessions(): Promise<StoredSession[]> {
  try {
    const db = await getDB();
    if (!db) return [];

    const sessions = await db.getAll(STORE_NAME) as StoredSession[];
    // Filter to sessions from last 7 days and sort by last activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return sessions
      .filter((s) => new Date(s.lastActivity || s.createdAt) > sevenDaysAgo)
      .sort((a, b) => new Date(b.lastActivity || b.createdAt).getTime() - new Date(a.lastActivity || a.createdAt).getTime());
  } catch (error) {
    console.error('Failed to get recent sessions:', error);
    return [];
  }
}

export async function saveSessionToHistory(session: StoredSession): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(STORE_NAME, session);
  } catch (error) {
    console.error('Failed to save session to history:', error);
  }
}

export function formatRelativeTime(dateString: string): string {
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

export function extractBoardName(boardPath: string): string {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return 'Unknown Board';
}
