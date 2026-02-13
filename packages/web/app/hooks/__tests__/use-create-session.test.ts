import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/app/hooks/use-ws-auth-token', () => ({
  useWsAuthToken: vi.fn(),
}));

const mockRequest = vi.fn();
vi.mock('@/app/lib/graphql/client', () => ({
  createGraphQLHttpClient: () => ({ request: mockRequest }),
}));

vi.mock('@/app/lib/graphql/operations/create-session', () => ({
  CREATE_SESSION: 'CREATE_SESSION_MUTATION',
}));

import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useCreateSession } from '../use-create-session';

const mockUseWsAuthToken = vi.mocked(useWsAuthToken);

function createFormData(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Session',
    goal: 'Climb hard',
    color: '#ff0000',
    isPermanent: false,
    discoverable: false,
    ...overrides,
  };
}

describe('useCreateSession', () => {
  let mockGeolocation: {
    getCurrentPosition: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockReset();

    mockUseWsAuthToken.mockReturnValue({
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    // Mock navigator.geolocation
    mockGeolocation = {
      getCurrentPosition: vi.fn(),
    };
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when no token', async () => {
    mockUseWsAuthToken.mockReturnValue({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useCreateSession());

    await expect(
      act(async () => {
        await result.current.createSession(createFormData() as any, '/kilter/1/2/3/40');
      }),
    ).rejects.toThrow('Not authenticated');
  });

  it('creates session with geolocation when discoverable', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: (pos: { coords: { latitude: number; longitude: number } }) => void) => {
        success({ coords: { latitude: 37.7749, longitude: -122.4194 } });
      },
    );

    mockRequest.mockResolvedValue({
      createSession: {
        id: 'session-123',
        name: 'Test Session',
        boardPath: '/kilter/1/2/3/40',
        goal: 'Climb hard',
        isPublic: true,
        isPermanent: false,
        color: '#ff0000',
        startedAt: '2024-01-01T00:00:00Z',
      },
    });

    const { result } = renderHook(() => useCreateSession());

    let sessionId: string | undefined;
    await act(async () => {
      sessionId = await result.current.createSession(
        createFormData({ discoverable: true }) as any,
        '/kilter/1/2/3/40',
      );
    });

    expect(sessionId).toBe('session-123');
    expect(mockRequest).toHaveBeenCalledWith(
      'CREATE_SESSION_MUTATION',
      {
        input: {
          boardPath: '/kilter/1/2/3/40',
          latitude: 37.7749,
          longitude: -122.4194,
          discoverable: true,
          name: 'Test Session',
          goal: 'Climb hard',
          color: '#ff0000',
          isPermanent: false,
        },
      },
    );
  });

  it('creates session without geolocation when not discoverable', async () => {
    mockRequest.mockResolvedValue({
      createSession: {
        id: 'session-456',
        name: 'Private Session',
        boardPath: '/kilter/1/2/3/40',
        goal: null,
        isPublic: false,
        isPermanent: false,
        color: null,
        startedAt: '2024-01-01T00:00:00Z',
      },
    });

    const { result } = renderHook(() => useCreateSession());

    let sessionId: string | undefined;
    await act(async () => {
      sessionId = await result.current.createSession(
        createFormData({ discoverable: false }) as any,
        '/kilter/1/2/3/40',
      );
    });

    expect(sessionId).toBe('session-456');
    // Should NOT have called geolocation
    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    // Should pass 0,0 for coordinates
    const callArgs = mockRequest.mock.calls[0][1];
    expect(callArgs.input.latitude).toBe(0);
    expect(callArgs.input.longitude).toBe(0);
  });

  it('falls back to 0,0 when geolocation fails', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation(
      (_success: unknown, error: (err: unknown) => void) => {
        error(new Error('Permission denied'));
      },
    );

    mockRequest.mockResolvedValue({
      createSession: {
        id: 'session-789',
        name: 'Test',
        boardPath: '/kilter/1/2/3/40',
        goal: null,
        isPublic: true,
        isPermanent: false,
        color: null,
        startedAt: '2024-01-01T00:00:00Z',
      },
    });

    const { result } = renderHook(() => useCreateSession());

    await act(async () => {
      await result.current.createSession(
        createFormData({ discoverable: true }) as any,
        '/kilter/1/2/3/40',
      );
    });

    const callArgs = mockRequest.mock.calls[0][1];
    expect(callArgs.input.latitude).toBe(0);
    expect(callArgs.input.longitude).toBe(0);
  });

  it('falls back to 0,0 when geolocation not available', async () => {
    // Remove geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    mockRequest.mockResolvedValue({
      createSession: {
        id: 'session-no-geo',
        name: 'Test',
        boardPath: '/kilter/1/2/3/40',
        goal: null,
        isPublic: true,
        isPermanent: false,
        color: null,
        startedAt: '2024-01-01T00:00:00Z',
      },
    });

    const { result } = renderHook(() => useCreateSession());

    await act(async () => {
      await result.current.createSession(
        createFormData({ discoverable: true }) as any,
        '/kilter/1/2/3/40',
      );
    });

    const callArgs = mockRequest.mock.calls[0][1];
    expect(callArgs.input.latitude).toBe(0);
    expect(callArgs.input.longitude).toBe(0);
  });

  it('sets isCreating during operation', async () => {
    let resolveRequest: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((resolve) => { resolveRequest = resolve; }),
    );

    const { result } = renderHook(() => useCreateSession());

    expect(result.current.isCreating).toBe(false);

    let createPromise: Promise<string>;
    act(() => {
      createPromise = result.current.createSession(createFormData() as any, '/kilter/1/2/3/40');
    });

    expect(result.current.isCreating).toBe(true);

    await act(async () => {
      resolveRequest!({
        createSession: {
          id: 'session-1',
          name: 'Test',
          boardPath: '/kilter/1/2/3/40',
          goal: null,
          isPublic: false,
          isPermanent: false,
          color: null,
          startedAt: '2024-01-01T00:00:00Z',
        },
      });
      await createPromise!;
    });

    expect(result.current.isCreating).toBe(false);
  });

  it('returns session ID on success', async () => {
    mockRequest.mockResolvedValue({
      createSession: {
        id: 'returned-session-id',
        name: 'Test',
        boardPath: '/kilter/1/2/3/40',
        goal: null,
        isPublic: false,
        isPermanent: false,
        color: null,
        startedAt: '2024-01-01T00:00:00Z',
      },
    });

    const { result } = renderHook(() => useCreateSession());

    let sessionId: string | undefined;
    await act(async () => {
      sessionId = await result.current.createSession(createFormData() as any, '/kilter/1/2/3/40');
    });

    expect(sessionId).toBe('returned-session-id');
  });

  it('resets isCreating even on error', async () => {
    mockRequest.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useCreateSession());

    await expect(
      act(async () => {
        await result.current.createSession(createFormData() as any, '/kilter/1/2/3/40');
      }),
    ).rejects.toThrow('Server error');

    expect(result.current.isCreating).toBe(false);
  });
});
