import { vi } from 'vitest';

/**
 * Mocks navigator.geolocation for testing.
 * Returns the mock getCurrentPosition function for assertions.
 */
export function setupGeolocationMock() {
  const getCurrentPosition = vi.fn();
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition, watchPosition, clearWatch },
    configurable: true,
    writable: true,
  });

  return { getCurrentPosition, watchPosition, clearWatch };
}

/**
 * Mocks navigator.wakeLock for testing.
 * Returns helpers to control the mock sentinel.
 */
export function setupWakeLockMock() {
  const releaseFn = vi.fn().mockResolvedValue(undefined);
  let releaseHandler: (() => void) | null = null;

  const sentinel = {
    released: false,
    release: releaseFn,
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'release') releaseHandler = handler;
    }),
    removeEventListener: vi.fn(),
    type: 'screen' as WakeLockType,
    onrelease: null,
  };

  const requestFn = vi.fn().mockResolvedValue(sentinel);

  Object.defineProperty(navigator, 'wakeLock', {
    value: { request: requestFn },
    configurable: true,
    writable: true,
  });

  return {
    request: requestFn,
    release: releaseFn,
    sentinel,
    /** Simulate the browser releasing the lock (e.g., page hidden) */
    triggerRelease: () => releaseHandler?.(),
  };
}

/**
 * Mocks the IntersectionObserver API.
 * Returns a helper to trigger intersection callbacks.
 */
export function setupIntersectionObserverMock() {
  const observeFn = vi.fn();
  const disconnectFn = vi.fn();
  let lastCallback: IntersectionObserverCallback | null = null;

  const MockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
    lastCallback = callback;
    return {
      observe: observeFn,
      disconnect: disconnectFn,
      unobserve: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: vi.fn().mockReturnValue([]),
    };
  });

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

  return {
    observe: observeFn,
    disconnect: disconnectFn,
    /** Trigger the observer callback with a mock entry */
    triggerIntersect: (isIntersecting: boolean) => {
      lastCallback?.(
        [{ isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    },
  };
}

/**
 * Mocks navigator.permissions.query() for geolocation permission tests.
 */
export function setupPermissionsApiMock(initialState: PermissionState = 'prompt') {
  let currentState = initialState;
  let changeHandler: (() => void) | null = null;

  const permissionStatus = {
    get state() { return currentState; },
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'change') changeHandler = handler;
    }),
    removeEventListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  };

  const queryFn = vi.fn().mockResolvedValue(permissionStatus);

  Object.defineProperty(navigator, 'permissions', {
    value: { query: queryFn },
    configurable: true,
    writable: true,
  });

  return {
    query: queryFn,
    permissionStatus,
    /** Simulate a permission state change */
    changeState: (newState: PermissionState) => {
      currentState = newState;
      changeHandler?.();
    },
  };
}
