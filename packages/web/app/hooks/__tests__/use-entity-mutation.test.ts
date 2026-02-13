import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

const mockShowMessage = vi.fn();
vi.mock('@/app/components/providers/snackbar-provider', () => ({
  useSnackbar: () => ({ showMessage: mockShowMessage }),
}));

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useEntityMutation } from '../use-entity-mutation';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

describe('useEntityMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();
    mockShowMessage.mockReset();
  });

  it('returns null and shows auth error when no token', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        errorMessage: 'Failed',
      }),
    );

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.execute({ input: 'test' });
    });

    expect(returnValue).toBeNull();
    expect(mockShowMessage).toHaveBeenCalledWith('You must be signed in', 'error');
  });

  it('executes mutation and returns data on success', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const mockData = { result: 'success' };
    mockRequest.mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        errorMessage: 'Failed',
      }),
    );

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.execute({ input: 'test' });
    });

    expect(returnValue).toEqual(mockData);
  });

  it('shows success message when provided', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({ ok: true });

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        successMessage: 'Done!',
        errorMessage: 'Failed',
      }),
    );

    await act(async () => {
      await result.current.execute({ input: 'test' });
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Done!', 'success');
  });

  it('shows error message on failure', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        errorMessage: 'Operation failed',
      }),
    );

    await act(async () => {
      await result.current.execute({ input: 'test' });
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Operation failed', 'error');
  });

  it('logs error on failure', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const error = new Error('Network error');
    mockRequest.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        errorMessage: 'Operation failed',
      }),
    );

    await act(async () => {
      await result.current.execute({ input: 'test' });
    });

    expect(consoleSpy).toHaveBeenCalledWith('Operation failed', error);
    consoleSpy.mockRestore();
  });

  it('does not show success message when not provided', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockRequest.mockResolvedValue({ ok: true });

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        errorMessage: 'Failed',
      }),
    );

    await act(async () => {
      await result.current.execute({ input: 'test' });
    });

    expect(mockShowMessage).not.toHaveBeenCalled();
  });

  it('returns token from useWsAuthToken', () => {
    mockUseWsAuthToken.mockReturnValue({
      token: 'my-token-abc',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useEntityMutation('SOME_MUTATION', {
        errorMessage: 'Failed',
      }),
    );

    expect(result.current.token).toBe('my-token-abc');
  });
});
