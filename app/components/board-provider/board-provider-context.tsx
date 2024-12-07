// contexts/BoardProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BoardName } from '@/app/lib/types';

import { IDBPDatabase, openDB } from 'idb';
import { Ascent } from '@/app/lib/api-wrappers/aurora/types';

const DB_NAME = 'boardsesh';
const DB_VERSION = 1;

const initDB = (board_name: BoardName) => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the store if it doesn't exist
      if (!db.objectStoreNames.contains(board_name)) {
        db.createObjectStore(board_name);
      }
    },
  });
};

const loadAuthState = async (db: IDBPDatabase, board_name: BoardName) => {
  return db.get(board_name, 'auth');
};
const saveAuthState = async (db: IDBPDatabase, board_name: BoardName, value: AuthState) => {
  return db.put(board_name, value, 'auth');
};

interface BoardUser {
  id: number;
  username: string;
  email_address: string;
  created_at: string;
  updated_at: string;
  is_listed: boolean;
  is_public: boolean;
  avatar_image: string | null;
  banner_image: string | null;
  city: string | null;
  country: string | null;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
}

interface LoginResponse {
  error: string;
  login: {
    created_at: string;
    token: string;
    user_id: number;
  };
  token: string;
  user: BoardUser;
  user_id: number;
  username: string;
}

interface AuthState {
  token: string | null;
  user: BoardUser | null;
  board: BoardName | null;
  loginInfo: {
    created_at: string;
    user_id: number;
  } | null;
}

interface BoardContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: BoardUser | null;
  loginInfo: AuthState['loginInfo'];
  login: (board: BoardName, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  logbook: Ascent[];
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ boardName, children }: { boardName: BoardName; children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    board: null,
    loginInfo: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [logbook, setLogbook] = useState<Ascent[]>([]);

  // Load saved auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const db = await initDB(boardName);
        const savedState = await loadAuthState(db, boardName);

        if (savedState) {
          setAuthState({
            token: savedState.token,
            user: savedState.user,
            board: savedState.board,
            loginInfo: savedState.loginInfo,
          });
        }

        setDb(db);
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [boardName]);

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

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const newAuthState = {
        token: data.token,
        user: data.user,
        board,
        loginInfo: {
          created_at: data.login.created_at,
          user_id: data.login.user_id,
        },
      };

      // Update state and persist to IndexedDB
      setAuthState(newAuthState);
      if (db) {
        await saveAuthState(db, boardName, newAuthState);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getLogbook = async () => {
    try {
      if (!authState.user?.id) {
        return;
      }

      const {
        token,
        user: { id: userId },
      } = authState;
      const response = await fetch(`/api/v1/${boardName}/proxy/getLogbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, userId: userId.toString() }),
      });

      const data: Ascent[] = await response.json();

      if (!response.ok) {
        throw new Error('Couldnt fetch logbook');
      }

      setLogbook(data);
    } catch (error) {
      // const message = error instanceof Error ? error.message : 'An error occurred';
      // setError(message);
      throw error;
    } finally {
    }
  };

  useEffect(() => {
    if (authState.token && logbook.length === 0) {
      // TODO: Move getLogbook to callback
      getLogbook();
    }
  }, [authState, logbook.length]);

  const logout = async () => {
    // Clear state and IndexedDB
    setAuthState({
      token: null,
      user: null,
      board: null,
      loginInfo: null,
    });
    // await clearAuthState();
  };

  const value = {
    isAuthenticated: !!authState.token,
    token: authState.token,
    user: authState.user,
    loginInfo: authState.loginInfo,
    login,
    logout,
    isLoading,
    error,
    isInitialized,
    getLogbook,
    logbook,
  };

  // Don't render children until we've checked for existing auth
  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoardProvider() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoardProvider must be used within a BoardProvider');
  }
  return context;
}

export type { BoardUser, LoginResponse, BoardContextType };
export { BoardContext };
