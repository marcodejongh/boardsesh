import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueueState } from '@boardsesh/shared-schema';

// Mock the persistent-session-context module to override the backend URL check
// We need to do this because process.env.NEXT_PUBLIC_WS_URL is read at module load time
vi.mock('./persistent-session-context', async (importOriginal) => {
  // Set the env var before importing the original module
  process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:4000';
  const original = await importOriginal();
  return original;
});

import { PersistentSessionProvider, usePersistentSession, Session } from './persistent-session-context';
import * as graphqlClientModule from '../graphql-queue/graphql-client';

// Mock the graphql-client module
vi.mock('../graphql-queue/graphql-client', () => ({
  createGraphQLClient: vi.fn(),
  execute: vi.fn(),
  subscribe: vi.fn(),
}));

// Mock useWsAuthToken hook
vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: () => ({ token: 'mock-token', isLoading: false }),
}));

// Mock usePartyProfile hook
vi.mock('../party-manager/party-profile-context', () => ({
  usePartyProfile: () => ({ username: 'TestUser', avatarUrl: null }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/kilter/1/2/3/45',
}));

describe('PersistentSessionContext', () => {
  let mockClient: {
    dispose: Mock;
  };
  let capturedOnReconnect: (() => void) | undefined;
  let mockQueueUnsubscribe: Mock;
  let mockSessionUnsubscribe: Mock;

  const mockSession: Session = {
    id: 'test-session',
    boardPath: '/kilter/1/2/3/45',
    users: [{ id: 'user-1', username: 'TestUser', isLeader: true }],
    queueState: {
      queue: [],
      currentClimbQueueItem: null,
    },
    isLeader: true,
    clientId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock client
    mockClient = {
      dispose: vi.fn(),
    };

    mockQueueUnsubscribe = vi.fn();
    mockSessionUnsubscribe = vi.fn();
    capturedOnReconnect = undefined;

    // Mock createGraphQLClient to capture onReconnect callback
    vi.mocked(graphqlClientModule.createGraphQLClient).mockImplementation((options: any) => {
      capturedOnReconnect = options.onReconnect;
      return mockClient as any;
    });

    // Mock execute to return successful joinSession
    vi.mocked(graphqlClientModule.execute).mockResolvedValue({
      joinSession: mockSession,
    });

    // Mock subscribe to return unsubscribe functions and track calls
    let subscribeCallCount = 0;
    vi.mocked(graphqlClientModule.subscribe).mockImplementation(() => {
      subscribeCallCount++;
      if (subscribeCallCount % 2 === 1) {
        return mockQueueUnsubscribe;
      }
      return mockSessionUnsubscribe;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PersistentSessionProvider>{children}</PersistentSessionProvider>
  );

  describe('Initial connection', () => {
    it('should setup graphql client with onReconnect callback when session is activated', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      // Wait for connection to be established
      await waitFor(() => {
        expect(graphqlClientModule.createGraphQLClient).toHaveBeenCalled();
      });

      // Verify onReconnect was passed to client
      expect(capturedOnReconnect).toBeDefined();
      expect(typeof capturedOnReconnect).toBe('function');
    });

    it('should call execute with joinSession mutation on connect', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(graphqlClientModule.execute).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            variables: expect.objectContaining({
              sessionId: 'test-session',
              boardPath: '/kilter/1/2/3/45',
            }),
          })
        );
      });
    });

    it('should setup queue and session subscriptions after joining', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        // Should have 2 subscriptions: queue and session
        expect(graphqlClientModule.subscribe).toHaveBeenCalledTimes(2);
      });
    });

    it('should set hasConnected to true after successful connection', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      expect(result.current.hasConnected).toBe(false);

      // Activate session
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });
    });

    it('should populate queue state from joinSession response', async () => {
      const mockQueueState: QueueState = {
        queue: [
          {
            uuid: 'item-1',
            climb: {
              uuid: 'climb-1',
              name: 'Test Climb',
              setter_username: 'setter',
              description: '',
              frames: '',
              angle: 45,
              ascensionist_count: 0,
              difficulty: 'V5',
              quality_average: 3,
              stars: 3,
              difficulty_error: 0,
              litUpHoldsMap: {},
              mirrored: false,
            },
            addedBy: 'user-1',
          },
        ] as any,
        currentClimbQueueItem: null,
      };

      vi.mocked(graphqlClientModule.execute).mockResolvedValue({
        joinSession: {
          ...mockSession,
          queueState: mockQueueState,
        },
      });

      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.queue).toHaveLength(1);
        expect(result.current.queue[0].uuid).toBe('item-1');
      });
    });
  });

  describe('Reconnection handling', () => {
    it('should call joinSession again when onReconnect is triggered', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session and wait for initial connection
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Clear mocks to track reconnection calls
      vi.mocked(graphqlClientModule.execute).mockClear();
      vi.mocked(graphqlClientModule.subscribe).mockClear();

      // Trigger reconnection
      await act(async () => {
        capturedOnReconnect?.();
        // Give time for async operations
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should call execute (joinSession) again
      expect(graphqlClientModule.execute).toHaveBeenCalled();
    });

    it('should re-establish subscriptions on reconnect', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session and wait for initial connection
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Initial setup should have 2 subscriptions
      expect(graphqlClientModule.subscribe).toHaveBeenCalledTimes(2);

      // Clear mocks to track reconnection calls
      vi.mocked(graphqlClientModule.subscribe).mockClear();

      // Trigger reconnection
      await act(async () => {
        capturedOnReconnect?.();
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should set up subscriptions again (2 more calls)
      await waitFor(() => {
        expect(graphqlClientModule.subscribe).toHaveBeenCalledTimes(2);
      });
    });

    it('should clean up old subscriptions before setting up new ones', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session and wait for initial connection
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Trigger reconnection
      await act(async () => {
        capturedOnReconnect?.();
        await new Promise((r) => setTimeout(r, 50));
      });

      // Old subscriptions should have been unsubscribed
      expect(mockQueueUnsubscribe).toHaveBeenCalled();
      expect(mockSessionUnsubscribe).toHaveBeenCalled();
    });

    it('should update queue state from reconnection joinSession response', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session and wait for initial connection
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Initial queue should be empty
      expect(result.current.queue).toHaveLength(0);

      // Mock execute to return updated queue on reconnect
      const updatedQueueState: QueueState = {
        queue: [
          {
            uuid: 'new-item',
            climb: {
              uuid: 'new-climb',
              name: 'New Climb',
              setter_username: 'setter',
              description: '',
              frames: '',
              angle: 45,
              ascensionist_count: 0,
              difficulty: 'V5',
              quality_average: 3,
              stars: 3,
              difficulty_error: 0,
              litUpHoldsMap: {},
              mirrored: false,
            },
            addedBy: 'user-1',
          },
        ] as any,
        currentClimbQueueItem: null,
      };

      vi.mocked(graphqlClientModule.execute).mockResolvedValue({
        joinSession: {
          ...mockSession,
          queueState: updatedQueueState,
        },
      });

      // Trigger reconnection
      await act(async () => {
        capturedOnReconnect?.();
        await new Promise((r) => setTimeout(r, 50));
      });

      // Queue should be updated with new data
      await waitFor(() => {
        expect(result.current.queue).toHaveLength(1);
        expect(result.current.queue[0].uuid).toBe('new-item');
      });
    });
  });

  describe('Visibility change handling', () => {
    it('should resync when tab becomes visible after being hidden for threshold duration', async () => {
      // Mock Date.now for consistent timing
      const originalNow = Date.now;
      let currentTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session and wait for initial connection
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Clear mocks to track visibility resync
      vi.mocked(graphqlClientModule.execute).mockClear();

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Advance time beyond threshold (30 seconds)
      currentTime += 35000;

      // Simulate tab becoming visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        // Give time for async operations
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should have triggered resync (joinSession call)
      expect(graphqlClientModule.execute).toHaveBeenCalled();

      // Restore Date.now
      vi.spyOn(Date, 'now').mockRestore();
    });

    it('should NOT resync when tab was hidden for less than threshold duration', async () => {
      // Mock Date.now for consistent timing
      let currentTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session and wait for initial connection
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Clear mocks
      vi.mocked(graphqlClientModule.execute).mockClear();

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Advance time by only 10 seconds (less than 30 second threshold)
      currentTime += 10000;

      // Simulate tab becoming visible
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should NOT have triggered resync
      expect(graphqlClientModule.execute).not.toHaveBeenCalled();

      // Restore Date.now
      vi.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Session deactivation', () => {
    it('should clean up resources when session is deactivated', async () => {
      const { result } = renderHook(() => usePersistentSession(), { wrapper });

      // Activate session
      act(() => {
        result.current.activateSession({
          sessionId: 'test-session',
          boardPath: '/kilter/1/2/3/45',
          boardDetails: {} as any,
          parsedParams: {} as any,
        });
      });

      await waitFor(() => {
        expect(result.current.hasConnected).toBe(true);
      });

      // Deactivate session
      act(() => {
        result.current.deactivateSession();
      });

      // Queue should be cleared
      expect(result.current.queue).toHaveLength(0);
      expect(result.current.currentClimbQueueItem).toBeNull();
    });
  });
});
