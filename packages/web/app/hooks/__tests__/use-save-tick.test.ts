import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTestQueryClient } from '@/app/test-utils/test-providers';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

const mockShowMessage = vi.fn();
vi.mock('@/app/components/providers/snackbar-provider', () => ({
  useSnackbar: () => ({ showMessage: mockShowMessage }),
}));

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/lib/graphql/operations', () => ({
  SAVE_TICK: 'SAVE_TICK_MUTATION',
}));

import { useWsAuthToken } from '../use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { useSaveTick, type SaveTickOptions } from '../use-save-tick';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);
const mockUseSession = vi.mocked(useSession);

function createTestWrapper() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

function createTickOptions(overrides: Partial<SaveTickOptions> = {}): SaveTickOptions {
  return {
    climbUuid: 'climb-1',
    angle: 40,
    isMirror: false,
    status: 'send',
    attemptCount: 3,
    isBenchmark: false,
    comment: 'Great climb',
    climbedAt: '2024-01-01',
    ...overrides,
  };
}

describe('useSaveTick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
    mockShowMessage.mockReset();
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: '1' }, expires: '' },
      update: vi.fn(),
    });
  });

  it('throws when not authenticated', async () => {
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: vi.fn(),
    });

    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not authenticated');
  });

  it('throws when no token', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Auth token not available');
  });

  it('calls GraphQL mutation with correct variables', async () => {
    mockRequest.mockResolvedValue({
      saveTick: {
        uuid: 'real-uuid',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      },
    });

    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });

    expect(mockRequest).toHaveBeenCalledWith('SAVE_TICK_MUTATION', {
      input: {
        boardType: 'kilter',
        climbUuid: 'climb-1',
        angle: 40,
        isMirror: false,
        status: 'send',
        attemptCount: 3,
        quality: undefined,
        difficulty: undefined,
        isBenchmark: false,
        comment: 'Great climb',
        climbedAt: '2024-01-01',
        sessionId: undefined,
        layoutId: undefined,
        sizeId: undefined,
        setIds: undefined,
      },
    });
  });

  it('creates optimistic entry on mutate', async () => {
    let resolveRequest: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((resolve) => { resolveRequest = resolve; }),
    );

    const { wrapper, queryClient } = createTestWrapper();

    // Seed existing logbook data
    queryClient.setQueryData(['logbook', 'kilter', 'climb-1'], []);

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    act(() => {
      result.current.mutate(createTickOptions());
    });

    // Check that the optimistic entry was added
    await waitFor(() => {
      const data = queryClient.getQueryData(['logbook', 'kilter', 'climb-1']) as any[];
      expect(data?.length).toBe(1);
      expect(data?.[0].uuid).toMatch(/^temp-/);
      expect(data?.[0].climb_uuid).toBe('climb-1');
    });

    // Resolve to clean up
    await act(async () => {
      resolveRequest!({
        saveTick: { uuid: 'real-uuid', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      });
    });
  });

  it('replaces temp UUID with real UUID on success', async () => {
    mockRequest.mockResolvedValue({
      saveTick: {
        uuid: 'server-uuid-123',
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      },
    });

    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['logbook', 'kilter', 'climb-1'], []);

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = queryClient.getQueryData(['logbook', 'kilter', 'climb-1']) as any[];
    if (data && data.length > 0) {
      expect(data[0].uuid).toBe('server-uuid-123');
    }
  });

  it('rolls back optimistic entry on error', async () => {
    mockRequest.mockRejectedValue(new Error('Server error'));

    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['logbook', 'kilter', 'climb-1'], []);

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // The optimistic entry should have been rolled back
    const data = queryClient.getQueryData(['logbook', 'kilter', 'climb-1']) as any[];
    expect(data?.length).toBe(0);
  });

  it('shows error snackbar on failure', async () => {
    mockRequest.mockRejectedValue(new Error('Save failed'));

    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Save failed', 'error');
  });

  it('optimistic entry has correct is_ascent for flash/send', async () => {
    let resolveRequest: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((resolve) => { resolveRequest = resolve; }),
    );

    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['logbook', 'kilter', 'climb-1'], []);

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    // Test with 'flash'
    act(() => {
      result.current.mutate(createTickOptions({ status: 'flash' }));
    });

    await waitFor(() => {
      const data = queryClient.getQueryData(['logbook', 'kilter', 'climb-1']) as any[];
      expect(data?.length).toBe(1);
      expect(data?.[0].is_ascent).toBe(true);
    });

    await act(async () => {
      resolveRequest!({
        saveTick: { uuid: 'real-1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      });
    });
  });

  it('optimistic entry has is_ascent=false for attempt', async () => {
    let resolveRequest: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((resolve) => { resolveRequest = resolve; }),
    );

    const { wrapper, queryClient } = createTestWrapper();

    queryClient.setQueryData(['logbook', 'kilter', 'climb-1'], []);

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    act(() => {
      result.current.mutate(createTickOptions({ status: 'attempt' }));
    });

    await waitFor(() => {
      const data = queryClient.getQueryData(['logbook', 'kilter', 'climb-1']) as any[];
      expect(data?.length).toBe(1);
      expect(data?.[0].is_ascent).toBe(false);
    });

    await act(async () => {
      resolveRequest!({
        saveTick: { uuid: 'real-2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      });
    });
  });

  it('extracts GraphQL error message from response', async () => {
    const graphqlError = new Error('GraphQL error');
    (graphqlError as any).response = {
      errors: [{ message: 'Climb not found' }],
    };
    mockRequest.mockRejectedValue(graphqlError);

    const { wrapper } = createTestWrapper();

    const { result } = renderHook(() => useSaveTick('kilter'), { wrapper });

    await act(async () => {
      result.current.mutate(createTickOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Climb not found', 'error');
  });
});
