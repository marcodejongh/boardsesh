'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BoardName, ClimbUuid } from '@/app/lib/types';
import { IDBPDatabase, openDB } from 'idb';
import { AscentSavedEvent, LogbookEntry, SaveAscentResponse } from '@/app/lib/api-wrappers/aurora/types';
import { SaveAscentOptions } from '@/app/lib/api-wrappers/aurora/types';
import { generateUuid } from '@/app/lib/api-wrappers/aurora/util';
import { supported_boards } from '../board-renderer/types';
import { message } from 'antd';

const DB_NAME = 'boardsesh_v2';
const DB_VERSION = 5;

const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Simply create any missing stores
      supported_boards.forEach((boardName) => {
        if (!db.objectStoreNames.contains(boardName)) {
          db.createObjectStore(boardName);
        }
      });
    },
  });
  return db;
};

const loadAuthState = async (db: IDBPDatabase, board_name: BoardName): Promise<AuthState | null> => {
  try {
    const authState = await db.get(board_name, 'auth');
    return authState || null;
  } catch (error) {
    console.error('Failed to load auth state:', error);
    return null;
  }
};

const saveAuthState = async (db: IDBPDatabase, board_name: BoardName, value: AuthState): Promise<void> => {
  try {
    await db.put(board_name, value, 'auth');
  } catch (error) {
    console.error('Failed to save auth state:', error);
    throw error;
  }
};

interface AuthState {
  token: string | null;
  user_id: number | null;
  username: string | null;
  board: BoardName | null;
}

interface BoardContextType {
  boardName: BoardName;
  isAuthenticated: boolean;
  token: string | null;
  user_id: number | null;
  username: string | null;
  login: (board: BoardName, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  logbook: LogbookEntry[];
  getLogbook: (climbUuids: ClimbUuid[]) => Promise<void>;
  saveAscent: (options: Omit<SaveAscentOptions, 'uuid'>) => Promise<SaveAscentResponse>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ boardName, children }: { boardName: BoardName; children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user_id: null,
    username: null,
    board: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  const [currentClimbUuids, setCurrentClimbUuids] = useState<ClimbUuid[]>([]);

  // Load saved auth state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const database = await initDB();
        if (!mounted) return;

        setDb(database);

        const savedState = await loadAuthState(database, boardName);
        if (!mounted) return;

        if (savedState) {
          setAuthState(savedState);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (mounted) {
          setError('Failed to initialize authentication system');
        }
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [boardName]);

  useEffect(() => {
    const syncUserData = async () => {
      if (!authState.token || !authState.user_id || !boardName) {
        return;
      }

      try {
        await fetch(`/api/v1/${boardName}/proxy/user-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            board_name: boardName,
          }),
        });
      } catch (error) {
        console.error('Failed to sync user data:', error);
        // Don't surface this error to the user since it's a background sync
      }
    };

    if (authState.token && boardName && authState.user_id) {
      syncUserData();
    }
  }, [authState.token, authState.user_id, boardName]);

  const login = async (board: BoardName, username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/${board}/proxy/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const newAuthState = {
        token: data.token,
        user_id: data.user_id,
        username: username,
        board,
      };

      // Update state
      setAuthState(newAuthState);

      // Persist to IndexedDB - use the board parameter from login, not from context
      if (db) {
        try {
          await saveAuthState(db, board, newAuthState);
        } catch (error) {
          console.error('Failed to persist auth state:', error);
          message.warning('Login successful but failed to save session');
        }
      } else {
        console.error('Database not initialized');
        message.warning('Login successful but session may not persist');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getLogbook = useCallback(async (climbUuids: ClimbUuid[]) => {
    try {
      setCurrentClimbUuids(climbUuids); // Store the current climb UUIDs

      if (!authState.user_id) {
        setLogbook([]); // Clear logbook if not authenticated
        return;
      }

      const { token, user_id: userId } = authState;
      const response = await fetch(`/api/v1/${boardName}/proxy/getLogbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId: userId.toString(),
          climbUuids: climbUuids,
        }),
      });

      const data: LogbookEntry[] = await response.json();

      if (!response.ok) {
        throw new Error('Couldnt fetch logbook');
      }

      setLogbook(data);
    } catch (error) {
      setLogbook([]); // Clear logbook on error
      throw error;
    }
  }, [authState, boardName]);

  useEffect(() => {
    if (currentClimbUuids.length > 0) {
      getLogbook(currentClimbUuids);
    }
  }, [authState.token, authState.user_id, currentClimbUuids, getLogbook]);

  // Then update the saveAscent function
  const saveAscent = async (options: Omit<SaveAscentOptions, 'uuid'>) => {
    if (!authState.token || !authState.user_id) {
      throw new Error('Not authenticated');
    }
    const ascentUuid = generateUuid();

    const optimisticAscent: AscentSavedEvent['ascent'] & LogbookEntry = {
      ...options,
      attempt_id: 0,
      user_id: authState.user_id,
      wall_uuid: null, // Add the nullable wall_uuid
      is_listed: true,
      created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
      updated_at: new Date().toISOString().replace('T', ' ').split('.')[0],
      uuid: ascentUuid,
      is_ascent: true,
      tries: options.bid_count,
    };

    // Optimistically update the local state
    setLogbook((currentLogbook) => [optimisticAscent, ...currentLogbook]);

    try {
      const response = await fetch(`/api/v1/${boardName}/proxy/saveAscent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: authState.token,
          options: {
            ...options,
            user_id: authState.user_id,
            uuid: ascentUuid,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Unexpected response from backend, failed to save ascent`);
      }

      const data: SaveAscentResponse = await response.json();

      // Find the saved ascent from the response
      const savedAscentEvent = data.events.find((event): event is AscentSavedEvent => event._type === 'ascent_saved');

      if (savedAscentEvent) {
        // Update the logbook with the real ascent data
        setLogbook((currentLogbook) =>
          currentLogbook.map((ascent) =>
            ascent.uuid === ascentUuid
              ? {
                  ...savedAscentEvent.ascent,
                  tries: savedAscentEvent.ascent.bid_count,
                  is_ascent: true,
                }
              : ascent,
          ),
        );
      }

      return data;
    } catch (error) {
      message.error('Failed to save ascent');
      // Rollback on error
      setLogbook((currentLogbook) => currentLogbook.filter((ascent) => ascent.uuid !== ascentUuid));
      throw error;
    }
  };

  const logout = async () => {
    setAuthState({
      token: null,
      user_id: null,
      username: null,
      board: null,
    });
  };
  const value = {
    isAuthenticated: !!authState.token,
    token: authState.token,
    user_id: authState.user_id,
    username: authState.username,
    login,
    logout,
    isLoading,
    error,
    isInitialized,
    getLogbook,
    logbook,
    saveAscent,
    boardName,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoardProvider() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoardProvider must be used within a BoardProvider');
  }
  return context;
}

export type { BoardContextType };
export { BoardContext };
