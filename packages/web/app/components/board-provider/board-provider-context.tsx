'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BoardName, ClimbUuid } from '@/app/lib/types';
import { SaveClimbOptions } from '@/app/lib/api-wrappers/aurora/types';
import { message } from 'antd';
import { useSession } from 'next-auth/react';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_TICKS,
  SAVE_TICK,
  type GetTicksQueryVariables,
  type GetTicksQueryResponse,
  type SaveTickMutationVariables,
  type SaveTickMutationResponse,
} from '@/app/lib/graphql/operations';

interface AuthState {
  token: string | null;
  user_id: number | null;
  username: string | null;
  board: BoardName | null;
}

export interface SaveClimbResponse {
  uuid: string;
}

// Tick status type matching the database enum
export type TickStatus = 'flash' | 'send' | 'attempt';

// Options for saving a tick (local storage, no Aurora required)
export interface SaveTickOptions {
  climbUuid: string;
  angle: number;
  isMirror: boolean;
  status: TickStatus;
  attemptCount: number;
  quality?: number; // 1-5, optional for attempts
  difficulty?: number; // optional for attempts
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
  sessionId?: string;
}

// Logbook entry that works for both local ticks and legacy Aurora entries
export interface LogbookEntry {
  uuid: string;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  user_id: number;
  attempt_id: number;
  tries: number;
  quality: number | null;
  difficulty: number | null;
  is_benchmark: boolean;
  is_listed: boolean;
  comment: string;
  climbed_at: string;
  created_at: string;
  updated_at: string;
  wall_uuid: string | null;
  is_ascent: boolean;
  status?: TickStatus;
  aurora_synced?: boolean;
}

interface BoardContextType {
  boardName: BoardName;
  isAuthenticated: boolean;
  hasAuroraCredentials: boolean;
  token: string | null;
  user_id: number | null;
  username: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  logbook: LogbookEntry[];
  getLogbook: (climbUuids: ClimbUuid[]) => Promise<boolean>;
  saveTick: (options: SaveTickOptions) => Promise<void>;
  saveClimb: (options: Omit<SaveClimbOptions, 'setter_id'>) => Promise<SaveClimbResponse>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ boardName, children }: { boardName: BoardName; children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  // Use wsAuthToken for GraphQL backend auth (NextAuth session token)
  const { token: wsAuthToken } = useWsAuthToken();
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user_id: null,
    username: null,
    board: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  // Use ref to track climb UUIDs to avoid re-render loops
  const currentClimbUuidsRef = useRef<ClimbUuid[]>([]);
  const lastSessionStatusRef = useRef<string>(sessionStatus);

  // Fetch Aurora credentials when session changes (still useful for saveClimb)
  useEffect(() => {
    let mounted = true;

    const fetchAuroraCredentials = async () => {
      if (sessionStatus === 'loading') {
        return;
      }

      if (sessionStatus !== 'authenticated') {
        setAuthState({
          token: null,
          user_id: null,
          username: null,
          board: null,
        });
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/internal/aurora-credentials/${boardName}`);

        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          setAuthState({
            token: data.token,
            user_id: data.user_id,
            username: data.username,
            board: boardName,
          });
        } else {
          setAuthState({
            token: null,
            user_id: null,
            username: null,
            board: null,
          });
        }
      } catch (err) {
        console.error('Failed to fetch Aurora credentials:', err);
        if (mounted) {
          setError('Failed to load Aurora credentials');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    fetchAuroraCredentials();

    return () => {
      mounted = false;
    };
  }, [boardName, sessionStatus]);

  // Internal fetch function (not memoized, called by getLogbook and effect)
  // Returns true if the fetch was successful, false if it was skipped or failed
  const fetchLogbook = async (climbUuids: ClimbUuid[]): Promise<boolean> => {
    if (sessionStatus !== 'authenticated') {
      setLogbook([]);
      return false;
    }

    // CRITICAL: Wait for wsAuthToken to be available
    if (!wsAuthToken) {
      console.log('[fetchLogbook] Waiting for auth token...');
      return false; // Caller should retry when wsAuthToken becomes available
    }

    try {
      const client = createGraphQLHttpClient(wsAuthToken);

      const variables: GetTicksQueryVariables = {
        input: {
          boardType: boardName,
          climbUuids: climbUuids.length > 0 ? climbUuids : undefined,
        }
      };

      const response = await client.request<GetTicksQueryResponse>(GET_TICKS, variables);

      // Transform to LogbookEntry format for backward compatibility
      const entries: LogbookEntry[] = response.ticks.map((tick) => ({
        uuid: tick.uuid,
        climb_uuid: tick.climbUuid,
        angle: tick.angle,
        is_mirror: tick.isMirror,
        user_id: 0,
        attempt_id: 0,
        tries: tick.attemptCount,
        quality: tick.quality,
        difficulty: tick.difficulty,
        is_benchmark: tick.isBenchmark,
        is_listed: true,
        comment: tick.comment,
        climbed_at: tick.climbedAt,
        created_at: tick.createdAt,
        updated_at: tick.updatedAt,
        wall_uuid: null,
        is_ascent: tick.status === 'flash' || tick.status === 'send',
        status: tick.status,
        aurora_synced: tick.auroraId !== null,
      }));

      setLogbook(entries);
      return true;
    } catch (err) {
      console.error('Failed to fetch logbook:', err);
      setLogbook([]);
      return false;
    }
  };

  // Fetch logbook from local ticks API (works without Aurora credentials)
  // Returns true if the fetch was successful, false if it was skipped or failed
  const getLogbook = useCallback(async (climbUuids: ClimbUuid[]): Promise<boolean> => {
    // Store the UUIDs in ref to avoid re-render loops
    currentClimbUuidsRef.current = climbUuids;
    return await fetchLogbook(climbUuids);
  }, [boardName, sessionStatus, wsAuthToken]);

  // Refetch logbook only when session status changes from non-authenticated to authenticated
  useEffect(() => {
    const wasAuthenticated = lastSessionStatusRef.current === 'authenticated';
    const isNowAuthenticated = sessionStatus === 'authenticated';
    lastSessionStatusRef.current = sessionStatus;

    // Only refetch if we just became authenticated, have token, and have climb UUIDs
    if (!wasAuthenticated && isNowAuthenticated && wsAuthToken && currentClimbUuidsRef.current.length > 0) {
      fetchLogbook(currentClimbUuidsRef.current);
    } else if (!isNowAuthenticated) {
      setLogbook([]);
    }
  }, [sessionStatus, boardName, wsAuthToken]);

  // Save a tick to local storage (no Aurora credentials required)
  const saveTick = async (options: SaveTickOptions) => {
    if (sessionStatus !== 'authenticated') {
      throw new Error('Not authenticated');
    }

    const tempUuid = `temp-${Date.now()}`;
    const optimisticEntry: LogbookEntry = {
      uuid: tempUuid,
      climb_uuid: options.climbUuid,
      angle: options.angle,
      is_mirror: options.isMirror,
      user_id: 0,
      attempt_id: 0,
      tries: options.attemptCount,
      quality: options.quality ?? null,
      difficulty: options.difficulty ?? null,
      is_benchmark: options.isBenchmark,
      is_listed: true,
      comment: options.comment,
      climbed_at: options.climbedAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      wall_uuid: null,
      is_ascent: options.status === 'flash' || options.status === 'send',
      status: options.status,
      aurora_synced: false,
    };

    // Optimistically update the logbook
    setLogbook((currentLogbook) => [optimisticEntry, ...currentLogbook]);

    try {
      const client = createGraphQLHttpClient(wsAuthToken);

      const variables: SaveTickMutationVariables = {
        input: {
          boardType: boardName,
          climbUuid: options.climbUuid,
          angle: options.angle,
          isMirror: options.isMirror,
          status: options.status,
          attemptCount: options.attemptCount,
          quality: options.quality,
          difficulty: options.difficulty,
          isBenchmark: options.isBenchmark,
          comment: options.comment,
          climbedAt: options.climbedAt,
          sessionId: options.sessionId,
        }
      };

      const response = await client.request<SaveTickMutationResponse>(SAVE_TICK, variables);
      const tick = response.saveTick;

      // Update the optimistic entry with the real data
      setLogbook((currentLogbook) =>
        currentLogbook.map((entry) =>
          entry.uuid === tempUuid
            ? {
                ...entry,
                uuid: tick.uuid,
                created_at: tick.createdAt,
                updated_at: tick.updatedAt,
              }
            : entry
        )
      );
    } catch (err) {
      console.error('Failed to save tick:', err);

      // Extract error message for user display
      let errorMessage = 'Failed to save tick';
      if (err instanceof Error) {
        // GraphQL errors often have structured error info
        if ('response' in err && typeof err.response === 'object' && err.response !== null) {
          const response = err.response as { errors?: Array<{ message: string }> };
          if (response.errors && response.errors.length > 0) {
            errorMessage = response.errors[0].message;
          }
        } else {
          errorMessage = err.message;
        }
      }

      message.error(errorMessage);

      // Rollback on error
      setLogbook((currentLogbook) =>
        currentLogbook.filter((entry) => entry.uuid !== tempUuid)
      );
      throw err;
    }
  };

  // Save a climb (still requires Aurora credentials)
  const saveClimb = async (options: Omit<SaveClimbOptions, 'setter_id'>): Promise<SaveClimbResponse> => {
    if (!authState.token || !authState.user_id) {
      throw new Error('Aurora credentials required to create climbs');
    }

    try {
      const response = await fetch(`/api/v1/${boardName}/proxy/saveClimb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: authState.token,
          options: {
            ...options,
            setter_id: authState.user_id,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save climb');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      message.error('Failed to save climb');
      throw err;
    }
  };

  const value = {
    isAuthenticated: sessionStatus === 'authenticated',
    hasAuroraCredentials: !!authState.token && !!authState.user_id,
    token: authState.token,
    user_id: authState.user_id,
    username: authState.username,
    isLoading,
    error,
    isInitialized,
    getLogbook,
    logbook,
    saveTick,
    saveClimb,
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
