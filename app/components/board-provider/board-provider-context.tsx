import React, { createContext, useContext, useState, useEffect } from 'react';
import { BoardName } from '@/app/lib/types';
import { IDBPDatabase, openDB } from 'idb';
import { Ascent, AscentSavedEvent, BoardUser, LoginResponse, SaveAscentResponse } from '@/app/lib/api-wrappers/aurora/types';
import { SaveAscentOptions } from '@/app/lib/api-wrappers/aurora/types';
import { generateUuid } from '@/app/lib/api-wrappers/aurora/util';

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
  getLogbook: () => Promise<void>;
  saveAscent: (options: SaveAscentOptions) => Promise<void>;
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
      throw error;
    }
  };

// Then update the saveAscent function
const saveAscent = async (options: SaveAscentOptions) => {
  if (!authState.token || !authState.user?.id) {
    throw new Error('Not authenticated');
  }
  const ascentUuid = generateUuid();

  const optimisticAscent: AscentSavedEvent['ascent'] = {
    ...options,
    attempt_id: 0,
    user_id: authState.user.id,
    wall_uuid: null, // Add the nullable wall_uuid
    is_listed: true,
    created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
    updated_at: new Date().toISOString().replace('T', ' ').split('.')[0],
    uuid: ascentUuid,
  };

  // Optimistically update the local state
  setLogbook(currentLogbook => [optimisticAscent, ...currentLogbook]);

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
          user_id: authState.user.id,
          uuid: ascentUuid,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save ascent');
    }

    const data: SaveAscentResponse = await response.json();
    
    // Find the saved ascent from the response
    const savedAscentEvent = data.events.find((event): event is AscentSavedEvent => 
      event._type === 'ascent_saved'
    );

    if (savedAscentEvent) {
      // Update the logbook with the real ascent data
      setLogbook(currentLogbook =>
        currentLogbook.map(ascent =>
          ascent.uuid === ascentUuid ? savedAscentEvent.ascent : ascent
        )
      );
    }

    return data;
  } catch (error) {
    // Rollback on error
    setLogbook(currentLogbook =>
      currentLogbook.filter(ascent => ascent.uuid !== ascentUuid)
    );
    throw error;
  }
};

  useEffect(() => {
    if (authState.token && logbook.length === 0) {
      getLogbook();
    }
  }, [authState, logbook.length]);

  const logout = async () => {
    setAuthState({
      token: null,
      user: null,
      board: null,
      loginInfo: null,
    });
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
    saveAscent,
  };

  // Don't render children until we've checked for existing auth
  if (!isInitialized) {
    return null;
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
