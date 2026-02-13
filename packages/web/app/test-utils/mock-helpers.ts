import { vi } from 'vitest';

/**
 * Returns a mock shape for useWsAuthToken() with sensible defaults.
 */
export function mockWsAuthToken(overrides?: Partial<{
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}>) {
  return {
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    ...overrides,
  };
}

/**
 * Returns a mock NextAuth session object.
 */
export function mockSession(overrides?: Partial<{
  user: { id: string; name: string; email: string };
  expires: string;
}>) {
  return {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    expires: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Returns a mock snackbar with a `showMessage` spy.
 */
export function mockSnackbar() {
  return { showMessage: vi.fn() };
}

/**
 * Returns a mock GraphQL HTTP client with a `request` spy.
 */
export function mockGraphQLClient() {
  return { request: vi.fn() };
}
