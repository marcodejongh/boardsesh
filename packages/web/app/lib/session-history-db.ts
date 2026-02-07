// Shared session history utilities for IndexedDB storage of board sessions.
// Used by both session-history-panel and user-drawer.

export type StoredSession = {
  id: string;
  name: string | null;
  boardPath: string;
  createdAt: string;
  lastActivity: string;
  participantCount?: number;
};

const DB_NAME = 'boardsesh-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'session-history';

async function initSessionDB(): Promise<IDBDatabase | null> {
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

export async function getRecentSessions(): Promise<StoredSession[]> {
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
