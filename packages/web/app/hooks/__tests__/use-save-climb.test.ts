import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createQueryWrapper } from '@/app/test-utils/test-providers';

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

const mockExecute = vi.fn();
const mockDispose = vi.fn();
vi.mock('@/app/components/graphql-queue/graphql-client', () => ({
  createGraphQLClient: () => ({ dispose: mockDispose }),
  execute: (...args: unknown[]) => mockExecute(...args),
}));

vi.mock('@/app/lib/graphql/operations/new-climb-feed', () => ({
  SAVE_CLIMB_MUTATION: 'SAVE_CLIMB_MUTATION',
}));

import { useWsAuthToken } from '../use-ws-auth-token';
import { useSession } from 'next-auth/react';
import { useSaveClimb } from '../use-save-climb';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);
const mockUseSession = vi.mocked(useSession);

function createClimbOptions() {
  return {
    layout_id: 1,
    name: 'Test Climb',
    description: 'A test climb',
    is_draft: false,
    frames: 'p1r12',
    frames_count: 1,
    frames_pace: 0,
    angle: 40,
  };
}

describe('useSaveClimb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    mockDispose.mockReset();
    mockShowMessage.mockReset();
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'user-1' }, expires: '' },
      update: vi.fn(),
    });
  });

  it('throws when not authenticated', async () => {
    mockUseSession.mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: vi.fn(),
    });

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Authentication required to create climbs');
  });

  it('throws when no token', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Authentication required to create climbs');
  });

  it('creates GraphQL client and executes mutation', async () => {
    mockExecute.mockResolvedValue({
      saveClimb: { uuid: 'new-climb-uuid' },
    });

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockExecute).toHaveBeenCalled();
    const callArgs = mockExecute.mock.calls[0];
    // First arg is the client, second is { query, variables }
    expect(callArgs[1]).toEqual({
      query: 'SAVE_CLIMB_MUTATION',
      variables: {
        input: {
          boardType: 'kilter',
          layoutId: 1,
          name: 'Test Climb',
          description: 'A test climb',
          isDraft: false,
          frames: 'p1r12',
          framesCount: 1,
          framesPace: 0,
          angle: 40,
        },
      },
    });
  });

  it('returns SaveClimbResponse with uuid', async () => {
    mockExecute.mockResolvedValue({
      saveClimb: { uuid: 'result-uuid-123' },
    });

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ uuid: 'result-uuid-123' });
  });

  it('disposes client after success', async () => {
    mockExecute.mockResolvedValue({
      saveClimb: { uuid: 'uuid-1' },
    });

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockDispose).toHaveBeenCalled();
  });

  it('shows error snackbar on failure', async () => {
    mockExecute.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Failed to save climb', 'error');
  });

  it('disposes client even on error (finally block)', async () => {
    mockExecute.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useSaveClimb('kilter'), {
      wrapper: createQueryWrapper(),
    });

    await act(async () => {
      result.current.mutate(createClimbOptions());
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockDispose).toHaveBeenCalled();
  });
});
