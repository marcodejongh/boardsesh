import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Mocks ---

const mockRequestDevice = vi.fn();
const mockGetCharacteristic = vi.fn();
vi.mock('../bluetooth', () => ({
  requestDevice: (...args: unknown[]) => mockRequestDevice(...args),
  getCharacteristic: (...args: unknown[]) => mockGetCharacteristic(...args),
  getBluetoothPacket: vi.fn(() => new Uint8Array([1, 2, 3])),
  splitMessages: vi.fn((msg: unknown) => [msg]),
  writeCharacteristicSeries: vi.fn(),
}));

vi.mock('../use-wake-lock', () => ({
  useWakeLock: vi.fn(),
}));

const mockShowMessage = vi.fn();
vi.mock('@/app/components/providers/snackbar-provider', () => ({
  useSnackbar: () => ({ showMessage: mockShowMessage }),
}));

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}));

import { useBoardBluetooth } from '../use-board-bluetooth';

const mockBoardDetails = {
  board_name: 'kilter',
  layout_id: 1,
  size_id: 10,
  set_ids: '1,2',
  layout_name: 'Original',
  size_name: '12x12',
  size_description: 'Full',
  set_names: ['Standard'],
  supportsMirroring: true,
} as any;

describe('useBoardBluetooth', () => {
  let originalBluetooth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalBluetooth = (navigator as any).bluetooth;

    // Set up navigator.bluetooth as available
    Object.defineProperty(navigator, 'bluetooth', {
      value: { requestDevice: vi.fn() },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: originalBluetooth,
      writable: true,
      configurable: true,
    });
  });

  it('initial state: not connected, not loading', () => {
    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('shows error when bluetooth not supported', async () => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    let connectResult: boolean | undefined;
    await act(async () => {
      connectResult = await result.current.connect();
    });

    expect(connectResult).toBe(false);
    expect(mockShowMessage).toHaveBeenCalledWith(
      'Current browser does not support Web Bluetooth.',
      'error',
    );
  });

  it('returns false when no boardDetails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: undefined }),
    );

    let connectResult: boolean | undefined;
    await act(async () => {
      connectResult = await result.current.connect();
    });

    expect(connectResult).toBe(false);
    errorSpy.mockRestore();
  });

  it('sets loading during connect', async () => {
    let resolveDevice: (value: any) => void;
    const devicePromise = new Promise((resolve) => {
      resolveDevice = resolve;
    });
    mockRequestDevice.mockReturnValue(devicePromise);

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    // Start connection
    let connectPromise: Promise<boolean>;
    act(() => {
      connectPromise = result.current.connect();
    });

    // Should be loading
    expect(result.current.loading).toBe(true);

    // Resolve with a mock device
    const mockDevice = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      gatt: { connected: true, disconnect: vi.fn() },
    };
    const mockCharacteristic = {};
    mockGetCharacteristic.mockResolvedValue(mockCharacteristic);

    await act(async () => {
      resolveDevice!(mockDevice);
      await connectPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('sets isConnected on successful connection', async () => {
    const mockDevice = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      gatt: { connected: true, disconnect: vi.fn() },
    };
    const mockCharacteristic = {};

    mockRequestDevice.mockResolvedValue(mockDevice);
    mockGetCharacteristic.mockResolvedValue(mockCharacteristic);

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('handles connect failure', async () => {
    mockRequestDevice.mockRejectedValue(new Error('Connection failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    let connectResult: boolean | undefined;
    await act(async () => {
      connectResult = await result.current.connect();
    });

    expect(connectResult).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.loading).toBe(false);
    errorSpy.mockRestore();
  });

  it('disconnect calls gatt.disconnect', async () => {
    const mockDisconnect = vi.fn();
    const mockDevice = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      gatt: { connected: true, disconnect: mockDisconnect },
    };
    const mockCharacteristic = {};

    mockRequestDevice.mockResolvedValue(mockDevice);
    mockGetCharacteristic.mockResolvedValue(mockCharacteristic);

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it('calls onConnectionChange callback', async () => {
    const onConnectionChange = vi.fn();
    const mockDevice = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      gatt: { connected: true, disconnect: vi.fn() },
    };
    const mockCharacteristic = {};

    mockRequestDevice.mockResolvedValue(mockDevice);
    mockGetCharacteristic.mockResolvedValue(mockCharacteristic);

    const { result } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails, onConnectionChange }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(onConnectionChange).toHaveBeenCalledWith(true);

    act(() => {
      result.current.disconnect();
    });

    expect(onConnectionChange).toHaveBeenCalledWith(false);
  });

  it('cleans up device listeners on unmount', async () => {
    const mockRemoveEventListener = vi.fn();
    const mockDevice = {
      addEventListener: vi.fn(),
      removeEventListener: mockRemoveEventListener,
      gatt: { connected: true, disconnect: vi.fn() },
    };
    const mockCharacteristic = {};

    mockRequestDevice.mockResolvedValue(mockDevice);
    mockGetCharacteristic.mockResolvedValue(mockCharacteristic);

    const { result, unmount } = renderHook(() =>
      useBoardBluetooth({ boardDetails: mockBoardDetails }),
    );

    await act(async () => {
      await result.current.connect();
    });

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'gattserverdisconnected',
      expect.any(Function),
    );
  });
});
