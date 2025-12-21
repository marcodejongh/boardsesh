import { vi } from 'vitest';
import { WebSocket } from 'ws';

/**
 * Create a mock WebSocket for testing
 */
export function createMockWebSocket(overrides: Partial<WebSocket> = {}): WebSocket {
  const ws = {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  } as unknown as WebSocket;
  return ws;
}

/**
 * Create a mock ClimbQueueItem for testing
 */
export function createMockClimbQueueItem(overrides: Partial<ClimbQueueItem> = {}): ClimbQueueItem {
  return {
    uuid: `queue-item-${Date.now()}`,
    addedBy: 'test-user',
    climb: {
      uuid: `climb-${Date.now()}`,
      setter_username: 'setter',
      name: 'Test Climb',
      description: 'A test climb',
      frames: 'test-frames',
      angle: 40,
      ascensionist_count: 10,
      difficulty: 'V5',
      quality_average: '4.0',
      stars: 4,
      difficulty_error: '0.5',
      litUpHoldsMap: {},
      benchmark_difficulty: null,
    },
    ...overrides,
  };
}

interface Climb {
  uuid: string;
  setter_username: string;
  name: string;
  description: string;
  frames: string;
  angle: number;
  ascensionist_count: number;
  difficulty: string;
  quality_average: string;
  stars: number;
  difficulty_error: string;
  litUpHoldsMap: Record<string, string>;
  mirrored?: boolean;
  benchmark_difficulty: string | null;
}

interface ClimbQueueItem {
  addedBy?: string;
  tickedBy?: string[];
  climb: Climb;
  uuid: string;
  suggested?: boolean;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
